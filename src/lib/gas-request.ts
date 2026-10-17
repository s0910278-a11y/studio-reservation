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

export async function requestGasRead(
  url: string,
  context: GasRequestContext = createGasRequestContext(),
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const target = new URL(url);
  if (target.protocol !== 'https:' || target.hostname !== 'script.google.com' ||
      target.searchParams.has('token') || !READ_ACTIONS.has(target.searchParams.get('action') || '')) {
    throw new Error('Only read-only GAS actions may be retried');
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    const timeout = Math.min(ATTEMPT_MS, remaining(context));
    if (timeout <= 0) throw new Error('GAS request budget exhausted');
    try {
      return await fetcher(url, { cache: 'no-store', signal: AbortSignal.timeout(timeout) });
    } catch (error) {
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
