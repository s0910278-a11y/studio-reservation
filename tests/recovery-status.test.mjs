import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { isActiveBookingStatus, normalizeBookingStatus } from '../src/lib/booking-status.ts';

test('accepted reservations remain occupied after a mail failure', () => {
  for (const status of ['ACTIVE', 'ACTIVE (メール送信失敗: denied)', 'ACTIVE (メール送信失敗:権限不足)']) {
    assert.equal(isActiveBookingStatus(status), true);
    assert.equal(normalizeBookingStatus(status), 'ACTIVE');
  }
});

test('cancelled, completed and invalid statuses do not reserve slots', () => {
  for (const status of ['CANCELED', 'CANCELED (来店なし)', 'COMPLETED', 'INACTIVE', 'ACTIVE_OTHER', 'ACTIVE (other)', '', null, undefined, 1, false]) {
    assert.equal(isActiveBookingStatus(status), false);
    assert.equal(normalizeBookingStatus(status), status);
  }
});

test('read, creation and restoration use the same reservation rule', async () => {
  const code = await readFile(new URL('../src/app/api/bookings/route.ts', import.meta.url), 'utf8');
  assert.ok(code.includes(".filter((b: any) => isActiveBookingStatus(b['ステータス'])"));
  assert.ok(code.includes("|| !isActiveBookingStatus(b['ステータス'])"));
  assert.ok(code.includes("if (!isActiveBookingStatus(bk['ステータス']))"));
  assert.ok(code.includes("status: normalizeBookingStatus(b['ステータス'])"));
  const admin = await readFile(new URL('../src/app/api/admin/data/route.ts', import.meta.url), 'utf8');
  assert.ok(admin.includes("status: normalizeBookingStatus(b['ステータス'])"));
});

test('authorization check performs only a read and does not send email', async () => {
  const code = await readFile(new URL('../gas_project/RecoveryAuthorization.gs', import.meta.url), 'utf8');
  let reads = 0;
  const logs = [];
  const context = vm.createContext({ GmailApp: { getAliases() { reads++; return []; } }, console: { info(x) { logs.push(x); } } });
  vm.runInContext(code + '\ncheckExistingGmailAuthorization();', context);
  assert.equal(reads, 1);
  assert.deepEqual(logs, ['GMAIL_AUTHORIZATION_OK: no email sent']);
});

test('failed authorization cannot report success', async () => {
  const code = await readFile(new URL('../gas_project/RecoveryAuthorization.gs', import.meta.url), 'utf8');
  const logs = [];
  const context = vm.createContext({ GmailApp: { getAliases() { throw new Error('permission denied'); } }, console: { info(x) { logs.push(x); } } });
  assert.throws(() => vm.runInContext(code + '\ncheckExistingGmailAuthorization();', context), /permission denied/);
  assert.equal(logs.length, 0);
});
