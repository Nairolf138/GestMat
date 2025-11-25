import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const REQUIRED_CORS_ORIGINS = [
  'https://gestmat.nairolfconcept.fr',
] as const;

const normalizeCorsOrigins = (value: string | undefined): string[] => {
  if (!value) {
    return [];
  }

  const entries = value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (entries.some((origin) => origin.toLowerCase() === '*')) {
    return [];
  }

  const normalized = entries
    .map((origin) => {
      const trimmed = origin.replace(/\/+$/u, '').trim();
      if (!trimmed) {
        return null;
      }

      try {
        const parsed = new URL(trimmed);
        if (!parsed.protocol || !parsed.hostname) {
          throw new Error('CORS origin must include a scheme and host');
        }

        let port = parsed.port;
        if (
          (parsed.protocol === 'http:' && port === '80') ||
          (parsed.protocol === 'https:' && port === '443')
        ) {
          port = '';
        }
        const hostname = parsed.hostname.includes(':')
          ? `[${parsed.hostname}]`
          : parsed.hostname;
        return `${parsed.protocol}//${hostname}${port ? `:${port}` : ''}`;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'must be a valid absolute URL or *';
        throw new Error(`Invalid CORS origin entry "${origin}": ${message}`);
      }
    })
    .filter((origin): origin is string => origin !== null && origin.length > 0);

  return Array.from(new Set(normalized));
};

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  CORS_ORIGIN: z
    .string()
    .optional()
    .transform((val) => normalizeCorsOrigins(val)),
  MONGODB_URI: z.string().default('mongodb://localhost/gestmat'),
  JWT_SECRET: z.string(),
  SMTP_URL: z.string().optional(),
  NOTIFY_EMAIL: z.string().optional(),
  NODE_ENV: z.string().default('development'),
  API_PREFIX: z.string().optional(),
  API_URL: z.string().optional(),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  LOAN_REMINDER_OFFSET_HOURS: z.coerce.number().positive().default(24),
  LOAN_REMINDER_INTERVAL_MINUTES: z.coerce.number().positive().default(60),
  LOAN_OVERDUE_CHECK_INTERVAL_MINUTES: z.coerce.number().positive().default(60),
  LOAN_ARCHIVE_MIN_AGE_DAYS: z.coerce.number().positive().default(365),
  LOAN_ARCHIVE_INTERVAL_DAYS: z.coerce.number().positive().default(1),
  LOAN_ARCHIVE_BATCH_SIZE: z.coerce.number().int().positive().default(100),
  REPORT_CHECK_INTERVAL_HOURS: z.coerce.number().positive().default(24),
});

const env = envSchema.parse(process.env);

const normalizeRequiredCorsOrigins = (): string[] => {
  try {
    return normalizeCorsOrigins(REQUIRED_CORS_ORIGINS.join(','));
  } catch (error) {
    throw new Error(
      `Failed to normalize required CORS origins: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};

const requiredCorsOrigins = normalizeRequiredCorsOrigins();

const mergeCorsOrigins = (
  configuredOrigins: string[],
  requiredOrigins: string[],
): string[] => {
  const merged = new Set(requiredOrigins);

  for (const origin of configuredOrigins) {
    merged.add(origin);
  }

  return Array.from(merged);
};

const normalizeApiPrefix = (value: string | undefined): string => {
  if (value === undefined) {
    return '/api';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  const withoutTrailing = trimmed.replace(/\/+$/u, '');
  if (!withoutTrailing) {
    return '';
  }
  const withoutLeading = withoutTrailing.replace(/^\/+/, '');
  if (!withoutLeading) {
    return '';
  }
  return `/${withoutLeading}`;
};

export const PORT = env.PORT;
export const CORS_ORIGIN = mergeCorsOrigins(env.CORS_ORIGIN, requiredCorsOrigins);
export const MONGODB_URI = env.MONGODB_URI;
export const JWT_SECRET = env.JWT_SECRET;
export const SMTP_URL = env.SMTP_URL;
export const NOTIFY_EMAIL = env.NOTIFY_EMAIL;
export const NODE_ENV = env.NODE_ENV;
export const API_PREFIX = normalizeApiPrefix(env.API_PREFIX);
export const API_URL = env.API_URL ?? `http://localhost:${env.PORT}${API_PREFIX || ''}`;
export const RATE_LIMIT_MAX = env.RATE_LIMIT_MAX;
export const LOAN_REMINDER_OFFSET_HOURS = env.LOAN_REMINDER_OFFSET_HOURS;
export const LOAN_REMINDER_INTERVAL_MINUTES = env.LOAN_REMINDER_INTERVAL_MINUTES;
export const LOAN_OVERDUE_CHECK_INTERVAL_MINUTES =
  env.LOAN_OVERDUE_CHECK_INTERVAL_MINUTES;
export const LOAN_ARCHIVE_MIN_AGE_DAYS = env.LOAN_ARCHIVE_MIN_AGE_DAYS;
export const LOAN_ARCHIVE_INTERVAL_DAYS = env.LOAN_ARCHIVE_INTERVAL_DAYS;
export const LOAN_ARCHIVE_BATCH_SIZE = env.LOAN_ARCHIVE_BATCH_SIZE;
export const REPORT_CHECK_INTERVAL_HOURS = env.REPORT_CHECK_INTERVAL_HOURS;

export { normalizeCorsOrigins };

export default {
  PORT,
  CORS_ORIGIN,
  MONGODB_URI,
  JWT_SECRET,
  SMTP_URL,
  NOTIFY_EMAIL,
  NODE_ENV,
  API_PREFIX,
  API_URL,
  RATE_LIMIT_MAX,
  LOAN_REMINDER_OFFSET_HOURS,
  LOAN_REMINDER_INTERVAL_MINUTES,
  LOAN_OVERDUE_CHECK_INTERVAL_MINUTES,
  LOAN_ARCHIVE_MIN_AGE_DAYS,
  LOAN_ARCHIVE_INTERVAL_DAYS,
  LOAN_ARCHIVE_BATCH_SIZE,
  REPORT_CHECK_INTERVAL_HOURS,
};
