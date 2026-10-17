import { fetchGasHttpsRead } from './gas-native-read.mjs';

const readFetcher: typeof fetch = async (input, init) => {
  if (typeof input !== 'string' || !init?.signal) throw new Error('GAS read requires a URL and deadline');
  return fetchGasHttpsRead(input, init.signal);
};

// Keep a request below the platform's execution limit.
// Only fixed, read-only GAS actions may be retried. Writes are attempted once.
const ATTEMPT_MS = 15_000;
const REQUEST_MS = 50_000;
const READ_ACTIONS = new Set(['getBookings', 'getUsers', 'getEquipment']);

export type GasRequestContext = { deadlineAt: number; now: () => number };

export function createGasRequestContext(now: () => number = Date.now): GasRequestContext {
  return { deadlineAt: now() + REQUEST_MS, now };
}

function remaining(context: GasRequestContext) {
  return context.deadlineAt - context.now();
}

function isTransportError(error: unknown) {
  return error instanceof Error &&
    ['TimeoutError', 'AbortError', 'TypeError'].includes(error.name);
}

function logReadFailure(action: string, attempt: number, error: unknown, elapsedMs: number) {
  const value = error as { name?: unknown; phase?: unknown; host?: unknown; code?: unknown } | null;
  const allowedNames = ['TypeError', 'TimeoutError', 'AbortError'];
  const allowedPhases = ['dns', 'connect', 'tls', 'headers', 'body'];
  const allowedHosts = ['script.google.com', 'script.googleusercontent.com'];
  const allowedCodes = ['GAS_DEADLINE', 'GAS_TRANSPORT', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'CERT_HAS_EXPIRED', 'ERR_TLS_CERT_ALTNAME_INVALID'];
  // Never log the original error message, request URL, redirect key, or response body.
  console.warn('GAS_READ_FAILURE', JSON.stringify({
    action, attempt, elapsedMs,
    name: allowedNames.includes(String(value?.name)) ? value?.name : 'Error',
    phase: allowedPhases.includes(String(value?.phase)) ? value?.phase : 'unknown',
    host: allowedHosts.includes(String(value?.host)) ? value?.host : 'unknown',
    code: allowedCodes.includes(String(value?.code)) ? value?.code : 'unknown',
  }));
}

export async function requestGasRead(
  url: string,
  context: GasRequestContext = createGasRequestContext(),
  fetcher: typeof fetch = readFetcher,
): Promise<Response> {
  const target = new URL(url);
  if (target.protocol !== 'https:' || target.hostname !== 'script.google.com' ||
      target.searchParams.has('token') || !READ_ACTIONS.has(target.searchParams.get('action') || '')) {
    throw new Error('Only read-only GAS actions may be retried');
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    const timeout = Math.min(ATTEMPT_MS, remaining(context));
    if (timeout <= 0) throw new Error('GAS request budget exhausted');
    const started = context.now();
    try {
      return await fetcher(url, { cache: 'no-store', signal: AbortSignal.timeout(timeout) });
    } catch (error) {
      logReadFailure(target.searchParams.get('action')!, attempt + 1, error, context.now() - started);
      if (attempt !== 0 || !isTransportError(error)) throw error;
    }
  }
  throw new Error('GAS read failed');
}

export async function requestGasWrite(
  url: string,
  payload: unknown,
  context: GasRequestContext = createGasRequestContext(),
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  // Do not start a write when the request cannot wait for its full timeout.
  if (remaining(context) < ATTEMPT_MS) {
    throw new Error('Insufficient request budget to submit a write');
  }
  return fetcher(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(ATTEMPT_MS),
  });
}
