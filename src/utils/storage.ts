import { SlackInstallation } from '../types';
import { createLogger, Logger } from './logger';
import { Env } from '../index';

const STORAGE_KEYS = {
  INSTALLATIONS: 'installations',
  BIRTHDAY_DATA: 'birthdays:data',
  CACHE_HOME_VIEW: 'cache:home_view',
} as const;

export class StorageService {
  constructor(
    private kv: KVNamespace,
    private logger: Logger = createLogger()
  ) {}

  /**
   * Store Slack installation data
   */
  async storeInstallation(teamId: string, installation: SlackInstallation): Promise<void> {
    try {
      this.logger.info('Storing installation data', { teamId });
      
      // Get existing installations
      const installations = await this.getInstallations();
      
      // Add or update the installation
      installations[teamId] = installation;
      
      // Store back to KV
      await this.kv.put(
        STORAGE_KEYS.INSTALLATIONS, 
        JSON.stringify(installations),
        { metadata: { updatedAt: Date.now() } }
      );
      
      this.logger.info('Installation data stored successfully', { teamId });
    } catch (error) {
      this.logger.error('Failed to store installation data', { teamId, error });
      throw error;
    }
  }

  /**
   * Retrieve installation data for a specific team
   */
  async getInstallation(teamId: string): Promise<SlackInstallation | null> {
    try {
      const installations = await this.getInstallations();
      return installations[teamId] || null;
    } catch (error) {
      this.logger.error('Failed to get installation data', { teamId, error });
      return null;
    }
  }

  /**
   * Get all installations
   */
  async getInstallations(): Promise<Record<string, SlackInstallation>> {
    try {
      const data = await this.kv.get(STORAGE_KEYS.INSTALLATIONS, 'text');
      return data ? JSON.parse(data) : {};
    } catch (error) {
      this.logger.error('Failed to get installations', { error });
      return {};
    }
  }

  /**
   * Remove installation data for a team
   */
  async removeInstallation(teamId: string): Promise<void> {
    try {
      this.logger.info('Removing installation data', { teamId });
      
      const installations = await this.getInstallations();
      delete installations[teamId];
      
      await this.kv.put(
        STORAGE_KEYS.INSTALLATIONS, 
        JSON.stringify(installations),
        { metadata: { updatedAt: Date.now() } }
      );
      
      this.logger.info('Installation data removed successfully', { teamId });
    } catch (error) {
      this.logger.error('Failed to remove installation data', { teamId, error });
      throw error;
    }
  }

  /**
   * Validate that a stored installation has valid tokens
   */
  async validateInstallation(teamId: string): Promise<boolean> {
    try {
      const installation = await this.getInstallation(teamId);
      
      if (!installation) {
        return false;
      }

      // Check if installation has required tokens
      if (!installation.botToken || !installation.accessToken) {
        this.logger.warn('Installation missing required tokens', { teamId });
        return false;
      }

      // Additional validation could be added here (e.g., API test call)
      return true;
    } catch (error) {
      this.logger.error('Failed to validate installation', { teamId, error });
      return false;
    }
  }

  /**
   * Store cached home view
   */
  async storeCachedHomeView(data: Record<string, unknown>, expirationSeconds: number = 3600): Promise<void> {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + (expirationSeconds * 1000),
      };

      await this.kv.put(
        STORAGE_KEYS.CACHE_HOME_VIEW,
        JSON.stringify(cacheEntry),
        { expirationTtl: expirationSeconds }
      );

      this.logger.info('Home view cached successfully');
    } catch (error) {
      this.logger.error('Failed to cache home view', { error });
      throw error;
    }
  }

  /**
   * Get cached home view if not expired
   */
  async getCachedHomeView(): Promise<Record<string, unknown> | null> {
    try {
      const data = await this.kv.get(STORAGE_KEYS.CACHE_HOME_VIEW, 'text');
      
      if (!data) {
        return null;
      }

      const cacheEntry = JSON.parse(data);
      
      // Check if cache is expired
      if (Date.now() > cacheEntry.expiresAt) {
        this.logger.info('Cached home view expired');
        return null;
      }

      this.logger.info('Returning cached home view');
      return cacheEntry.data;
    } catch (error) {
      this.logger.error('Failed to get cached home view', { error });
      return null;
    }
  }

  /**
   * Clear cached home view
   */
  async clearCachedHomeView(): Promise<void> {
    try {
      await this.kv.delete(STORAGE_KEYS.CACHE_HOME_VIEW);
      this.logger.info('Cached home view cleared');
    } catch (error) {
      this.logger.error('Failed to clear cached home view', { error });
      throw error;
    }
  }
}

/**
 * Helper function to create storage service instance
 */
export function createStorageService(env: Env, request?: Request): StorageService {
  const logger = request ? createLogger(request) : createLogger();
  
  if (!env.BIRTHDAY_KV) {
    throw new Error('KV namespace not configured');
  }
  
  return new StorageService(env.BIRTHDAY_KV, logger);
}