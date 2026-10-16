import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createHandler } from '../src/service.mjs';
import { readConfig } from '../src/config.mjs';
import { fixture, renderOriginal } from '../src/templates.mjs';
import { safeDiagnostic, transportOptions } from '../src/smtp.mjs';

const FROM = 'sender@example.co.jp';
const PRODUCTION_SITE_ID = 'production-site-must-be-blocked';
export const values = {
  SMTP_FROM: FROM, SMTP_PRODUCTION_SITE_ID: PRODUCTION_SITE_ID,
  SMTP_TEST_ENABLED: 'true', SMTP_TEST_SITE_ID: 'isolated-test-site',
  SMTP_TEST_RUN_ID: 'offline-test-20261016', SMTP_TEST_TOKEN: 'x'.repeat(48),
  SMTP_TEST_RECIPIENT: 'owner.smtp.test@gmail.com',
  SMTP_TEST_BASE_URL: 'https://isolated-studio-mail-test.netlify.app',
  SMTP_PROVIDER: 'alpha-premier', SMTP_HOST: 'smtp.alpha-prm.jp', SMTP_PORT: '465',
  SMTP_USER: FROM.replace('@', '%'), SMTP_PASSWORD: 'synthetic-local-test-password',
  SMTP_REPLY_TO: 'studio@example.co.jp',
};
const context = { site: { id: values.SMTP_TEST_SITE_ID } };
export const getConfig = () => readConfig(key => values[key], context.site.id);

export function memoryStore() {
  const entries = new Map();
  return {
    entries,
    async get(key) { return entries.has(key) ? structuredClone(entries.get(key)) : null; },
    async setJSON(key, value, options) {
      assert.equal(options.onlyIfNew, true);
      if (entries.has(key)) return { modified: false };
      entries.set(key, structuredClone(value));
      return { modified: true };
    },
  };
}
const request = (kind = 'confirmation', options = {}) => new Request('https://test.invalid/smtp-test', {
  method: 'POST', headers: { Authorization: `Bearer ${values.SMTP_TEST_TOKEN}` },
  body: JSON.stringify({ kind }), ...options,
});
export function harness(options = {}) {
  const sent = [], audit = [], store = memoryStore();
  const env = { ...values, ...options.env };
  const handler = createHandler({ getEnv: key => env[key], storeFactory: () => store,
    senderFactory: () => async message => { sent.push(message);
      if (options.sendError) throw new Error('sensitive SMTP text must not leak');
      return { accepted: [env.SMTP_TEST_RECIPIENT], rejected: [] }; },
    audit: event => audit.push(event), ...options.dependencies });
  return { handler, sent, audit, store, env };
}

for (const kind of ['confirmation', 'refusal']) {
  test(`${kind}: subject, sender name and full body match original GAS offline`, () => {
    const captured = [];
    const sandbox = vm.createContext({ console: { log() {}, warn() {} },
      GmailApp: { sendEmail: (...args) => captured.push(args) },
      Utilities: { formatDate: () => '2099-01-01 12:00' },
    });
    const code = readFileSync(new URL('../../../gas_project/Code.gs', import.meta.url), 'utf8');
    vm.runInContext(code, sandbox);
    sandbox.getSheet = () => ({ appendRow() {} });
    sandbox.sortBookingsByDate_ = () => {};
    sandbox.createJsonResponse = value => value;
    const b = { ...fixture(values.SMTP_TEST_BASE_URL), email: values.SMTP_TEST_RECIPIENT,
      bookingId: 'TEST-ONLY', status: 'ACTIVE' };
    const result = sandbox.doPost({ postData: { contents: JSON.stringify({
      action: kind === 'confirmation' ? 'createBooking' : 'sendBanRefusalEmail', data: b,
    }) } });
    assert.equal(result.success, true);
    assert.equal(captured.length, 1);
    const [, subject, text, options] = captured[0];
    assert.deepEqual(renderOriginal(kind, b), { subject, text, name: options.name });
  });
}

test('disabled/missing configuration never opens a store or sends', async () => {
  for (const env of [{ SMTP_TEST_ENABLED: 'false' }, { SMTP_PASSWORD: '' }]) {
    const h = harness({ env });
    assert.ok((await h.handler(request(), context)).status >= 400);
    assert.equal(h.sent.length, 0); assert.equal(h.store.entries.size, 0);
  }
});

