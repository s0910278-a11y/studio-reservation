import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { KINDS, TestError, readConfig } from './config.mjs';
import { makeMessage } from './templates.mjs';
import { safeDiagnostic } from './smtp.mjs';

const hash = value => createHash('sha256').update(value).digest();
const json = (data, status = 200) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
});

export function createHandler({ getEnv, storeFactory, senderFactory, audit = () => {} }) {
  return async (request, context) => {
    try {
      const config = readConfig(getEnv, context?.site?.id);
      if (!timingSafeEqual(hash(request.headers.get('authorization') || ''),
        hash(`Bearer ${config.token}`))) throw new TestError('UNAUTHORIZED', 401);
      const url = new URL(request.url);
      let kind;
      if (request.method === 'GET') {
        if ([...url.searchParams.keys()].some(key => key !== 'kind')) throw new TestError('INVALID_INPUT', 400);
        kind = url.searchParams.get('kind');
      } else if (request.method === 'POST') {
        if (url.search) throw new TestError('INVALID_INPUT', 400);
        const raw = await request.text();
        if (Buffer.byteLength(raw) > 512) throw new TestError('INVALID_INPUT', 400);
        let body;
        try { body = JSON.parse(raw); } catch { throw new TestError('INVALID_INPUT', 400); }
        if (!body || Array.isArray(body) || Object.keys(body).length !== 1 ||
            !Object.hasOwn(body, 'kind')) throw new TestError('INVALID_INPUT', 400);
        kind = body.kind;
      } else throw new TestError('METHOD_NOT_ALLOWED', 405);
      if (!KINDS.includes(kind) && kind !== 'connection') throw new TestError('INVALID_KIND', 400);
      const key = hash(`${config.runId}\n${config.recipient}\n${kind}`).toString('hex');
      const store = storeFactory();
      if (request.method === 'GET') {
        const result = await store.get(`results/${key}`, { type: 'json', consistency: 'strong' });
        const claimed = await store.get(`claims/${key}`, { type: 'json', consistency: 'strong' });
        return json({ testId: key, kind, state: result?.state || (claimed ? 'claimed_or_unknown' : 'not_attempted'),
          ...(kind === 'connection' && result?.diagnostic ? { diagnostic: result.diagnostic } : {}),
          at: result?.at || claimed?.at || null });
      }
      // A persistent create-only claim is never deleted or expired automatically.
      // No automatic retry, fallback or read-modify-write ledger logic.
      const claim = { attempt: randomUUID(), kind, at: new Date().toISOString() };
      const { modified } = await store.setJSON(`claims/${key}`, claim, { onlyIfNew: true });
      if (!modified) return json({ testId: key, kind, state: 'already_claimed', retry: false }, 409);
      const proof = await store.get(`claims/${key}`, { type: 'json', consistency: 'strong' });
      if (proof?.attempt !== claim.attempt) throw new TestError('CLAIM_NOT_CONFIRMED');
      audit({ event: 'smtp_test', testId: key, kind, state: 'claimed' });
      let state, diagnostic;
      try {
        const sender = senderFactory(config);
        if (kind === 'connection') {
          await sender.verify();
          state = 'smtp_verified';
        } else {
          const result = await sender(makeMessage(kind, config, key));
          state = result.accepted?.length === 1 && result.accepted[0] === config.recipient &&
            !result.rejected?.length ? 'smtp_accepted' : 'unknown';
        }
      } catch (error) {
        // Error text can contain addresses, server responses or credentials; do not log it.
        state = kind === 'connection' ? 'verification_failed' : 'unknown';
        if (kind === 'connection') diagnostic = safeDiagnostic(error);
      }
      const result = { state, kind, at: new Date().toISOString(), ...(diagnostic ? { diagnostic } : {}) };
      try { await store.setJSON(`results/${key}`, result, { onlyIfNew: true }); }
      catch {
        audit({ event: 'smtp_test', testId: key, kind, state: 'result_write_failed' });
        return json({ testId: key, kind, state: 'claimed_or_unknown', retry: false }, 503);
      }
      audit({ event: 'smtp_test', testId: key, kind, state });
      return json({ testId: key, kind, state, retry: false, ...(diagnostic ? { diagnostic } : {}) },
        ['smtp_accepted', 'smtp_verified'].includes(state) ? 200 : 503);
    } catch (error) {
      return json({ error: error instanceof TestError ? error.code : 'TEST_OPERATION_FAILED' },
        error instanceof TestError ? error.status : 503);
    }
  };
}
