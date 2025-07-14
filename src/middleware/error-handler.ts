import { Logger } from '../utils/logger';

export interface ErrorResponse {
  error: string;
  message: string;
  timestamp: string;
  requestId?: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
  }
}

export function createErrorResponse(
  error: Error | AppError,
  requestId?: string
): Response {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  
  const errorResponse: ErrorResponse = {
    error: error.name || 'InternalServerError',
    message: error.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    ...(requestId && { requestId }),
  };

  return new Response(JSON.stringify(errorResponse), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function withErrorHandling(
  handler: (request: Request, env: any, ctx: ExecutionContext) => Promise<Response>,
  logger?: Logger
) {
  return async (request: Request, env: any, ctx: ExecutionContext): Promise<Response> => {
    try {
      return await handler(request, env, ctx);
    } catch (error) {
      const err = error as Error;
      const requestId = logger?.['requestId'];
      
      if (logger) {
        logger.error('Unhandled error in request handler', {
          error: err.message,
          stack: err.stack,
          url: request.url,
          method: request.method,
        });
      }

      return createErrorResponse(err, requestId);
    }
  };
}