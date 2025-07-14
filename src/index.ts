import { handleSlackEvents } from './handlers/slack-events';
import { handleSlackCommands } from './handlers/slack-commands';
import { handleOAuthRedirect } from './handlers/oauth';

export interface Env {
  BIRTHDAY_KV?: KVNamespace;
  SLACK_SIGNING_SECRET?: string;
  SLACK_CLIENT_ID?: string;
  SLACK_CLIENT_SECRET?: string;
  ADMIN_PASSWORD?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    // Health check endpoint
    if (pathname === '/health' && method === 'GET') {
      return new Response(JSON.stringify({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        url: request.url,
        domain: url.hostname,
        method: method,
        pathname: pathname
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Root endpoint
    if (pathname === '/' && method === 'GET') {
      return new Response('Dwell Birthday Calendar Worker is running!', {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Slack events endpoint
    if (pathname === '/slack/events' && method === 'POST') {
      try {
        return await handleSlackEvents(request, env, ctx);
      } catch (error) {
        console.error('Error in slack events handler:', error);
        return new Response('Internal Server Error', { status: 500 });
      }
    }

    // Slack commands endpoint
    if (pathname === '/slack/commands' && method === 'POST') {
      try {
        return await handleSlackCommands(request, env, ctx);
      } catch (error) {
        console.error('Error in slack commands handler:', error);
        return new Response('Internal Server Error', { status: 500 });
      }
    }

    // OAuth redirect endpoint  
    if (pathname === '/oauth/redirect' && method === 'GET') {
      try {
        return await handleOAuthRedirect(request, env, ctx);
      } catch (error) {
        console.error('Error in OAuth handler:', error);
        return new Response('OAuth Error', { status: 500 });
      }
    }

    // Debug info for unmatched routes
    return new Response(JSON.stringify({
      message: 'Not Found',
      pathname: pathname,
      method: method,
      url: request.url
    }), { 
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  },
};