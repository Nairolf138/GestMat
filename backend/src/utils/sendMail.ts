import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { SMTP_URL } from '../config';
import logger from './logger';

let transporter:
  | Transporter
  | { sendMail: (opts: SendMailOptions) => Promise<void> };

function getTransporter():
  | Transporter
  | { sendMail: (opts: SendMailOptions) => Promise<void> } {
  if (!transporter) {
    if (SMTP_URL) {
      transporter = nodemailer.createTransport(SMTP_URL);
    } else {
      transporter = {
        sendMail: async (opts: SendMailOptions) => {
          logger.info('Email disabled. Would send: %o', opts);
        },
      };
    }
  }
  return transporter;
}

export async function sendMail(options: SendMailOptions): Promise<void> {
  const transport = getTransporter();
  await transport.sendMail(options);
}
