import { Logger } from './logger';

export interface PerformanceMetrics {
  cacheHits: number;
  cacheMisses: number;
  totalCacheRequests: number;
  cacheHitRatio: number;
  averageResponseTime: number;
  totalRequests: number;
  errorCount: number;
  errorRate: number;
}

export interface CacheOperationMetrics {
  operation: string;
  key: string;
  duration: number;
  success: boolean;
  timestamp: number;
}

export interface ScheduledTaskMetrics {
  taskName: string;
  cron: string;
  duration: number;
  success: boolean;
  attempt: number;
  timestamp: number;
}

export class PerformanceMonitor {
  private metrics: Map<string, number> = new Map();
  private operationHistory: CacheOperationMetrics[] = [];
  private taskHistory: ScheduledTaskMetrics[] = [];
  private readonly maxHistorySize = 1000;

  constructor(private logger: Logger) {}

  // Cache performance tracking
  trackCacheHit(key: string, duration: number = 0): void {
    this.incrementMetric('cache.hits');
    this.incrementMetric('cache.total');
    
    this.recordCacheOperation({
      operation: 'hit',
      key,
      duration,
      success: true,
      timestamp: Date.now()
    });
  }

  trackCacheMiss(key: string, duration: number = 0): void {
    this.incrementMetric('cache.misses');
    this.incrementMetric('cache.total');
    
    this.recordCacheOperation({
      operation: 'miss',
      key,
      duration,
      success: true,
      timestamp: Date.now()
    });
  }

  trackCacheWrite(key: string, duration: number, success: boolean): void {
    this.incrementMetric('cache.writes');
    this.incrementMetric(success ? 'cache.writes.success' : 'cache.writes.failure');
    
    this.recordCacheOperation({
      operation: 'write',
      key,
      duration,
      success,
      timestamp: Date.now()
    });
  }

  trackCacheDelete(key: string, duration: number, success: boolean): void {
    this.incrementMetric('cache.deletes');
    this.incrementMetric(success ? 'cache.deletes.success' : 'cache.deletes.failure');
    
    this.recordCacheOperation({
      operation: 'delete',
      key,
      duration,
      success,
      timestamp: Date.now()
    });
  }

  // Request performance tracking
  trackRequest(duration: number, success: boolean): void {
    this.incrementMetric('requests.total');
    this.incrementMetric(success ? 'requests.success' : 'requests.failure');
    this.addToAverage('requests.duration', duration);
  }

  // Scheduled task performance tracking
  trackScheduledTask(metrics: ScheduledTaskMetrics): void {
    this.incrementMetric(`scheduled.${metrics.taskName}.total`);
    this.incrementMetric(
      metrics.success 
        ? `scheduled.${metrics.taskName}.success` 
        : `scheduled.${metrics.taskName}.failure`
    );
    this.addToAverage(`scheduled.${metrics.taskName}.duration`, metrics.duration);
    
    this.recordScheduledTask(metrics);
  }

  // Get performance statistics
  getPerformanceMetrics(): PerformanceMetrics {
    const cacheHits = this.getMetric('cache.hits');
    const cacheMisses = this.getMetric('cache.misses');
    const totalCacheRequests = cacheHits + cacheMisses;
    const totalRequests = this.getMetric('requests.total');
    const errorCount = this.getMetric('requests.failure');

    return {
      cacheHits,
      cacheMisses,
      totalCacheRequests,
      cacheHitRatio: totalCacheRequests > 0 ? cacheHits / totalCacheRequests : 0,
      averageResponseTime: this.getMetric('requests.duration'),
      totalRequests,
      errorCount,
      errorRate: totalRequests > 0 ? errorCount / totalRequests : 0
    };
  }

  getCacheOperationHistory(limit: number = 100): CacheOperationMetrics[] {
    return this.operationHistory.slice(-limit);
  }

