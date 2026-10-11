import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { NOTIFY_EMAIL, SMTP_URL } from '../config';
import logger from './logger';

let transporter: Transporter;

let defaultSender: string | undefined;

function getTransporter(): Transporter {
  if (!transporter) {
    if (SMTP_URL) {
      try {
        const url = new URL(SMTP_URL);
        const secure = url.protocol === 'smtps:' || url.port === '465';
        const port = Number(url.port) || (secure ? 465 : 587);

        transporter = nodemailer.createTransport({
          host: url.hostname,
          port,
          secure,
          auth:
            url.username || url.password
              ? {
                  user: decodeURIComponent(url.username),
                  pass: decodeURIComponent(url.password),
                }
              : undefined,
        });

        defaultSender ??= NOTIFY_EMAIL ?? 'notifications@nairolfconcept.fr';
      } catch (error) {
        logger.warn('Invalid SMTP_URL, falling back to raw string: %o', error);
        transporter = nodemailer.createTransport(SMTP_URL);
        defaultSender ??= NOTIFY_EMAIL ?? 'notifications@nairolfconcept.fr';
      }
    } else {
      throw new Error('SMTP_URL is not configured');
    }
  }
  return transporter;
}

export async function sendMail(options: SendMailOptions): Promise<void> {
  const transport = getTransporter();
  const sender = options.from ?? defaultSender;
  const subject = options.subject ? formatSubject(options.subject) : undefined;
  const resolved = {
    ...options,
    from: sender,
    subject,
  };

  if (!resolved.from) {
    throw new Error('Email sender address is missing');
  }

  await transport.sendMail(resolved);
}

const SUBJECT_PREFIX = 'GestMat: ';

export function formatSubject(subject: string): string {
  const trimmed = subject.trim();
  return trimmed.startsWith(SUBJECT_PREFIX)
    ? trimmed
    : `${SUBJECT_PREFIX}${trimmed}`;
}
