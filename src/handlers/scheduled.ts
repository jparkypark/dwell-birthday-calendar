import { createLogger } from '../utils/logger';
import { createStorageService } from '../utils/storage';
import { createPerformanceMonitor } from '../utils/performance-monitor';
import { createCacheManager } from '../services/cache-manager';
import { 
  withScheduledErrorHandling,
  withTimeout,
  createScheduledContext,
  ScheduledTaskError
} from '../middleware/scheduled-error-handler';
import { Env } from '../index';

// Type definition for Cloudflare Workers ScheduledController
interface ScheduledController {
  scheduledTime: number;
  cron: string;
}

export interface ScheduledTaskResult {
  success: boolean;
  taskName: string;
  duration: number;
  error?: string;
}

export async function handleScheduledEvent(
  controller: ScheduledController,
  env: Env,
  logger: ReturnType<typeof createLogger>
): Promise<void> {
  const startTime = Date.now();
  
  try {
    logger.info('Scheduled event triggered', {
      cron: controller.cron,
      scheduledTime: new Date(controller.scheduledTime).toISOString()
    });

    // Route to appropriate handler based on cron pattern
    switch (controller.cron) {
      case "0 8 * * *":
        // Daily cache refresh at 8:00 AM UTC
        await handleDailyCacheRefresh(controller, env, logger);
        break;
        
      case "0 9-17 * * 1-5":
        // Hourly cache warming during business hours
        await handleCacheWarming(controller, env, logger);
        break;
        
      case "0 0 1 * *":
        // Monthly maintenance on 1st of month
        await handleMonthlyMaintenance(controller, env, logger);
        break;
        
      case "*/5 * * * *":
        // Development health check every 5 minutes
        await handleHealthCheck(controller, env, logger);
        break;
        
      default:
        logger.warn('Unknown cron schedule', { cron: controller.cron });
        throw new ScheduledTaskError(
          `Unknown cron schedule: ${controller.cron}`,
          controller.cron,
          'unknown'
        );
    }

    const duration = Date.now() - startTime;
    logger.info('Scheduled event completed', {
      cron: controller.cron,
      duration,
      success: true
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    const err = error as Error;
    
    logger.error('Scheduled event failed', {
      cron: controller.cron,
      duration,
      error: err.message,
      stack: err.stack
    });
    
    // Don't re-throw - let the handler complete normally
    // The error will be recorded in the Cron Trigger Past Events
  }
}

async function handleDailyCacheRefresh(
  controller: ScheduledController,
  env: Env,
  logger: ReturnType<typeof createLogger>
): Promise<void> {
  const context = createScheduledContext(controller, 'daily-cache-refresh', logger);
  
  await withScheduledErrorHandling(async () => {
    const storageService = createStorageService(env, new Request('http://localhost'));
    const performanceMonitor = createPerformanceMonitor(logger);
    const cacheManager = createCacheManager(storageService, logger, performanceMonitor);
    
    logger.info('Starting daily cache refresh');
    
    // Refresh all caches
    const result = await withTimeout(
      () => cacheManager.refreshAllCaches(),
      600000, // 10 minutes timeout
      'daily-cache-refresh'
    );
    
    // Track performance
    performanceMonitor.trackScheduledTask({
      taskName: 'daily-cache-refresh',
      cron: controller.cron,
      duration: result.duration,
      success: result.success,
      attempt: 1,
      timestamp: Date.now()
    });
    
    logger.info('Daily cache refresh completed', {
      success: result.success,
      refreshedKeys: result.refreshedKeys.length,
      errors: result.errors.length,
      duration: result.duration
    });
    
    if (!result.success) {
      throw new ScheduledTaskError(
        `Daily cache refresh failed: ${result.errors.join(', ')}`,
        controller.cron,
        'daily-cache-refresh'
      );
    }
  }, context);
}

async function handleCacheWarming(
  controller: ScheduledController,
  env: Env,
  logger: ReturnType<typeof createLogger>
): Promise<void> {
  const context = createScheduledContext(controller, 'cache-warming', logger);
  
  await withScheduledErrorHandling(async () => {
    const storageService = createStorageService(env, new Request('http://localhost'));
    const performanceMonitor = createPerformanceMonitor(logger);
    const cacheManager = createCacheManager(storageService, logger, performanceMonitor);
    
    logger.info('Starting cache warming');
    
    // Warm cache for all installations
    const result = await withTimeout(
      () => cacheManager.warmCacheForAllInstallations(),
      300000, // 5 minutes timeout
      'cache-warming'
    );
    
    // Track performance
    performanceMonitor.trackScheduledTask({
      taskName: 'cache-warming',
      cron: controller.cron,
      duration: result.duration,
      success: result.success,
      attempt: 1,
      timestamp: Date.now()
    });
    
    logger.info('Cache warming completed', {
      success: result.success,
      warmedInstallations: result.warmedInstallations,
      errors: result.errors.length,
      duration: result.duration
    });
    
    if (!result.success && result.errors.length > 0) {
      logger.warn('Cache warming had errors but continuing', {
        errors: result.errors
      });
    }
  }, context);
}

async function handleMonthlyMaintenance(
  controller: ScheduledController,
  env: Env,
  logger: ReturnType<typeof createLogger>
): Promise<void> {
  const context = createScheduledContext(controller, 'monthly-maintenance', logger);
  
  await withScheduledErrorHandling(async () => {
    const storageService = createStorageService(env, new Request('http://localhost'));
    const performanceMonitor = createPerformanceMonitor(logger);
    const cacheManager = createCacheManager(storageService, logger, performanceMonitor);
    
    logger.info('Starting monthly maintenance');
    
    // Perform cache optimization
    const optimizationResult = await withTimeout(
      () => cacheManager.optimizeCache(),
      600000, // 10 minutes timeout
      'monthly-maintenance'
    );
    
    // Generate performance report
    const performanceReport = performanceMonitor.generateReport();
    
    // Log performance metrics
    performanceMonitor.logPerformanceMetrics();
    
    // Track performance
    performanceMonitor.trackScheduledTask({
      taskName: 'monthly-maintenance',
      cron: controller.cron,
      duration: optimizationResult.duration,
      success: optimizationResult.errors.length === 0,
      attempt: 1,
      timestamp: Date.now()
    });
    
    logger.info('Monthly maintenance completed', {
      optimization: {
        cleaned: optimizationResult.cleaned,
        optimized: optimizationResult.optimized,
        errors: optimizationResult.errors.length
      },
      performanceReport,
      duration: optimizationResult.duration
    });
    
    if (optimizationResult.errors.length > 0) {
      logger.warn('Monthly maintenance had errors', {
        errors: optimizationResult.errors
      });
    }
  }, context);
}

async function handleHealthCheck(
  controller: ScheduledController,
  env: Env,
  logger: ReturnType<typeof createLogger>
): Promise<void> {
  const context = createScheduledContext(controller, 'health-check', logger);
  
  await withScheduledErrorHandling(async () => {
    const storageService = createStorageService(env, new Request('http://localhost'));
    const performanceMonitor = createPerformanceMonitor(logger);
    const cacheManager = createCacheManager(storageService, logger, performanceMonitor);
    
    logger.debug('Starting health check');
    
    // Perform health check
    const healthResult = await withTimeout(
      () => cacheManager.performHealthCheck(),
      30000, // 30 seconds timeout
      'health-check'
    );
    
    // Get basic statistics
    const stats = await cacheManager.getCacheStatistics();
    
    // Track performance
    performanceMonitor.trackScheduledTask({
      taskName: 'health-check',
      cron: controller.cron,
      duration: 1000, // Health check duration is very short
      success: healthResult.healthy,
      attempt: 1,
      timestamp: Date.now()
    });
    
    if (healthResult.healthy) {
      logger.debug('Health check passed', { stats });
    } else {
      logger.warn('Health check failed', {
        issues: healthResult.issues,
        stats
      });
    }
  }, context, {
    maxRetries: 1, // Health checks should be quick and not retry much
    baseDelay: 1000,
    maxDelay: 5000,
    backoffFactor: 2
  });
}