import { AppError } from './error-handler';
import { Logger } from '../utils/logger';

// Type definition for Cloudflare Workers ScheduledController
interface ScheduledController {
  scheduledTime: number;
  cron: string;
}

export class ScheduledTaskError extends AppError {
  constructor(
    message: string,
    public readonly cron: string,
    public readonly taskName: string,
    statusCode: number = 500
  ) {
    super(message, statusCode);
    this.name = 'ScheduledTaskError';
  }
}

export interface ScheduledContext {
  cron: string;
  scheduledTime: number;
  taskName: string;
  logger: Logger;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2
};

export async function withScheduledErrorHandling<T>(
  task: () => Promise<T>,
  context: ScheduledContext,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  const { logger, cron, taskName } = context;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const startTime = Date.now();
      
      logger.info('Scheduled task attempt', {
        taskName,
        cron,
        attempt,
        maxRetries: retryConfig.maxRetries
      });

      const result = await task();
      
      logger.info('Scheduled task completed successfully', {
        taskName,
        cron,
        attempt,
        duration: Date.now() - startTime
      });

      return result;
    } catch (error) {
      lastError = error as Error;
      
      logger.warn('Scheduled task attempt failed', {
        taskName,
        cron,
        attempt,
        error: lastError.message,
        stack: lastError.stack
      });

      if (attempt < retryConfig.maxRetries) {
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffFactor, attempt),
          retryConfig.maxDelay
        );
        
        logger.info('Retrying scheduled task', {
          taskName,
          cron,
          attempt,
          delayMs: delay
        });

        await new Promise(resolve => globalThis.setTimeout(resolve, delay));
      }
    }
  }

  // All retries exhausted
  logger.error('Scheduled task failed after all retries', {
    taskName,
    cron,
    maxRetries: retryConfig.maxRetries,
    finalError: lastError?.message,
    stack: lastError?.stack
  });

  throw new ScheduledTaskError(
    `Task '${taskName}' failed after ${retryConfig.maxRetries} retries: ${lastError?.message}`,
    cron,
    taskName
  );
}

export async function withTimeout<T>(
  task: () => Promise<T>,
  timeoutMs: number,
  taskName: string
): Promise<T> {
  return Promise.race([
    task(),
    new Promise<T>((_, reject) => {
      globalThis.setTimeout(() => {
        reject(new Error(`Task '${taskName}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    })
  ]);
}

export function createScheduledContext(
  controller: ScheduledController,
  taskName: string,
  logger: Logger
): ScheduledContext {
  return {
    cron: controller.cron,
    scheduledTime: controller.scheduledTime,
    taskName,
    logger
  };
}