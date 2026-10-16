import { mkdir, writeFile } from 'node:fs/promises';
import nodemailer from 'nodemailer';
import { KINDS, TestError, testOrigin } from '../src/config.mjs';
import { makeMessage } from '../src/templates.mjs';

// No arguments or URLs containing credentials; no shell commands with secret values.
const [operation, kind] = process.argv.slice(2);
try {
  if (operation === 'preview') {
    await mkdir('previews', { recursive: true });
    for (const sampleKind of KINDS) {
      const message = makeMessage(sampleKind, {
        from: 'sender@example.co.jp', recipient: 'owner-test@example.invalid', replyTo: 'studio@example.co.jp',
        baseUrl: 'https://isolated-studio-mail-test.netlify.app',
      }, `offline-${sampleKind}`);
      const mail = await nodemailer.createTransport({ streamTransport: true, buffer: true }).sendMail(message);
      await writeFile(`previews/${sampleKind}.eml`, mail.message);
      await writeFile(`previews/${sampleKind}.md`, `${message.subject}\n\n${message.text}\n`);
    }
    console.info('Offline previews written. No network or email delivery performed.');
  } else {
    if (!(operation === 'verify' && kind === 'connection') &&
        !(operation === 'status' && [...KINDS, 'connection'].includes(kind)) &&
        !(operation === 'send' && KINDS.includes(kind))) throw new TestError('INVALID_OPERATION');
    const origin = testOrigin(process.env.SMTP_TEST_BASE_URL);
    const token = process.env.SMTP_TEST_TOKEN;
    if (!token || token.length < 32) throw new TestError('MISSING_TEST_TOKEN');
    const url = new URL('/.netlify/functions/smtp-test', origin);
    if (operation === 'status') url.searchParams.set('kind', kind);
    const response = await fetch(url, { method: operation === 'status' ? 'GET' : 'POST',
      redirect: 'error', signal: AbortSignal.timeout(45000),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(operation !== 'status' ? { body: JSON.stringify({ kind }) } : {}),
    });
    // Only allowlisted response metadata is printed, never raw server errors or HTML.
    const result = await response.json();
    console.info(JSON.stringify({ status: response.status, testId: result.testId,
      kind: result.kind, state: result.state, retry: result.retry,
      ...(kind === 'connection' ? { diagnostic: result.diagnostic } : {}) }));
    if (!response.ok) process.exitCode = 1;
  }
} catch {
  console.error('Test operation failed. Check configuration/history before any resend.');
  process.exitCode = 1;
}