test('production site is refused even when configured to match', async () => {
  const h = harness({ env: { SMTP_TEST_SITE_ID: PRODUCTION_SITE_ID } });
  assert.equal((await h.handler(request(), { site: { id: PRODUCTION_SITE_ID } })).status, 503);
  assert.equal(h.sent.length, 0);
});

test('authorization required; wrong or absent token cannot send', async () => {
  for (const headers of [{}, { Authorization: 'Bearer wrong' }]) {
    const h = harness();
    assert.equal((await h.handler(request('confirmation', { headers }), context)).status, 401);
    assert.equal(h.store.entries.size, 0);
  }
});

test('arbitrary recipients, CC/BCC, payloads and kinds are rejected', async () => {
  const h = harness();
  for (const body of [{ kind: 'confirmation', to: 'customer@example.com' },
    { kind: 'confirmation', cc: 'store@example.com' }, { kind: 'refusal', bcc: 'a@example.com' },
    { kind: 'confirmation', text: 'injection' }, { kind: 'other' }, [], null]) {
    assert.equal((await h.handler(request('confirmation', { body: JSON.stringify(body) }), context)).status, 400);
  }
  assert.equal((await h.handler(request('confirmation', { body: '{' }), context)).status, 400);
  assert.equal((await h.handler(request('confirmation', { body: 'x'.repeat(513) }), context)).status, 400);
  assert.equal(h.sent.length, 0);
});

test('non-Gmail recipients, injection, wrong provider, non-TLS port and production origins fail closed', async () => {
  const cases = [{ SMTP_TEST_RECIPIENT: 'a@example.com' },
    { SMTP_TEST_RECIPIENT: 'a@gmail.com,b@gmail.com' },
    { SMTP_REPLY_TO: 'store@example.co.jp\r\nBcc: x@example.com' },
    { SMTP_HOST: 'unknown.invalid' }, { SMTP_PORT: '587' },
    { SMTP_USER: FROM }, { SMTP_TEST_BASE_URL: 'https://zeroemission-reserve.netlify.app' },
    { SMTP_TEST_BASE_URL: 'https://master--zeroemission-reserve.netlify.app' },
    { SMTP_TEST_BASE_URL: 'http://test.netlify.app' },
    { SMTP_TEST_BASE_URL: 'https://test.netlify.app/?token=secret' }];
  for (const env of cases) {
    const h = harness({ env });
    assert.equal((await h.handler(request(), context)).status, 503, JSON.stringify(env));
    assert.equal(h.sent.length, 0);
  }
});

test('both documented provider configurations are accepted', () => {
  const env = { ...values, SMTP_PROVIDER: 'alpha-mail', SMTP_HOST: 'sauth.alpha-mail.jp', SMTP_USER: FROM };
  assert.equal(readConfig(key => env[key], context.site.id).host, 'sauth.alpha-mail.jp');
  assert.equal(getConfig().host, 'smtp.alpha-prm.jp');
});

test('both emails use fixed From/Reply-To and one recipient, with a harmless cancellation URL', async () => {
  const h = harness();
  for (const kind of ['confirmation', 'refusal']) {
    const response = await h.handler(request(kind), context);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).state, 'smtp_accepted');
  }
  for (const message of h.sent) {
    assert.equal(message.from.address, FROM);
    assert.equal(message.replyTo, values.SMTP_REPLY_TO);
    assert.deepEqual(message.envelope, { from: FROM, to: [values.SMTP_TEST_RECIPIENT] });
    assert.equal(message.to, values.SMTP_TEST_RECIPIENT);
    assert.equal(message.cc, undefined); assert.equal(message.bcc, undefined);
    assert.match(message.subject, /送信テスト・実予約なし/);
    assert.doesNotMatch(message.text, /script\.google\.com|zeroemission-reserve\.netlify/);
  }
  const link = h.sent[0].text.match(/https:\/\/\S+/)[0];
  const url = new URL(link);
  assert.equal(url.pathname, '/cancel-test.html');
  assert.equal(url.searchParams.get('token'), 'TEST-ONLY-NO-BOOKING');
  assert.doesNotMatch(h.sent[1].text, /https:\/\//);
});

test('concurrent and repeated requests produce only one SMTP attempt per kind/run', async () => {
  const h = harness();
  const responses = await Promise.all(Array.from({ length: 10 }, () => h.handler(request(), context)));
  assert.equal(responses.filter(r => r.status === 200).length, 1);
  assert.equal(responses.filter(r => r.status === 409).length, 9);
  assert.equal(h.sent.length, 1);
});

