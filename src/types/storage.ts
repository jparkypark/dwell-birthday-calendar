export interface KVStorageKeys {
  BIRTHDAY_DATA: 'birthdays:data';
  INSTALLATIONS: 'installations';
  CACHE_HOME_VIEW: 'cache:home_view';
}

export interface StorageOperation<T = unknown> {
  key: string;
  value?: T;
  metadata?: Record<string, unknown>;
}

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  expiresAt: number;
}