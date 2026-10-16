import { createHash } from 'node:crypto';
const BLOCKED_SITE_DIGEST = '630ddd335d685dcd381b6b8c2d61626adc906bbe1121b7ed3d44a653d9ef6864';
export const KINDS = ['confirmation', 'refusal'];
const providers = {
  'alpha-mail': { host: 'sauth.alpha-mail.jp', userFormat: 'email' },
  'alpha-premier': { host: 'smtp.alpha-prm.jp', userFormat: 'percent' },
};

export class TestError extends Error {
  constructor(code, status = 503) { super(code); this.code = code; this.status = status; }
}

export function testOrigin(value) {
  let url;
  try { url = new URL(value); } catch { throw new TestError('INVALID_TEST_ORIGIN'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      url.pathname !== '/' || url.search || url.hash ||
      !url.hostname.endsWith('.netlify.app') ||
      url.hostname === 'zeroemission-reserve.netlify.app' ||
      url.hostname.endsWith('--zeroemission-reserve.netlify.app')) {
    throw new TestError('UNSAFE_TEST_ORIGIN');
  }
  return url.origin;
}

export function readConfig(get, siteId) {
  if (get('SMTP_TEST_ENABLED') !== 'true') throw new TestError('TEST_DISABLED', 404);
  const required = ['SMTP_TEST_SITE_ID', 'SMTP_PRODUCTION_SITE_ID', 'SMTP_FROM', 'SMTP_TEST_RUN_ID', 'SMTP_TEST_TOKEN',
    'SMTP_TEST_RECIPIENT', 'SMTP_TEST_BASE_URL', 'SMTP_PROVIDER', 'SMTP_HOST',
    'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_REPLY_TO'];
  if (required.some(key => !get(key))) throw new TestError('MISSING_TEST_CONFIGURATION');
  if (!siteId || createHash('sha256').update(siteId).digest('hex') === BLOCKED_SITE_DIGEST ||
      siteId === get('SMTP_PRODUCTION_SITE_ID') || siteId !== get('SMTP_TEST_SITE_ID')) {
    throw new TestError('UNSAFE_TEST_SITE');
  }
  const from = get('SMTP_FROM');
  if (!/^[a-zA-Z0-9._+\-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(from)) throw new TestError('INVALID_SENDER');
  const provider = providers[get('SMTP_PROVIDER')];
  const expectedUser = provider?.userFormat === 'percent' ? from.replace('@', '%') : from;
  if (!provider || get('SMTP_HOST') !== provider.host || get('SMTP_PORT') !== '465' ||
      get('SMTP_USER') !== expectedUser) throw new TestError('UNSUPPORTED_SMTP_CONFIGURATION');
  const recipient = get('SMTP_TEST_RECIPIENT');
  if (!/^[a-zA-Z0-9._+\-]+@gmail\.com$/.test(recipient)) {
    throw new TestError('PERSONAL_GMAIL_REQUIRED');
  }
  const replyTo = get('SMTP_REPLY_TO');
  if (!/^[a-zA-Z0-9._+\-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(replyTo) ||
      replyTo.split('@')[1] !== from.split('@')[1]) {
    throw new TestError('INVALID_REPLY_TO');
  }
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(get('SMTP_TEST_RUN_ID')) ||
      get('SMTP_TEST_TOKEN').length < 32) throw new TestError('INVALID_TEST_ACCESS_CONFIGURATION');
  return {
    from, host: provider.host, port: 465, user: expectedUser, password: get('SMTP_PASSWORD'),
    token: get('SMTP_TEST_TOKEN'), recipient, replyTo,
    runId: get('SMTP_TEST_RUN_ID'), baseUrl: testOrigin(get('SMTP_TEST_BASE_URL')),
  };
}
