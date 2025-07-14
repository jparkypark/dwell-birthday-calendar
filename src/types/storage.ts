export interface KVStorageKeys {
  BIRTHDAY_DATA: 'birthdays:data';
  INSTALLATIONS: 'installations';
  CACHE_HOME_VIEW: 'cache:home_view';
}

export interface StorageOperation<T = any> {
  key: string;
  value?: T;
  metadata?: any;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
}