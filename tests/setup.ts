import { beforeEach, vi } from 'vitest';

// Mock global functions available in Cloudflare Workers
Object.assign(globalThis, {
  atob: (str: string) => Buffer.from(str, 'base64').toString('binary'),
  btoa: (str: string) => Buffer.from(str, 'binary').toString('base64'),
  setTimeout: globalThis.setTimeout,
  clearTimeout: globalThis.clearTimeout,
  setInterval: globalThis.setInterval,
  clearInterval: globalThis.clearInterval,
});

// Mock Date.now() to return a consistent timestamp for tests
const MOCK_DATE = new Date('2024-01-15T12:00:00Z');
const MOCK_TIMESTAMP = MOCK_DATE.getTime();

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
  
  // Reset date to consistent value
  vi.useFakeTimers();
  vi.setSystemTime(MOCK_DATE);
});

// Export test utilities
export const TEST_CONSTANTS = {
  MOCK_DATE,
  MOCK_TIMESTAMP,
  MOCK_DATE_STRING: MOCK_DATE.toISOString(),
  MOCK_TEAM_ID: 'T1234567890',
  MOCK_USER_ID: 'U1234567890',
  MOCK_CHANNEL_ID: 'C1234567890',
  MOCK_ADMIN_PASSWORD: 'test-admin-password',
  MOCK_SLACK_SIGNING_SECRET: 'test-slack-signing-secret',
  MOCK_SLACK_CLIENT_ID: 'test-slack-client-id',
  MOCK_SLACK_CLIENT_SECRET: 'test-slack-client-secret'
};

export const TEST_BIRTHDAY_DATA = {
  birthdays: [
    {
      name: 'John Doe',
      month: 1,
      day: 20,
      slackUserId: 'U1234567890'
    },
    {
      name: 'Jane Smith',
      month: 1,
      day: 15, // Today (based on MOCK_DATE)
      slackUserId: 'U1234567891'
    },
    {
      name: 'Bob Johnson',
      month: 2,
      day: 29, // Leap year test
      slackUserId: 'U1234567892'
    },
    {
      name: 'Alice Williams',
      month: 12,
      day: 31, // Year boundary test
      slackUserId: 'U1234567893'
    }
  ]
};

export const TEST_SLACK_INSTALLATION = {
  teamId: TEST_CONSTANTS.MOCK_TEAM_ID,
  accessToken: 'xoxb-test-token',
  botToken: 'xoxb-test-bot-token',
  installedAt: MOCK_TIMESTAMP
};

// Helper function to create mock environment
export function createMockEnv(): any {
  return {
    BIRTHDAY_KV: createMockKVNamespace(),
    SLACK_SIGNING_SECRET: TEST_CONSTANTS.MOCK_SLACK_SIGNING_SECRET,
    SLACK_CLIENT_ID: TEST_CONSTANTS.MOCK_SLACK_CLIENT_ID,
    SLACK_CLIENT_SECRET: TEST_CONSTANTS.MOCK_SLACK_CLIENT_SECRET,
    ADMIN_PASSWORD: TEST_CONSTANTS.MOCK_ADMIN_PASSWORD
  };
}

// Helper function to create mock KV namespace
export function createMockKVNamespace(): KVNamespace {
  const storage = new Map<string, string>();
  
  return {
    get: vi.fn(async (key: string) => {
      return storage.get(key) || null;
    }),
    put: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
      return Promise.resolve();
    }),
    delete: vi.fn(async (key: string) => {
      storage.delete(key);
      return Promise.resolve();
    }),
    list: vi.fn(async () => {
      return {
        keys: Array.from(storage.keys()).map(name => ({ name })),
        list_complete: true,
        cursor: undefined
      };
    })
  } as any;
}

// Helper function to create mock request
export function createMockRequest(
  url: string = 'https://test.example.com',
  options: RequestInit = {}
): Request {
  return new Request(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Slack-Request-Timestamp': String(Math.floor(MOCK_TIMESTAMP / 1000)),
      'X-Slack-Signature': 'v0=test-signature',
      ...options.headers
    },
    ...options
  });
}

// Helper function to create mock execution context
export function createMockExecutionContext(): ExecutionContext {
  return {
    waitUntil: vi.fn((promise: Promise<any>) => promise),
    passThroughOnException: vi.fn()
  };
}

// Test data generators
export function generateBirthdays(count: number) {
  const birthdays = [];
  for (let i = 0; i < count; i++) {
    birthdays.push({
      name: `Person ${i + 1}`,
      month: Math.floor(Math.random() * 12) + 1,
      day: Math.floor(Math.random() * 28) + 1,
      slackUserId: `U${String(i).padStart(9, '0')}`
    });
  }
  return { birthdays };
}

// Mock fetch for external API calls
export const mockFetch = vi.fn();
globalThis.fetch = mockFetch;