import { request } from 'node:https';

const READ_ACTIONS = new Set(['getBookings', 'getUsers', 'getEquipment']);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/** @param {URL} target @param {AbortSignal} signal */
function requestOnce(target, signal) {
  return new Promise((resolve, reject) => {
    let phase = 'dns';
    const fail = error => {
      const knownCodes = new Set(['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'CERT_HAS_EXPIRED', 'ERR_TLS_CERT_ALTNAME_INVALID']);
      const failure = new TypeError(signal.aborted ? 'GAS read deadline exceeded' : 'GAS read transport failed');
      Object.assign(failure, {
        phase, host: target.hostname,
        code: signal.aborted ? 'GAS_DEADLINE' : (knownCodes.has(error?.code) ? error.code : 'GAS_TRANSPORT'),
      });
      reject(failure);
    };
    // Fresh IPv4 connections avoid reusing sockets across suspended function invocations.
    // Certificate and hostname verification remain enabled.
    const req = request(target, {
      method: 'GET', agent: false, family: 4, signal,
      headers: { Accept: 'application/json' },
    }, response => {
      phase = 'body';
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('error', fail);
      response.on('aborted', () => fail(new TypeError('GAS read response interrupted')));
      response.on('end', () => resolve({
        status: response.statusCode || 502,
        location: response.headers.location,
        contentType: response.headers['content-type'],
        body: Buffer.concat(chunks),
      }));
    });
    req.on('socket', socket => {
      socket.once('lookup', () => { phase = 'connect'; });
      socket.once('connect', () => { phase = 'tls'; });
      socket.once('secureConnect', () => { phase = 'headers'; });
    });
    req.on('error', fail);
    req.end();
  });
}

/**
 * Read-only GAS transport. A single abort signal covers all redirects and response bytes.
 * No URLs, response bodies, customer data, or redirect keys are logged.
 * @param {string} url
 * @param {AbortSignal} signal
 * @param {typeof requestOnce} send
 * @returns {Promise<Response>}
 */
export async function fetchGasHttpsRead(url, signal, send = requestOnce) {
  let target = new URL(url);
  if (target.protocol !== 'https:' || target.hostname !== 'script.google.com' ||
      (target.port && target.port !== '443') || target.username || target.password ||
      !/^\/macros\/s\/[^/]+\/exec$/.test(target.pathname) ||
      target.searchParams.has('token') || !READ_ACTIONS.has(target.searchParams.get('action') || '')) {
    throw new Error('Only read-only GAS actions are allowed');
  }
  for (let hop = 0; hop < 5; hop++) {
    signal.throwIfAborted();
    const result = await send(target, signal);
    if (REDIRECT_STATUSES.has(result.status) && result.location) {
      const next = new URL(result.location, target);
      if (next.protocol !== 'https:' || next.hostname !== 'script.googleusercontent.com' ||
          next.pathname !== '/macros/echo' || (next.port && next.port !== '443') ||
          next.username || next.password || next.searchParams.has('token')) {
        throw new Error('Unexpected GAS redirect');
      }
      target = next;
      continue;
    }
    return new Response(new Uint8Array(result.body), {
      status: result.status,
      headers: { 'Content-Type': result.contentType || 'application/json' },
    });
  }
  throw new Error('GAS redirect limit exceeded');
}
