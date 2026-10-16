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
  return async message => {
    try { return await transport.sendMail(message); }
    finally { transport.close(); }
  };
}
