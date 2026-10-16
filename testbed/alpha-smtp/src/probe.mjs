import nodemailer from 'nodemailer';
import { transportOptions, safeDiagnostic } from './smtp.mjs';

export const PROBE_KINDS = ['probe-default', 'probe-hostname', 'probe-login'];

function replySummary(reply) {
  const result = { status: reply.status };
  if (/^[245]\.\d{1,3}\.\d{1,3}$/.test(reply.code || '')) result.enhanced = reply.code;
  const text = reply.text || '';
  result.reason = /mail relay denied/i.test(text) ? 'relay_denied'
    : /(?:helo|ehlo|hostname|fqdn)/i.test(text) ? 'greeting_rejected'
    : /(?:authentication required|not authenticated|authenticate first)/i.test(text) ? 'auth_required'
    : /sender.*(?:rejected|denied|not.*allowed|mismatch)/i.test(text) ? 'sender_rejected'
    : /(?:too many|rate limit)/i.test(text) ? 'rate_limited' : 'other';
  return result;
}

// A bounded SMTP conversation ending at MAIL FROM + RSET. No RCPT TO or DATA
// command is reachable, so no recipient is submitted and no email can be sent.
export async function probeEnvelope(config, kind, createTransport = nodemailer.createTransport) {
  if (!PROBE_KINDS.includes(kind)) throw new Error('INVALID_PROBE');
  const result = { ehlo: kind === 'probe-default' ? 'default' : 'test_hostname',
    advertisedAuth: [], auth: 'not_attempted', mailFrom: null, messageSubmitted: false };
  const options = transportOptions(config);
  const transport = createTransport({ ...options,
    ...(kind !== 'probe-default' ? { name: new URL(config.baseUrl).hostname } : {}),
    // Force entry into our inspection handler even if AUTH was not advertised.
    // The handler never transmits credentials unless the method is advertised.
    forceAuth: true, auth: { ...options.auth, method: 'PROBE' },
    customAuth: { PROBE: async ctx => {
      result.advertisedAuth = ctx.authMethods.filter(m => ['PLAIN', 'LOGIN', 'CRAM-MD5', 'XOAUTH2'].includes(m));
      const preferred = kind === 'probe-login' ? ['LOGIN'] : ['PLAIN', 'LOGIN'];
      const method = preferred.find(m => result.advertisedAuth.includes(m));
      if (method) {
        result.method = method;
        let auth;
        if (method === 'PLAIN') {
          const payload = Buffer.from(`\0${ctx.auth.credentials.user}\0${ctx.auth.credentials.pass}`).toString('base64');
          auth = await ctx.sendCommand(`AUTH PLAIN ${payload}`);
          if (auth.status === 334) auth = await ctx.sendCommand(payload);
        } else {
          auth = await ctx.sendCommand('AUTH LOGIN');
          if (auth.status === 334) auth = await ctx.sendCommand(Buffer.from(ctx.auth.credentials.user).toString('base64'));
          if (auth.status === 334) auth = await ctx.sendCommand(Buffer.from(ctx.auth.credentials.pass).toString('base64'));
        }
        result.authStatus = auth.status;
        if (auth.status !== 235) { result.auth = 'rejected'; return; }
        result.auth = 'accepted';
      } else {
        result.auth = result.advertisedAuth.length ? 'requested_method_unavailable' : 'not_advertised';
        if (result.advertisedAuth.length) return;
      }
      result.mailFrom = replySummary(await ctx.sendCommand(`MAIL FROM:<${config.from}>`));
      await ctx.sendCommand('RSET');
    } },
  });
  try { await transport.verify(); }
  catch (error) { result.error = safeDiagnostic(error); }
  finally { transport.close(); }
  return result;
}
