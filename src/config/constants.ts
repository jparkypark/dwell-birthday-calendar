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

// Business Rules
export const BUSINESS_RULES = {
  DEFAULT_UPCOMING_DAYS: 30,
  EXPANDED_UPCOMING_DAYS: 90,
  BIRTHDAY_STATS_DAYS: 30,
  NEXT_YEAR_DAYS: 365,
} as const;

// UI Display Limits
export const UI_LIMITS = {
  COMPACT_BIRTHDAY_DISPLAY: 10,
  EXPANDED_BIRTHDAY_DISPLAY: 20,
  MAX_BIRTHDAYS_LIMIT: 1000,
} as const;

// Date Constants
export const DATE_CONSTANTS = {
  MILLISECONDS_PER_DAY: 24 * 60 * 60 * 1000,
  FEBRUARY_MONTH: 2,
  FEBRUARY_LEAP_DAY: 29,
  FEBRUARY_FALLBACK_DAY: 28,
  MONTHS_PER_YEAR: 12,
  DAYS_PER_WEEK: 7,
  WEEKS_FOR_RELATIVE_DISPLAY: 2,
  DAYS_FOR_WEEKS_DISPLAY: 60,
  DAYS_PER_MONTH_APPROX: 30,
} as const;

// Validation Limits
export const VALIDATION_LIMITS = {
  MAX_NAME_LENGTH: 100,
  MIN_MONTH: 1,
  MAX_MONTH: 12,
  MIN_DAY: 1,
  MAX_DAY: 31,
  SLACK_USER_ID_MIN_LENGTH: 8,
} as const;

// API & Network Constants
export const API_CONSTANTS = {
  MAX_RETRIES: 3,
  MAX_RETRY_DELAY: 5000,
  RETRY_BACKOFF_BASE: 2,
  INITIAL_RETRY_DELAY: 1000,
} as const;