  getScheduledTaskHistory(limit: number = 100): ScheduledTaskMetrics[] {
    return this.taskHistory.slice(-limit);
  }

  // Generate performance report
  generateReport(): object {
    const metrics = this.getPerformanceMetrics();
    const recentOperations = this.getCacheOperationHistory(50);
    const recentTasks = this.getScheduledTaskHistory(20);

    return {
      timestamp: new Date().toISOString(),
      metrics,
      recentCacheOperations: recentOperations,
      recentScheduledTasks: recentTasks,
      summary: {
        healthStatus: this.getHealthStatus(metrics),
        recommendations: this.getRecommendations(metrics)
      }
    };
  }

  // Log performance metrics
  logPerformanceMetrics(): void {
    const metrics = this.getPerformanceMetrics();
    
    this.logger.info('Performance metrics', {
      cacheHitRatio: Math.round(metrics.cacheHitRatio * 100) / 100,
      averageResponseTime: Math.round(metrics.averageResponseTime),
      totalRequests: metrics.totalRequests,
      errorRate: Math.round(metrics.errorRate * 100) / 100,
      cacheOperations: {
        hits: metrics.cacheHits,
        misses: metrics.cacheMisses,
        total: metrics.totalCacheRequests
      }
    });
  }

  // Reset metrics (useful for testing or periodic resets)
  resetMetrics(): void {
    this.metrics.clear();
    this.operationHistory = [];
    this.taskHistory = [];
    this.logger.info('Performance metrics reset');
  }

  private incrementMetric(key: string): void {
    this.metrics.set(key, (this.metrics.get(key) || 0) + 1);
  }

  private addToAverage(key: string, value: number): void {
    const countKey = `${key}.count`;
    const sumKey = `${key}.sum`;
    
    const currentCount = this.metrics.get(countKey) || 0;
    const currentSum = this.metrics.get(sumKey) || 0;
    
    this.metrics.set(countKey, currentCount + 1);
    this.metrics.set(sumKey, currentSum + value);
    this.metrics.set(key, (currentSum + value) / (currentCount + 1));
  }

  private getMetric(key: string): number {
    return this.metrics.get(key) || 0;
  }

  private recordCacheOperation(operation: CacheOperationMetrics): void {
    this.operationHistory.push(operation);
    
    if (this.operationHistory.length > this.maxHistorySize) {
      this.operationHistory = this.operationHistory.slice(-this.maxHistorySize);
    }
  }

  private recordScheduledTask(task: ScheduledTaskMetrics): void {
    this.taskHistory.push(task);
    
    if (this.taskHistory.length > this.maxHistorySize) {
      this.taskHistory = this.taskHistory.slice(-this.maxHistorySize);
    }
  }

  private getHealthStatus(metrics: PerformanceMetrics): string {
    if (metrics.errorRate > 0.1) return 'unhealthy';
    if (metrics.cacheHitRatio < 0.5) return 'degraded';
    if (metrics.averageResponseTime > 1000) return 'slow';
    return 'healthy';
  }

  private getRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];
    
    if (metrics.cacheHitRatio < 0.7) {
      recommendations.push('Consider increasing cache TTL or warming cache more frequently');
    }
    
    if (metrics.averageResponseTime > 500) {
      recommendations.push('Optimize response time - consider caching more data');
    }
    
    if (metrics.errorRate > 0.05) {
      recommendations.push('High error rate detected - investigate error patterns');
    }
    
    return recommendations;
  }
}

// Global performance monitor instance
let globalPerformanceMonitor: PerformanceMonitor | null = null;

export function createPerformanceMonitor(logger: Logger): PerformanceMonitor {
  if (!globalPerformanceMonitor) {
    globalPerformanceMonitor = new PerformanceMonitor(logger);
  }
  return globalPerformanceMonitor;
}

export function getPerformanceMonitor(): PerformanceMonitor | null {
  return globalPerformanceMonitor;
}