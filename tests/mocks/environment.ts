import { vi } from 'vitest';
import { createMockKVNamespace, DEFAULT_KV_DATA } from './kv-store';
import { TEST_CONSTANTS } from '../setup';

export interface MockEnv {
  BIRTHDAY_KV: KVNamespace;
  SLACK_SIGNING_SECRET: string;
  SLACK_CLIENT_ID: string;
  SLACK_CLIENT_SECRET: string;
  ADMIN_PASSWORD: string;
}

export const createMockEnvironment = (overrides: Partial<MockEnv> = {}): MockEnv => {
  return {
    BIRTHDAY_KV: createMockKVNamespace(DEFAULT_KV_DATA),
    SLACK_SIGNING_SECRET: TEST_CONSTANTS.MOCK_SLACK_SIGNING_SECRET,
    SLACK_CLIENT_ID: TEST_CONSTANTS.MOCK_SLACK_CLIENT_ID,
    SLACK_CLIENT_SECRET: TEST_CONSTANTS.MOCK_SLACK_CLIENT_SECRET,
    ADMIN_PASSWORD: TEST_CONSTANTS.MOCK_ADMIN_PASSWORD,
    ...overrides
  };
};

export const createMockExecutionContext = (): ExecutionContext => {
  return {
    waitUntil: vi.fn((promise: Promise<any>) => promise),
    passThroughOnException: vi.fn()
  };
};

export const createMockRequest = (
  url: string = 'https://test.example.com',
  options: RequestInit = {}
): Request => {
  return new Request(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'test-agent',
      ...options.headers
    },
    ...options
  });
};

// Mock logger for testing
export const createMockLogger = () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  requestId: 'test-request-id'
});

// Mock performance monitor for testing
export const createMockPerformanceMonitor = () => ({
  trackCacheHit: vi.fn(),
  trackCacheMiss: vi.fn(),
  trackCacheWrite: vi.fn(),
  trackCacheDelete: vi.fn(),
  trackRequest: vi.fn(),
  trackScheduledTask: vi.fn(),
  getPerformanceMetrics: vi.fn().mockReturnValue({
    cacheHits: 10,
    cacheMisses: 2,
    totalCacheRequests: 12,
    cacheHitRatio: 0.83,
    averageResponseTime: 150,
    totalRequests: 50,
    errorCount: 1,
    errorRate: 0.02
  }),
  getCacheOperationHistory: vi.fn().mockReturnValue([]),
  getScheduledTaskHistory: vi.fn().mockReturnValue([]),
  generateReport: vi.fn().mockReturnValue({
    timestamp: new Date().toISOString(),
    metrics: {},
    summary: {
      healthStatus: 'healthy',
      recommendations: []
    }
  }),
  logPerformanceMetrics: vi.fn(),
  resetMetrics: vi.fn()
});

// Mock storage service for testing
export const createMockStorageService = () => ({
  getBirthdayData: vi.fn().mockResolvedValue({
    birthdays: [
      { name: 'John Doe', month: 1, day: 20, slackUserId: 'U1234567890' },
      { name: 'Jane Smith', month: 1, day: 15, slackUserId: 'U1234567891' }
    ]
  }),
  storeBirthdayData: vi.fn().mockResolvedValue(undefined),
  getInstallation: vi.fn().mockResolvedValue({
    teamId: 'T1234567890',
    accessToken: 'xoxb-test-token',
    botToken: 'xoxb-test-bot-token',
    installedAt: 1641024000000
  }),
  getInstallations: vi.fn().mockResolvedValue({
    'T1234567890': {
      teamId: 'T1234567890',
      accessToken: 'xoxb-test-token',
      botToken: 'xoxb-test-bot-token',
      installedAt: 1641024000000
    }
  }),
  storeInstallation: vi.fn().mockResolvedValue(undefined),
  getCachedHomeView: vi.fn().mockResolvedValue(null),
  storeCachedHomeView: vi.fn().mockResolvedValue(undefined),
  clearCachedHomeView: vi.fn().mockResolvedValue(undefined),
  getCacheStatus: vi.fn().mockResolvedValue({
    lastUpdated: Date.now(),
    isExpired: false
  }),
  clearCache: vi.fn().mockResolvedValue(undefined)
});

// Mock cache manager for testing
export const createMockCacheManager = () => ({
  refreshAllCaches: vi.fn().mockResolvedValue({
    success: true,
    refreshedKeys: ['cache:home_view'],
    errors: [],
    duration: 1000
  }),
  warmCacheForAllInstallations: vi.fn().mockResolvedValue({
    success: true,
    warmedInstallations: 1,
    errors: [],
    duration: 500
  }),
  warmCacheForInstallation: vi.fn().mockResolvedValue(undefined),
  optimizeCache: vi.fn().mockResolvedValue({
    cleaned: 1,
    optimized: 1,
    errors: [],
    duration: 200
  }),
  getCacheStatistics: vi.fn().mockResolvedValue({
    cacheStatus: { lastUpdated: Date.now(), isExpired: false },
    performanceMetrics: {},
    timestamp: new Date().toISOString()
  }),
  performHealthCheck: vi.fn().mockResolvedValue({
    healthy: true,
    issues: []
  })
});

// Global mocks for common functions
export const setupGlobalMocks = () => {
  // Mock crypto for signature verification
  globalThis.crypto = {
    subtle: {
      importKey: vi.fn(),
      sign: vi.fn(),
      verify: vi.fn()
    }
  } as any;

  // Mock fetch for external API calls
  globalThis.fetch = vi.fn();
  
  // Mock setTimeout/setInterval
  globalThis.setTimeout = vi.fn((fn, delay) => {
    return setTimeout(fn, delay);
  });
  
  globalThis.setInterval = vi.fn((fn, delay) => {
    return setInterval(fn, delay);
  });
};

// Reset all mocks
export const resetAllMocks = () => {
  vi.clearAllMocks();
  vi.clearAllTimers();
};