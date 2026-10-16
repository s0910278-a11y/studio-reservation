import test from 'node:test';
import assert from 'node:assert/strict';
import { probeEnvelope } from '../src/probe.mjs';

const config = { host: 'smtp.alpha-prm.jp', from: 'sender@example.co.jp',
  user: 'sender%example.co.jp', password: 'synthetic-private-password',
  baseUrl: 'https://isolated-test.netlify.app' };

function simulatedServer({ advertised = ['PLAIN', 'LOGIN'], authStatus = 235, mailStatus = 250 } = {}) {
  const commands = [];
  let options;
  return {
    commands, get options() { return options; },
    factory(input) {
      options = input;
      return { close() {}, async verify() {
        await input.customAuth.PROBE({ auth: { credentials: input.auth }, authMethods: advertised,
          async sendCommand(command) {
            commands.push(command);
            if (command === 'AUTH LOGIN') return { status: 334 };
            if (command === Buffer.from(config.user).toString('base64')) return { status: 334 };
            if (command.startsWith('AUTH PLAIN') || command === Buffer.from(config.password).toString('base64')) {
              return { status: authStatus, text: 'private authentication detail' };
            }
            if (command.startsWith('MAIL FROM:')) return { status: mailStatus,
              code: mailStatus === 550 ? '5.7.1' : '2.1.0',
              text: `Mail relay denied. ${config.password} ${config.from}` };
            return { status: 250 };
          } });
        return true;
      } };
    },
  };
}

test('envelope probes use TLS and only AUTH/MAIL FROM/RSET; hostname and LOGIN variants stay fixed', async () => {
  for (const kind of ['probe-default', 'probe-hostname', 'probe-login']) {
    const server = simulatedServer();
    const result = await probeEnvelope(config, kind, server.factory);
    assert.equal(result.auth, 'accepted');
    assert.equal(result.authStatus, 235);
    assert.equal(result.mailFrom.status, 250);
    assert.equal(result.messageSubmitted, false);
    assert.equal(server.options.secure, true);
    assert.equal(server.options.tls.rejectUnauthorized, true);
    assert.equal(server.options.name, kind === 'probe-default' ? undefined : 'isolated-test.netlify.app');
    assert.equal(result.method, kind === 'probe-login' ? 'LOGIN' : 'PLAIN');
    assert.equal(server.commands.at(-1), 'RSET');
    assert.ok(server.commands.every(command => !/^(RCPT|DATA)/.test(command)));
    assert.ok(!JSON.stringify(result).includes(config.password));
  }
});

test('AUTH missing or rejected cannot be reported as authenticated; response text stays private', async () => {
  const missing = simulatedServer({ advertised: [], mailStatus: 550 });
  const result = await probeEnvelope(config, 'probe-default', missing.factory);
  assert.equal(result.auth, 'not_advertised');
  assert.ok(!missing.commands.some(command => command.startsWith('AUTH')));
  assert.deepEqual(result.mailFrom, { status: 550, enhanced: '5.7.1', reason: 'relay_denied' });
  assert.ok(!JSON.stringify(result).includes(config.password));
  assert.ok(!JSON.stringify(result).includes(config.from));
  const rejected = simulatedServer({ authStatus: 535 });
  const failure = await probeEnvelope(config, 'probe-default', rejected.factory);
  assert.equal(failure.auth, 'rejected');
  assert.equal(failure.mailFrom, null);
  assert.ok(!rejected.commands.some(command => command.startsWith('MAIL FROM')));
});

