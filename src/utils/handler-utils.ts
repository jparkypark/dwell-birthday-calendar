import { Logger } from '../utils/logger';
import { AppError } from '../middleware/error-handler';
import { Env } from '../index';

export interface HandlerContext {
  env: Env;
  logger: Logger;
  request: Request;
}

export interface StandardResponse {
  status: number;
  headers?: Record<string, string>;
  body?: string;
}

/**
 * Standard response builders for consistent HTTP responses
 */
export class ResponseBuilder {
  static ok(body?: string): StandardResponse {
    return {
      status: 200,
      body: body || 'OK',
      headers: { 'Content-Type': 'text/plain' }
    };
  }

  static json(data: unknown, status: number = 200): StandardResponse {
    return {
      status,
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  static ephemeralSlackResponse(text: string, blocks?: unknown[]): StandardResponse {
    return this.json({
      response_type: 'ephemeral',
      text,
      ...(blocks && { blocks })
    });
  }

  static error(message: string, status: number = 500): StandardResponse {
    return {
      status,
      body: message,
      headers: { 'Content-Type': 'text/plain' }
    };
  }
}

/**
 * Executes a handler function with standardized error handling
 */
export async function withErrorHandling<T>(
  context: HandlerContext,
  handler: () => Promise<T>
): Promise<T> {
  try {
    return await handler();
  } catch (error) {
    context.logger.error('Handler error', { error });
    
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError('Internal server error', 500);
  }
}

/**
 * Validates and parses request body as JSON
 */
export async function parseJsonBody<T>(request: Request, logger: Logger): Promise<T> {
  try {
    const text = await request.text();
    return JSON.parse(text);
  } catch (error) {
    logger.error('Failed to parse request body', { error });
    throw new AppError('Invalid JSON payload', 400);
  }
}

/**
 * Converts StandardResponse to Response object
 */
export function toWebResponse(response: StandardResponse): Response {
  return new Response(response.body, {
    status: response.status,
    headers: response.headers
  });
}