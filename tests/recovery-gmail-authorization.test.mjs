import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../gas_project/RecoveryAuthorization_20261017.gs', import.meta.url), 'utf8');
const key = 'GMAIL_RECOVERY_TEST_20261017';

function harness({ existingClaim, failAuth = false, failLock = false, failSend = false, failClaim = false } = {}) {
  const properties = new Map(existingClaim ? [[key, existingClaim]] : []);
  const sent = [];
  const logs = [];
  let held = false;
  let released = 0;
  const context = vm.createContext({
    GmailApp: {
      getAliases() { if (failAuth) throw new Error('authorization required'); return []; },
      sendEmail(...args) {
        assert.equal(held, true);
        assert.equal(properties.get(key), 'attempted');
        sent.push(args);
        if (failSend) throw new Error('delivery uncertain');
      },
    },
    LockService: { getScriptLock: () => ({
      waitLock(ms) { assert.equal(ms, 5000); if (failLock) throw new Error('lock unavailable'); held = true; },
      releaseLock() { held = false; released++; },
    }) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: name => properties.get(name),
      setProperty(name, value) { if (failClaim) throw new Error('claim unavailable'); properties.set(name, value); },
    }) },
    console: { info: value => logs.push(value) },
  });
  vm.runInContext(source, context);
  return { context, properties, sent, logs, released: () => released };
}

test('authorization check sends no mail and writes no claim', () => {
  const h = harness();
  h.context.checkExistingGmailAuthorization();
  assert.deepEqual(h.logs, ['GMAIL_AUTHORIZATION_OK']);
  assert.equal(h.sent.length, 0);
  assert.equal(h.properties.size, 0);
});

test('self-only send preserves sender name and cannot run twice', () => {
  const h = harness();
  h.context.sendGmailRecoveryTest20261017();
  h.context.sendGmailRecoveryTest20261017();
  assert.equal(h.sent.length, 1);
  const [to, subject, body, options] = h.sent[0];
  assert.equal(to, 's0910278@gmail.com');
  assert.match(subject, /復旧確認テスト 20261017/);
  assert.match(body, /予約データは変更していません/);
  assert.deepEqual(Object.keys(options), ['name']);
  assert.equal(options.name, '【予約完了】ハードオフ八王子大和田店 楽器スタジオ');
  assert.equal(h.properties.get(key), 'sent');
  assert.equal(h.released(), 2);
});

test('uncertain delivery is never automatically retried', () => {
  const h = harness({ failSend: true });
  assert.throws(() => h.context.sendGmailRecoveryTest20261017(), /delivery uncertain/);
  assert.equal(h.properties.get(key), 'attempted');
  h.context.sendGmailRecoveryTest20261017();
  assert.equal(h.sent.length, 1);
  assert.equal(h.released(), 2);
});

test('any preexisting claim blocks sending', () => {
  for (const existingClaim of ['attempted', 'sent', 'unknown']) {
    const h = harness({ existingClaim });
    h.context.sendGmailRecoveryTest20261017();
    assert.equal(h.sent.length, 0);
    assert.equal(h.properties.get(key), existingClaim);
    assert.equal(h.released(), 1);
  }
});

test('failed authorization, lock, or claim never sends a message', () => {
  for (const failure of [{ failAuth: true }, { failLock: true }, { failClaim: true }]) {
    const h = harness(failure);
    assert.throws(() => h.context.sendGmailRecoveryTest20261017());
    assert.equal(h.sent.length, 0);
    assert.equal(h.properties.size, 0);
    assert.equal(h.released(), failure.failClaim ? 1 : 0);
  }
});
