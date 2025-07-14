import { Router } from 'itty-router';
import { handleSlackEvents } from './handlers/slack-events';
import { handleSlackCommands } from './handlers/slack-commands';
import { handleOAuthRedirect } from './handlers/oauth';
import { createLogger } from './utils/logger';
import { createErrorResponse } from './middleware/error-handler';
import { validateEnvironmentVariables } from './utils/validation';

export interface Env {
  BIRTHDAY_KV?: KVNamespace;
  SLACK_SIGNING_SECRET?: string;
  SLACK_CLIENT_ID?: string;
  SLACK_CLIENT_SECRET?: string;
  ADMIN_PASSWORD?: string;
  [key: string]: unknown;
}

// Create router instance
const router = Router();

// Health check endpoint
router.get('/health', (request: Request) => {
  const url = new URL(request.url);
  return new Response(JSON.stringify({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    url: request.url,
    domain: url.hostname,
    method: request.method,
    pathname: url.pathname
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

// Root endpoint
router.get('/', () => {
  return new Response('Dwell Birthday Calendar Worker is running!', {
    headers: { 'Content-Type': 'text/plain' },
  });
});

// Slack events endpoint
router.post('/slack/events', async (request: Request, env: Env, ctx: ExecutionContext) => {
  const logger = createLogger(request);
  try {
    return await handleSlackEvents(request, env, ctx);
  } catch (error) {
    const err = error as Error;
    logger.error('Error in slack events handler', { error: err.message, stack: err.stack });
    return createErrorResponse(err, logger['requestId']);
  }
});

// Slack commands endpoint
router.post('/slack/commands', async (request: Request, env: Env, ctx: ExecutionContext) => {
  const logger = createLogger(request);
  try {
    return await handleSlackCommands(request, env, ctx);
  } catch (error) {
    const err = error as Error;
    logger.error('Error in slack commands handler', { error: err.message, stack: err.stack });
    return createErrorResponse(err, logger['requestId']);
  }
});

// OAuth redirect endpoint  
router.get('/oauth/redirect', async (request: Request, env: Env, ctx: ExecutionContext) => {
  const logger = createLogger(request);
  try {
    return await handleOAuthRedirect(request, env, ctx);
  } catch (error) {
    const err = error as Error;
    logger.error('Error in OAuth handler', { error: err.message, stack: err.stack });
    return createErrorResponse(err, logger['requestId']);
  }
});

// 404 handler for unmatched routes
router.all('*', (request: Request) => {
  const url = new URL(request.url);
  return new Response(JSON.stringify({
    message: 'Not Found',
    pathname: url.pathname,
    method: request.method,
    url: request.url
  }), { 
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const logger = createLogger(request);
    
    // Validate environment variables on first request
    try {
      validateEnvironmentVariables(env);
    } catch (error) {
      const err = error as Error;
      logger.error('Environment validation failed', { error: err.message });
      return createErrorResponse(err, logger['requestId']);
    }
    
    try {
      return await router.handle(request, env, ctx);
    } catch (error) {
      const err = error as Error;
      logger.error('Unhandled error in worker', { 
        error: err.message, 
        stack: err.stack,
        url: request.url,
        method: request.method 
      });
      return createErrorResponse(err, logger['requestId']);
    }
  },
};