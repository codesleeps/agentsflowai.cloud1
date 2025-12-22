import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().refine(
    (url) => url.startsWith('postgresql://'),
    { message: 'DATABASE_URL must be a PostgreSQL connection string' }
  ),

  // Vybe Integration
  VYBE_SERVER_SECRET: z.string().min(32, 'VYBE_SERVER_SECRET must be at least 32 characters').optional(),
  NEXT_PUBLIC_VYBE_INTEGRATIONS_DOMAIN: z.string().url().optional(),

  // AI Services
  OLLAMA_BASE_URL: z.string().url('OLLAMA_BASE_URL must be a valid URL'),

  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL').optional(),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),

  // Development Only
  NEXT_PUBLIC_DEV_USER_NAME: z.string().optional(),
  NEXT_PUBLIC_DEV_USER_EMAIL: z.string().email().optional(),
  NEXT_PUBLIC_DEV_USER_IMAGE: z.string().url().optional(),

  // Inngest
  INNGEST_SIGNING_KEY: z.string().optional(),
  INNGEST_EVENT_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

export function validateEnv(): Env {
  if (validatedEnv) {
    return validatedEnv;
  }

  try {
    validatedEnv = envSchema.parse(process.env);

    // Additional validation for production
    if (validatedEnv.NODE_ENV === 'production') {
      if (!validatedEnv.NEXT_PUBLIC_APP_URL) {
        throw new Error('NEXT_PUBLIC_APP_URL is required in production');
      }
      if (!validatedEnv.INNGEST_SIGNING_KEY) {
        throw new Error('INNGEST_SIGNING_KEY is required in production');
      }
      if (!validatedEnv.INNGEST_EVENT_KEY) {
        throw new Error('INNGEST_EVENT_KEY is required in production');
      }
    }

    return validatedEnv;
  } catch (error) {
    console.error('Environment validation failed:', error);
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.errors);
    }
    process.exit(1);
  }
}

export function getEnv(): Env {
  if (!validatedEnv) {
    return validateEnv();
  }
  return validatedEnv;
}