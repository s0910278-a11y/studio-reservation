# Standalone SMTP test harness

This directory tests SMTP delivery independently of the reservation application.
It does not connect to Apps Script, spreadsheets, or customer records. Existing
application files and the root deployment configuration are unchanged.

## Local checks

Use Node.js 22 or later and OpenSSL. Run these commands in this directory:

```sh
npm ci
npm test
npm run preview
```

The 16 tests cover original-template parity in an offline GAS sandbox, fixed
recipients, access restrictions, create-only send claims, failure handling,
and loopback SMTPS authentication, TLS certificate validation and Japanese MIME.
The preview command only writes local files under ignored `previews/`.
No external email is sent by these commands.

## Deployment boundary

Use a separate Netlify test project with this directory as its base directory.
Do not change the reservation application's Netlify project. This harness has
not yet been deployed or tested against a real external SMTP account.

Use `.env.example` as a list of runtime settings. Configure actual sender,
recipient, reply address, site identifiers and SMTP credentials privately,
outside this public repository. No operational values belong in this README.
The configured test recipient must be the operator's own verified Gmail account.
The API never accepts a recipient, sender, body, CC or BCC in a request.

- `SMTP_FROM`: fixed authorized sender; also used as envelope sender.
- `SMTP_PRODUCTION_SITE_ID`: actual live site to prohibit.
- `SMTP_TEST_SITE_ID`: a different, explicitly selected test site.
- `SMTP_REPLY_TO`: explicit address on the sender's domain.
- `SMTP_TEST_BASE_URL`: separate test origin for the harmless cancellation page.
- `SMTP_TEST_ENABLED`: disabled unless exactly `true`.
- `SMTP_TEST_RUN_ID`: one manually controlled test batch.
- `SMTP_TEST_TOKEN`: random access token of at least 32 characters.
- `SMTP_TEST_RECIPIENT`: one verified personal Gmail address.
- `SMTP_PROVIDER`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`: SMTP settings.

Store credentials as secret environment variables scoped to Functions and the
test deployment context. Never place values in command-line arguments, logs,
public environment variables, source files, or chat.

Only the provider's documented implicit TLS configuration on port 465 is enabled:

| Provider setting | Host | Authentication username |
| --- | --- | --- |
| `alpha-mail` | `sauth.alpha-mail.jp` | full sender email address |
| `alpha-premier` | `smtp.alpha-prm.jp` | sender email address with `@` replaced by `%` |

Confirm the actual contract, account restrictions and permitted automated usage
before configuring the provider. Reply routing is an explicit operator choice.

## Manual sending and history

With runtime settings securely provided, use:

```sh
node scripts/request.mjs status confirmation
node scripts/request.mjs send confirmation
node scripts/request.mjs status refusal
node scripts/request.mjs send refusal
```

The `send` operations deliver real test mail; do not run them before the account
and sole recipient have been verified. Subjects clearly label the mail as a test.
The fixture is synthetic, and the cancellation URL opens a static test page that
does not change any data. Refusal mail has no cancellation link, as in the source.

Claims and outcomes are stored as immutable objects in the separate test site's
`studio-smtp-test-v1` store. A claim allows one SMTP attempt per run, recipient and
kind across concurrent requests and restarts. Claims are not automatically
deleted or expired. No automatic retries or Gmail fallback are implemented.

`smtp_accepted` means the SMTP server accepted the message, not that it arrived.
`unknown` and `claimed_or_unknown` require manual inspection. Do not change the
run ID or delete a claim to retry until the previous outcome has been checked.
SMTP cannot guarantee exactly-once delivery after an ambiguous connection loss.

Real provider connectivity, deployed Function/Blobs behavior, inbox delivery,
spam classification, authentication headers and reply routing are pending.
The production mail adapter and switch/rollback integration are also pending;
this test API must not be converted to production by removing recipient guards.

## Official references

- https://www.alpha-mail.jp/support/mail-ftp/mail/
- https://www.alpha-prm.jp/support/mail-ftp/mail/
- https://www.alpha-prm.jp/faq/mail/023050.html
- https://nodemailer.com/smtp
- https://docs.netlify.com/build/data-and-storage/netlify-blobs/

Source commits for this test branch use `[skip netlify] [skip ci]`. No production
deployment or mail transport switch is authorized by this test implementation.
