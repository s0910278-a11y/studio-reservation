import test from 'node:test';
import assert from 'node:assert/strict';
import { createGasRequestContext, requestGasRead, requestGasWrite } from '../src/lib/gas-request.ts';

const readUrl = 'https://script.google.com/macros/s/test-fixture/exec?action=getBookings';
const writeUrl = 'https://script.google.com/macros/s/test-fixture/exec';

test('a transient read failure is retried once within a shared deadline', async () => {
  let now = 0, calls = 0;
  const context = createGasRequestContext(() => now);
  const fetcher = async (_url, options) => {
    calls++;
    assert.equal(options.cache, 'no-store');
    assert.equal(options.method, undefined);
    if (calls === 1) { now += 15000; throw new DOMException('timeout', 'TimeoutError'); }
    return Response.json({ success: true });
  };
  const response = await requestGasRead(readUrl, context, fetcher);
  assert.deepEqual(await response.json(), { success: true });
  assert.equal(calls, 2);
  assert.equal(context.deadlineAt, 50000);
});

test('persistent read failures stop after two attempts', async () => {
  let calls = 0;
  const fetcher = async () => { calls++; throw new TypeError('network failure'); };
  await assert.rejects(requestGasRead(readUrl, createGasRequestContext(), fetcher), /network failure/);
  assert.equal(calls, 2);
});

test('service errors are returned without an automatic retry', async () => {
  let calls = 0;
  const response = await requestGasRead(readUrl, createGasRequestContext(), async () => {
    calls++; return new Response('service error', { status: 500 });
  });
  assert.equal(response.status, 500);
  assert.equal(calls, 1);
});

test('a cancellation URL cannot enter the retry path', async () => {
  let calls = 0;
  const fetcher = async () => { calls++; return Response.json({}); };
  await assert.rejects(requestGasRead(writeUrl + '?token=synthetic-cancel-token', createGasRequestContext(), fetcher), /read-only/);
  assert.equal(calls, 0);
});

test('expired request budgets perform no network operation', async () => {
  let now = 0, calls = 0;
  const context = createGasRequestContext(() => now);
  now = 50000;
  const fetcher = async () => { calls++; return Response.json({}); };
  await assert.rejects(requestGasRead(readUrl, context, fetcher), /budget exhausted/);
  assert.equal(calls, 0);
});

test('booking submissions are attempted once even after a transport timeout', async () => {
  let calls = 0;
  const payload = { action: 'createBooking', data: { bookingId: 'synthetic-id' } };
  const fetcher = async (_url, options) => {
    calls++;
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['Content-Type'], 'text/plain');
    assert.deepEqual(JSON.parse(options.body), payload);
    throw new DOMException('timeout', 'TimeoutError');
  };
  await assert.rejects(requestGasWrite(writeUrl, payload, createGasRequestContext(), fetcher), /timeout/);
  assert.equal(calls, 1);
});

test('a late write is blocked before submission after earlier slow reads', async () => {
  let now = 0, writes = 0;
  const context = createGasRequestContext(() => now);
  now = 36000;
  const fetcher = async () => { writes++; return Response.json({ success: true }); };
  await assert.rejects(requestGasWrite(writeUrl, {}, context, fetcher), /Insufficient request budget/);
  assert.equal(writes, 0);
});
