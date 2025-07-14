import { Router } from 'itty-router';
import { handleSlackEvents } from './handlers/slack-events';
import { handleSlackCommands } from './handlers/slack-commands';
import { handleOAuthRedirect } from './handlers/oauth';
import { withErrorHandling } from './middleware/error-handler';
import { createLogger } from './utils/logger';
import { SLACK_ENDPOINTS } from './config/constants';

export interface Env {
  BIRTHDAY_KV?: KVNamespace;
  SLACK_SIGNING_SECRET?: string;
  SLACK_CLIENT_ID?: string;
  SLACK_CLIENT_SECRET?: string;
  ADMIN_PASSWORD?: string;
}

const router = Router();

router.get('/', () => {
  return new Response('Dwell Birthday Calendar Worker is running!', {
    headers: { 'Content-Type': 'text/plain' },
  });
});

router.get('/health', () => {
  return new Response(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

router.post(SLACK_ENDPOINTS.EVENTS, withErrorHandling(handleSlackEvents));
router.post(SLACK_ENDPOINTS.COMMANDS, withErrorHandling(handleSlackCommands));
router.get(SLACK_ENDPOINTS.OAUTH_REDIRECT, withErrorHandling(handleOAuthRedirect));

router.all('*', () => {
  return new Response('Not Found', { status: 404 });
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const logger = createLogger(request);
    logger.info('Processing request', { 
      method: request.method, 
      url: request.url 
    });

    return router.handle(request, env, ctx);
  },
};