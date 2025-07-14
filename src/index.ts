import { Router } from 'itty-router';

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

router.all('*', () => {
  return new Response('Not Found', { status: 404 });
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return router.handle(request, env, ctx);
  },
};