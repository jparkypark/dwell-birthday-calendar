export const KV_KEYS = {
  BIRTHDAY_DATA: 'birthdays:data',
  INSTALLATIONS: 'installations',
  CACHE_HOME_VIEW: 'cache:home_view',
} as const;

export const SLACK_ENDPOINTS = {
  EVENTS: '/slack/events',
  COMMANDS: '/slack/commands',
  OAUTH_REDIRECT: '/oauth/redirect',
} as const;

export const CACHE_TTL = {
  HOME_VIEW: 60 * 60 * 1000, // 1 hour in milliseconds
  BIRTHDAY_DATA: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
} as const;

export const SLACK_TIMEOUTS = {
  REQUEST_TIMEOUT: 3000, // 3 seconds
  VERIFICATION_WINDOW: 300, // 5 minutes
} as const;