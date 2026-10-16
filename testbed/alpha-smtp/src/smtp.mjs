import nodemailer from 'nodemailer';

export function transportOptions(config) {
  return {
    host: config.host, port: 465, secure: true,
    auth: { user: config.user, pass: config.password },
    tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true, servername: config.host },
    connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 12000,
    pool: false, logger: false, debug: false,
    disableFileAccess: true, disableUrlAccess: true,
  };
}

export function createSender(config, createTransport = nodemailer.createTransport) {
  const transport = createTransport(transportOptions(config));
  const send = async message => {
    try { return await transport.sendMail(message); }
    finally { transport.close(); }
  };
  // AUTH/TLS only: verify() never submits MAIL FROM, RCPT TO or DATA.
  send.verify = async () => {
    try { return await transport.verify(); }
    finally { transport.close(); }
  };
  return send;
}

export function safeDiagnostic(error) {
  const allowed = ['EAUTH', 'EDNS', 'ECONNECTION', 'ETIMEDOUT', 'ESOCKET',
    'EENVELOPE', 'EMESSAGE', 'ESTREAM', 'EPROTOCOL'];
  const diagnostic = { code: allowed.includes(error?.code) ? error.code : 'UNCLASSIFIED' };
  const command = error?.command;
  if (typeof command === 'string') {
    if (command.startsWith('AUTH')) diagnostic.stage = 'AUTH';
    else if (['CONN', 'EHLO', 'HELO', 'STARTTLS', 'MAIL FROM', 'RCPT TO', 'DATA'].includes(command)) {
      diagnostic.stage = command;
    }
  }
  if (Number.isInteger(error?.responseCode) && error.responseCode >= 100 && error.responseCode <= 599) {
    diagnostic.responseCode = error.responseCode;
  }
  return diagnostic;
}
