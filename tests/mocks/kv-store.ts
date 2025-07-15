import { vi } from 'vitest';

export interface MockKVEntry {
  key: string;
  value: string;
  metadata?: any;
  expiration?: number;
}

export class MockKVNamespace {
  private storage: Map<string, MockKVEntry> = new Map();
  
  constructor(initialData: Record<string, any> = {}) {
    Object.entries(initialData).forEach(([key, value]) => {
      this.storage.set(key, {
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value)
      });
    });
  }

  async get(key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<any> {
    const entry = this.storage.get(key);
    
    if (!entry) {
      return null;
    }

    // Check expiration
    if (entry.expiration && Date.now() > entry.expiration) {
      this.storage.delete(key);
      return null;
    }

    const type = options?.type || 'text';
    
    switch (type) {
      case 'json':
        try {
          return JSON.parse(entry.value);
        } catch {
          return null;
        }
      case 'text':
      default:
        return entry.value;
    }
  }

  async put(
    key: string,
    value: string | ArrayBuffer | ArrayBufferView | ReadableStream,
    options?: {
      expiration?: number;
      expirationTtl?: number;
      metadata?: any;
    }
  ): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    const entry: MockKVEntry = {
      key,
      value: stringValue,
      metadata: options?.metadata
    };

    if (options?.expiration) {
      entry.expiration = options.expiration * 1000; // Convert to milliseconds
    } else if (options?.expirationTtl) {
      entry.expiration = Date.now() + (options.expirationTtl * 1000);
    }

    this.storage.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async list(options?: {
    limit?: number;
    prefix?: string;
    cursor?: string;
  }): Promise<{
    keys: Array<{ name: string; expiration?: number; metadata?: any }>;
    list_complete: boolean;
    cursor?: string;
  }> {
    let keys = Array.from(this.storage.keys());
    
    if (options?.prefix) {
      keys = keys.filter(key => key.startsWith(options.prefix));
    }

    if (options?.limit) {
      keys = keys.slice(0, options.limit);
    }

    return {
      keys: keys.map(key => {
        const entry = this.storage.get(key)!;
        return {
          name: key,
          expiration: entry.expiration ? Math.floor(entry.expiration / 1000) : undefined,
          metadata: entry.metadata
        };
      }),
      list_complete: true
    };
  }

  // Helper methods for testing
  clear(): void {
    this.storage.clear();
  }

  size(): number {
    return this.storage.size;
  }

  has(key: string): boolean {
    return this.storage.has(key);
  }

  getAllKeys(): string[] {
    return Array.from(this.storage.keys());
  }

  getRawValue(key: string): MockKVEntry | undefined {
    return this.storage.get(key);
  }
}

// Factory function for creating mock KV namespace
export const createMockKVNamespace = (initialData?: Record<string, any>): KVNamespace => {
  const mockKV = new MockKVNamespace(initialData);
  
  return {
    get: vi.fn((key: string, options?: any) => mockKV.get(key, options)),
    put: vi.fn((key: string, value: any, options?: any) => mockKV.put(key, value, options)),
    delete: vi.fn((key: string) => mockKV.delete(key)),
    list: vi.fn((options?: any) => mockKV.list(options)),
    
    // Add testing helpers
    __mock: mockKV
  } as any;
};

// Default test data
export const DEFAULT_KV_DATA = {
  'birthdays:data': JSON.stringify({
    birthdays: [
      { name: 'John Doe', month: 1, day: 20, slackUserId: 'U1234567890' },
      { name: 'Jane Smith', month: 1, day: 15, slackUserId: 'U1234567891' }
    ]
  }),
  'installations': JSON.stringify({
    'T1234567890': {
      teamId: 'T1234567890',
      accessToken: 'xoxb-test-token',
      botToken: 'xoxb-test-bot-token',
      installedAt: 1641024000000
    }
  })
};