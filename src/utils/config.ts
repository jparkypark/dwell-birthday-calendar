import { Env } from '../index';

export interface Config {
  slack: {
    signingSecret: string;
    clientId: string;
    clientSecret: string;
  };
  admin: {
    password: string;
  };
  kv: {
    namespace: KVNamespace;
  };
}

export function createConfig(env: Env): Config {
  // Environment variables are validated before this is called
  return {
    slack: {
      signingSecret: env.SLACK_SIGNING_SECRET!,
      clientId: env.SLACK_CLIENT_ID!,
      clientSecret: env.SLACK_CLIENT_SECRET!,
    },
    admin: {
      password: env.ADMIN_PASSWORD!,
    },
    kv: {
      namespace: env.BIRTHDAY_KV!,
    },
  };
}

// Configuration constants
export const CONFIG_CONSTANTS = {
  SLACK_REQUEST_TIMEOUT: 5 * 60 * 1000, // 5 minutes
  CACHE_TTL: 60 * 60 * 1000, // 1 hour
  LOG_LEVEL: 'INFO',
  MAX_REQUEST_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_SLACK_EVENTS: ['app_home_opened'],
  SUPPORTED_SLACK_COMMANDS: ['/birthdays'],
} as const;