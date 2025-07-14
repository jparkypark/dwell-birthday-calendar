import { SlackInstallation } from '../types';
import { BirthdayData } from '../types/birthday';
import { validateBirthdayData, validateBirthdayDataLimits } from './validators';
import { migrateToLatestFormat } from './migration';
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
  async storeCachedHomeView(data: Record<string, unknown> | import('../types/slack').SlackHomeView, expirationSeconds: number = 3600): Promise<void> {
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
  async getCachedHomeView(): Promise<Record<string, unknown> | import('../types/slack').SlackHomeView | null> {
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

  /**
   * Get cache status information
   */
  async getCacheStatus(): Promise<{ lastUpdated: number | null; isExpired: boolean }> {
    try {
      const data = await this.kv.get(STORAGE_KEYS.CACHE_HOME_VIEW, 'text');
      
      if (!data) {
        return { lastUpdated: null, isExpired: true };
      }

      const cacheEntry = JSON.parse(data);
      const isExpired = Date.now() > cacheEntry.expiresAt;
      
      return {
        lastUpdated: cacheEntry.timestamp,
        isExpired
      };
    } catch (error) {
      this.logger.error('Failed to get cache status', { error });
      return { lastUpdated: null, isExpired: true };
    }
  }

  /**
   * Clear all cache data
   */
  async clearCache(): Promise<void> {
    try {
      await this.clearCachedHomeView();
      this.logger.info('All cache cleared');
    } catch (error) {
      this.logger.error('Failed to clear cache', { error });
      throw error;
    }
  }

  /**
   * Store birthday data with validation
   */
  async storeBirthdayData(data: BirthdayData): Promise<void> {
    try {
      this.logger.info('Storing birthday data', { count: data.birthdays.length });
      
      // Validate the data before storing
      const validatedData = validateBirthdayData(data);
      validateBirthdayDataLimits(validatedData);
      
      await this.kv.put(
        STORAGE_KEYS.BIRTHDAY_DATA,
        JSON.stringify(validatedData),
        { 
          metadata: { 
            updatedAt: Date.now(),
            birthdayCount: validatedData.birthdays.length
          }
        }
      );
      
      this.logger.info('Birthday data stored successfully', { count: validatedData.birthdays.length });
      
      // Clear cached home view since birthday data changed
      await this.clearCachedHomeView();
    } catch (error) {
      this.logger.error('Failed to store birthday data', { error });
      throw error;
    }
  }

  /**
   * Retrieve birthday data with automatic migration
   */
  async getBirthdayData(): Promise<BirthdayData> {
    try {
      const data = await this.kv.get(STORAGE_KEYS.BIRTHDAY_DATA, 'text');
      
      if (!data) {
        this.logger.info('No birthday data found, returning empty dataset');
        return { birthdays: [] };
      }

      const rawData = JSON.parse(data);
      
      // Attempt migration if needed
      const migrationResult = migrateToLatestFormat(rawData);
      
      if (!migrationResult.success) {
        this.logger.error('Failed to migrate birthday data', { 
          errors: migrationResult.errors,
          warnings: migrationResult.warnings 
        });
        throw new Error(`Data migration failed: ${migrationResult.errors.join(', ')}`);
      }

      if (migrationResult.warnings.length > 0) {
        this.logger.warn('Birthday data migration completed with warnings', { 
          warnings: migrationResult.warnings 
        });
      }

      const birthdayData = migrationResult.migratedData!;
      this.logger.info('Birthday data retrieved', { count: birthdayData.birthdays.length });
      
      // If data was migrated, save the updated version
      if (migrationResult.originalVersion !== null && migrationResult.originalVersion < migrationResult.targetVersion) {
        this.logger.info('Updating stored data to latest format');
        await this.kv.put(
          STORAGE_KEYS.BIRTHDAY_DATA,
          JSON.stringify(birthdayData),
          { 
            metadata: { 
              updatedAt: Date.now(),
              birthdayCount: birthdayData.birthdays.length,
              migratedFrom: migrationResult.originalVersion
            }
          }
        );
      }
      
      return birthdayData;
    } catch (error) {
      this.logger.error('Failed to get birthday data', { error });
      throw error;
    }
  }

  /**
   * Update birthday data (replaces existing data)
   */
  async updateBirthdayData(data: BirthdayData): Promise<void> {
    try {
      this.logger.info('Updating birthday data', { count: data.birthdays.length });
      
      // Store the new data
      await this.storeBirthdayData(data);
      
      this.logger.info('Birthday data updated successfully', { count: data.birthdays.length });
    } catch (error) {
      this.logger.error('Failed to update birthday data', { error });
      throw error;
    }
  }

  /**
   * Get birthday data metadata without loading full data
   */
  async getBirthdayDataMetadata(): Promise<{ updatedAt?: number; birthdayCount?: number } | null> {
    try {
      const result = await this.kv.getWithMetadata(STORAGE_KEYS.BIRTHDAY_DATA);
      
      if (!result.metadata) {
        return null;
      }

      const metadata = result.metadata as Record<string, unknown>;
      return {
        updatedAt: typeof metadata.updatedAt === 'number' ? metadata.updatedAt : undefined,
        birthdayCount: typeof metadata.birthdayCount === 'number' ? metadata.birthdayCount : undefined
      };
    } catch (error) {
      this.logger.error('Failed to get birthday data metadata', { error });
      return null;
    }
  }

  /**
   * Check if birthday data exists
   */
  async hasBirthdayData(): Promise<boolean> {
    try {
      const metadata = await this.getBirthdayDataMetadata();
      return metadata !== null;
    } catch (error) {
      this.logger.error('Failed to check if birthday data exists', { error });
      return false;
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