test('timeout/SMTP error is unknown and cannot automatically retry or fall back', async () => {
  const h = harness({ sendError: true });
  const response = await h.handler(request(), context);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).state, 'unknown');
  assert.equal((await h.handler(request(), context)).status, 409);
  assert.equal(h.sent.length, 1);
  const logs = JSON.stringify(h.audit);
  for (const secret of [values.SMTP_PASSWORD, values.SMTP_TEST_TOKEN, values.SMTP_TEST_RECIPIENT, 'sensitive']) {
    assert.ok(!logs.includes(secret));
  }
});

test('store failure or unconfirmed claim prevents sending', async () => {
  for (const store of [
    { setJSON: async () => { throw new Error('private'); } },
    { setJSON: async () => ({ modified: true }), get: async () => null },
  ]) {
    const h = harness({ dependencies: { storeFactory: () => store } });
    assert.equal((await h.handler(request(), context)).status, 503);
    assert.equal(h.sent.length, 0);
  }
});

test('accepted mail with result storage failure keeps claim and prevents re-send', async () => {
  const store = memoryStore();
  const write = store.setJSON;
  store.setJSON = async (key, ...rest) => {
    if (key.startsWith('results/')) throw new Error('storage failed');
    return write(key, ...rest);
  };
  const h = harness({ dependencies: { storeFactory: () => store } });
  assert.equal((await h.handler(request(), context)).status, 503);
  assert.equal((await h.handler(request(), context)).status, 409);
  assert.equal(h.sent.length, 1);
});

test('authenticated history query does not send and reports accepted state', async () => {
  const h = harness();
  const get = () => new Request('https://test.invalid/smtp-test?kind=confirmation', {
    headers: { Authorization: `Bearer ${values.SMTP_TEST_TOKEN}` },
  });
  assert.equal((await (await h.handler(get(), context)).json()).state, 'not_attempted');
  await h.handler(request(), context);
  assert.equal((await (await h.handler(get(), context)).json()).state, 'smtp_accepted');
  assert.equal(h.sent.length, 1);
});

test('production transport requires certificate validation and TLS on port 465', () => {
  const options = transportOptions(getConfig());
  assert.equal(options.secure, true); assert.equal(options.port, 465);
  assert.equal(options.tls.rejectUnauthorized, true);
  assert.equal(options.tls.minVersion, 'TLSv1.2');
  assert.equal(options.logger, false); assert.equal(options.debug, false);
});

test('connection diagnostic authenticates once, never submits email, and preserves existing unknown claims', async () => {
  let verified = 0;
  const h = harness({ dependencies: { senderFactory: () => Object.assign(
    async () => { throw new Error('Must not submit email'); },
    { verify: async () => { verified++; return true; } }) } });
  const response = await h.handler(request('connection'), context);
  assert.equal((await response.json()).state, 'smtp_verified');
  assert.equal((await h.handler(request('connection'), context)).status, 409);
  assert.equal(verified, 1);
  assert.equal(h.sent.length, 0);
  const failed = harness({ sendError: true });
  await failed.handler(request(), context);
  await failed.handler(request('connection'), context);
  assert.equal((await failed.handler(request(), context)).status, 409);
  assert.equal(failed.sent.length, 1);
});

test('verification failures persist only allowlisted diagnostics without server text or credentials', async () => {
  const secret = 'private credential and SMTP response';
  const h = harness({ dependencies: { senderFactory: () => ({ verify: async () => {
    throw Object.assign(new Error(secret), { code: 'EAUTH', command: 'AUTH PLAIN',
      responseCode: 535, response: secret, password: secret });
  } }) } });
  const response = await h.handler(request('connection'), context);
  assert.equal(response.status, 503);
  const result = await response.json();
  assert.equal(result.state, 'verification_failed');
  assert.deepEqual(result.diagnostic, { code: 'EAUTH', stage: 'AUTH', responseCode: 535 });
  assert.equal((await h.handler(request('connection'), context)).status, 409);
  assert.doesNotMatch(JSON.stringify([...h.store.entries, h.audit, result]), /private credential/);
  assert.deepEqual(safeDiagnostic({ code: secret, command: secret, responseCode: secret }), { code: 'UNCLASSIFIED' });
});
