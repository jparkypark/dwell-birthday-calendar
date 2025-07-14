import { StorageService } from '../utils/storage';
import { Logger } from '../utils/logger';
import { PerformanceMonitor } from '../utils/performance-monitor';
import { createHomeViewGenerator } from '../services/home-view-generator';
import { AppError } from '../middleware/error-handler';

export interface CacheRefreshResult {
  success: boolean;
  refreshedKeys: string[];
  errors: string[];
  duration: number;
}

export interface CacheWarmingResult {
  success: boolean;
  warmedInstallations: number;
  errors: string[];
  duration: number;
}

export interface CacheOptimizationResult {
  cleaned: number;
  optimized: number;
  errors: string[];
  duration: number;
}

export class CacheManager {
  constructor(
    private storage: StorageService,
    private logger: Logger,
    private performanceMonitor: PerformanceMonitor
  ) {}

  /**
   * Refresh all cached data
   */
  async refreshAllCaches(): Promise<CacheRefreshResult> {
    const startTime = Date.now();
    const refreshedKeys: string[] = [];
    const errors: string[] = [];

    try {
      this.logger.info('Starting cache refresh');

      // Clear existing cache
      try {
        await this.storage.clearCache();
        refreshedKeys.push('cache:home_view');
        
        this.performanceMonitor.trackCacheDelete(
          'cache:home_view',
          Date.now() - startTime,
          true
        );
      } catch (error) {
        const errorMsg = `Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        this.logger.error(errorMsg, { error });
      }

      // Pre-warm cache for all installations
      const warmingResult = await this.warmCacheForAllInstallations();
      if (warmingResult.errors.length > 0) {
        errors.push(...warmingResult.errors);
      }

      const duration = Date.now() - startTime;
      const success = errors.length === 0;

      this.logger.info('Cache refresh completed', {
        success,
        refreshedKeys: refreshedKeys.length,
        errors: errors.length,
        duration
      });

      return {
        success,
        refreshedKeys,
        errors,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = `Cache refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      this.logger.error(errorMsg, { error, duration });
      
      return {
        success: false,
        refreshedKeys,
        errors: [errorMsg],
        duration
      };
    }
  }

  /**
   * Warm cache for all installations
   */
  async warmCacheForAllInstallations(): Promise<CacheWarmingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let warmedInstallations = 0;

    try {
      this.logger.info('Starting cache warming');

      // Get all installations
      const installations = await this.storage.getInstallations();
      const installationIds = Object.keys(installations);

      this.logger.info('Found installations for cache warming', {
        count: installationIds.length
      });

      // Warm cache for each installation
      for (const teamId of installationIds) {
        try {
          await this.warmCacheForInstallation(teamId);
          warmedInstallations++;
        } catch (error) {
          const errorMsg = `Failed to warm cache for team ${teamId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          this.logger.warn(errorMsg, { teamId, error });
        }
      }

      const duration = Date.now() - startTime;
      const success = errors.length === 0;

      this.logger.info('Cache warming completed', {
        success,
        warmedInstallations,
        totalInstallations: installationIds.length,
        errors: errors.length,
        duration
      });

      return {
        success,
        warmedInstallations,
        errors,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = `Cache warming failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      this.logger.error(errorMsg, { error, duration });
      
      return {
        success: false,
        warmedInstallations,
        errors: [errorMsg],
        duration
      };
    }
  }

  /**
   * Warm cache for a specific installation
   */
  async warmCacheForInstallation(teamId: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Warming cache for installation', { teamId });

      // Get birthday data
      const birthdayData = await this.storage.getBirthdayData();
      
      // Generate home view
      const homeViewGenerator = createHomeViewGenerator(this.logger);
      const homeView = homeViewGenerator.generateHomeView(birthdayData.birthdays);
      
      // Cache the home view
      await this.storage.storeCachedHomeView(homeView, 3600); // 1 hour TTL
      
      const duration = Date.now() - startTime;
      
      this.performanceMonitor.trackCacheWrite(
        `cache:home_view:${teamId}`,
        duration,
        true
      );
      
      this.logger.debug('Cache warmed for installation', { teamId, duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.performanceMonitor.trackCacheWrite(
        `cache:home_view:${teamId}`,
        duration,
        false
      );
      
      this.logger.error('Failed to warm cache for installation', {
        teamId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      });
      
      throw error;
    }
  }

  /**
   * Optimize cache by cleaning up stale entries
   */
  async optimizeCache(): Promise<CacheOptimizationResult> {
    const startTime = Date.now();
    let cleaned = 0;
    let optimized = 0;
    const errors: string[] = [];

    try {
      this.logger.info('Starting cache optimization');

      // Check cache status
      const cacheStatus = await this.storage.getCacheStatus();
      
      if (cacheStatus.isExpired) {
        this.logger.info('Found expired cache, cleaning up');
        
        try {
          await this.storage.clearCache();
          cleaned++;
        } catch (error) {
          const errorMsg = `Failed to clean expired cache: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          this.logger.error(errorMsg, { error });
        }
      }

      // Optimize cache by pre-warming if needed
      if (cleaned > 0) {
        this.logger.info('Pre-warming cache after cleanup');
        
        const warmingResult = await this.warmCacheForAllInstallations();
        if (warmingResult.success) {
          optimized = warmingResult.warmedInstallations;
        } else {
          errors.push(...warmingResult.errors);
        }
      }

      const duration = Date.now() - startTime;

      this.logger.info('Cache optimization completed', {
        cleaned,
        optimized,
        errors: errors.length,
        duration
      });

      return {
        cleaned,
        optimized,
        errors,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = `Cache optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      this.logger.error(errorMsg, { error, duration });
      
      return {
        cleaned,
        optimized,
        errors: [errorMsg],
        duration
      };
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStatistics(): Promise<object> {
    try {
      const cacheStatus = await this.storage.getCacheStatus();
      const performanceMetrics = this.performanceMonitor.getPerformanceMetrics();
      
      return {
        cacheStatus,
        performanceMetrics,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Failed to get cache statistics', { error });
      throw new AppError('Failed to get cache statistics', 500);
    }
  }

  /**
   * Perform health check on cache system
   */
  async performHealthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    try {
      // Check cache status
      const cacheStatus = await this.storage.getCacheStatus();
      
      if (cacheStatus.isExpired) {
        issues.push('Cache is expired');
      }
      
      // Check performance metrics
      const metrics = this.performanceMonitor.getPerformanceMetrics();
      
      if (metrics.cacheHitRatio < 0.5) {
        issues.push('Low cache hit ratio');
      }
      
      if (metrics.errorRate > 0.1) {
        issues.push('High error rate');
      }
      
      return {
        healthy: issues.length === 0,
        issues
      };
    } catch (error) {
      this.logger.error('Health check failed', { error });
      return {
        healthy: false,
        issues: ['Health check failed']
      };
    }
  }
}

export function createCacheManager(
  storage: StorageService,
  logger: Logger,
  performanceMonitor: PerformanceMonitor
): CacheManager {
  return new CacheManager(storage, logger, performanceMonitor);
}