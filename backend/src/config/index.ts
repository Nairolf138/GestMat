import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  CORS_ORIGIN: z
    .string()
    .optional()
    .transform((val) =>
      val ? val.split(',').map((origin) => origin.trim()).filter(Boolean) : ([] as string[])
    ),
  MONGODB_URI: z.string().default('mongodb://localhost/gestmat'),
  JWT_SECRET: z.string(),
  SMTP_URL: z.string().optional(),
  NOTIFY_EMAIL: z.string().optional(),
  NODE_ENV: z.string().default('development'),
  API_PREFIX: z.string().optional(),
  API_URL: z.string().optional(),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
});

const env = envSchema.parse(process.env);

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
export const CORS_ORIGIN = env.CORS_ORIGIN;
export const MONGODB_URI = env.MONGODB_URI;
export const JWT_SECRET = env.JWT_SECRET;
export const SMTP_URL = env.SMTP_URL;
export const NOTIFY_EMAIL = env.NOTIFY_EMAIL;
export const NODE_ENV = env.NODE_ENV;
export const API_PREFIX = normalizeApiPrefix(env.API_PREFIX);
export const API_URL = env.API_URL ?? `http://localhost:${env.PORT}${API_PREFIX || ''}`;
export const RATE_LIMIT_MAX = env.RATE_LIMIT_MAX;

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
};
