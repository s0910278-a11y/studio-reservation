import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { SMTPServer } from 'smtp-server';
import nodemailer from 'nodemailer';
import { createSender } from '../src/smtp.mjs';
import { makeMessage } from '../src/templates.mjs';
import { probeEnvelope } from '../src/probe.mjs';
const FROM = 'sender@example.co.jp';

test('real loopback SMTPS: authentication, TLS, envelope, Japanese MIME, acceptance and auth failure', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'studio-smtp-test-'));
  const keyPath = path.join(directory, 'key.pem'), certPath = path.join(directory, 'cert.pem');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
    '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost',
    '-keyout', keyPath, '-out', certPath], { stdio: 'ignore' });
  const cert = readFileSync(certPath), captured = [];
  let recipients = 0, rejectEnvelope = false;
  const config = { from: FROM, host: 'smtp.alpha-prm.jp', user: FROM.replace('@', '%'),
    password: 'synthetic-loopback-password', recipient: 'owner.smtp.test@gmail.com',
    replyTo: 'studio@example.co.jp', baseUrl: 'https://isolated-test.netlify.app' };
  const server = new SMTPServer({ secure: true, key: readFileSync(keyPath), cert, logger: false,
    onAuth(auth, session, callback) {
      if (auth.username === config.user && auth.password === config.password) callback(null, { user: auth.username });
      else callback(new Error('Invalid test credentials'));
    },
    onMailFrom(address, session, callback) {
      if (rejectEnvelope) return callback(Object.assign(new Error('Mail relay denied. private'), { responseCode: 550 }));
      callback();
    },
    onRcptTo(address, session, callback) { recipients++; callback(); },
    onData(stream, session, callback) {
      const chunks = [];
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => { captured.push({ envelope: session.envelope, mime: Buffer.concat(chunks).toString() }); callback(); });
    },
  });
  server.on('error', () => {});
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.server.address().port;
  const factory = options => nodemailer.createTransport({ ...options, host: '127.0.0.1', port,
    tls: { ...options.tls, servername: 'localhost', ca: cert } });
  try {
    for (const kind of ['probe-default', 'probe-hostname', 'probe-login']) {
      const probe = await probeEnvelope(config, kind, factory);
      assert.equal(probe.auth, 'accepted');
      assert.equal(probe.authStatus, 235);
      assert.equal(probe.mailFrom.status, 250);
      assert.equal(probe.messageSubmitted, false);
    }
    rejectEnvelope = true;
    const denied = await probeEnvelope(config, 'probe-default', factory);
    assert.equal(denied.mailFrom.status, 550);
    assert.equal(denied.mailFrom.reason, 'relay_denied');
    assert.doesNotMatch(JSON.stringify(denied), /private/);
    server.options.disabledCommands.push('AUTH');
    // Reproduce verify() succeeding without checking a password when no AUTH is offered.
    assert.equal(await createSender({ ...config, password: 'wrong' }, factory).verify(), true);
    const noAuth = await probeEnvelope(config, 'probe-default', factory);
    assert.equal(noAuth.auth, 'not_advertised');
    assert.equal(noAuth.mailFrom.status, 550);
    server.options.disabledCommands = server.options.disabledCommands.filter(command => command !== 'AUTH');
    assert.equal(recipients, 0);
    assert.equal(captured.length, 0);
    rejectEnvelope = false;
    assert.equal(await createSender(config, factory).verify(), true);
    assert.equal(captured.length, 0);
    await assert.rejects(createSender({ ...config, password: 'wrong' }, factory).verify(),
      error => error.code === 'EAUTH');
    assert.equal(captured.length, 0);
    for (const kind of ['confirmation', 'refusal']) {
      const result = await createSender(config, factory)(makeMessage(kind, config, kind));
      assert.deepEqual(result.accepted, [config.recipient]);
    }
    assert.equal(captured.length, 2);
    for (const [index, mail] of captured.entries()) {
      const headers = mail.mime.split('\r\n\r\n')[0].replace(/\r\n[ \t]+/g, ' ');
      assert.equal(mail.envelope.mailFrom.address, FROM);
      assert.deepEqual(mail.envelope.rcptTo.map(r => r.address), [config.recipient]);
      assert.match(headers, /From:.*<sender@example\.co\.jp>/);
      assert.match(headers, /Reply-To: studio@example\.co\.jp/);
      assert.match(headers, /Content-Type: text\/plain; charset=utf-8/i);
      assert.match(headers, /Subject: =\?UTF-8\?/i);
      assert.doesNotMatch(headers, /^Bcc:|^Cc:/mi);
      const decodedBody = Buffer.from(mail.mime.split('\r\n\r\n')[1].replace(/\s/g, ''), 'base64').toString('utf8');
      const kind = index === 0 ? 'confirmation' : 'refusal';
      assert.equal(decodedBody.trim(), makeMessage(kind, config, kind).text);
    }
    await assert.rejects(createSender({ ...config, password: 'wrong' }, factory)(makeMessage('refusal', config, 'fail')),
      error => error.code === 'EAUTH');
    assert.equal(captured.length, 2);
    // A server not trusted by the client must be rejected; never disable validation.
    const untrusted = options => nodemailer.createTransport({ ...options, host: '127.0.0.1', port,
      tls: { ...options.tls, servername: 'localhost' } });
    await assert.rejects(createSender(config, untrusted)(makeMessage('refusal', config, 'untrusted')));
    assert.equal(captured.length, 2);
  } finally {
    await new Promise(resolve => server.close(resolve));
    rmSync(directory, { recursive: true, force: true });
  }
});
