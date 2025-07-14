import { Logger, createLogger } from '../utils/logger';
import { verifySlackRequest } from '../middleware/slack-verification';
import { AppError } from '../middleware/error-handler';
import { Env } from '../index';
import { HandlerContext, StandardResponse, withErrorHandling, toWebResponse } from '../utils/handler-utils';

export interface BaseHandlerOptions {
  requireSignatureVerification?: boolean;
  customLogger?: Logger;
}

export abstract class BaseHandler {
  protected readonly options: BaseHandlerOptions;

  constructor(options: BaseHandlerOptions = {}) {
    this.options = {
      requireSignatureVerification: true,
      ...options
    };
  }

  /**
   * Main handler method that all handlers must implement
   */
  abstract handle(context: HandlerContext): Promise<StandardResponse>;

  /**
   * Process an incoming request with standardized setup
   */
  async processRequest(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    const logger = this.options.customLogger || createLogger(request);
    const context: HandlerContext = { env, logger, request };

    return withErrorHandling(context, async () => {
      // Verify Slack signature if required
      if (this.options.requireSignatureVerification) {
        const body = await request.text();
        if (!await verifySlackRequest(request, env, body)) {
          logger.warn('Invalid Slack signature');
          throw new AppError('Invalid request signature', 401);
        }
        // Clone request with the body for further processing
        context.request = new Request(request.url, {
          method: request.method,
          headers: request.headers,
          body
        });
      }

      const response = await this.handle(context);
      return toWebResponse(response);
    });
  }
}

/**
 * Base handler for Slack event-based handlers
 */
export abstract class BaseSlackHandler extends BaseHandler {
  constructor(options: BaseHandlerOptions = {}) {
    super({
      requireSignatureVerification: true,
      ...options
    });
  }

  /**
   * Parse request body and extract common Slack fields
   */
  protected async parseSlackPayload<T>(context: HandlerContext): Promise<T> {
    try {
      const body = await context.request.text();
      return JSON.parse(body);
    } catch (error) {
      context.logger.error('Failed to parse Slack payload', { error });
      throw new AppError('Invalid JSON payload', 400);
    }
  }
}

/**
 * Base handler for Slack command handlers
 */
export abstract class BaseSlackCommandHandler extends BaseHandler {
  constructor(options: BaseHandlerOptions = {}) {
    super({
      requireSignatureVerification: true,
      ...options
    });
  }

  /**
   * Parse form-encoded command payload
   */
  protected async parseCommandPayload(context: HandlerContext): Promise<Record<string, string>> {
    try {
      const body = await context.request.text();
      const formData = new URLSearchParams(body);
      
      const payload: Record<string, string> = {};
      for (const [key, value] of formData.entries()) {
        payload[key] = value;
      }
      
      return payload;
    } catch (error) {
      context.logger.error('Failed to parse command payload', { error });
      throw new AppError('Invalid form payload', 400);
    }
  }
}