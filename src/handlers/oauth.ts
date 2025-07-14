import { SlackOAuthResponse, SlackInstallation } from '../types';
import { createLogger } from '../utils/logger';
import { AppError } from '../middleware/error-handler';
import { createStorageService } from '../utils/storage';
import { Env } from '../index';

export async function handleOAuthRedirect(
  request: Request,
  env: Env,
  _ctx: ExecutionContext
): Promise<Response> {
  const logger = createLogger(request);
  logger.info('Received OAuth redirect request');

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    logger.error('OAuth error received', { error });
    return new Response(`OAuth Error: ${error}`, { status: 400 });
  }

  if (!code) {
    logger.error('No authorization code received');
    throw new AppError('Missing authorization code', 400);
  }

  if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) {
    logger.error('Missing Slack OAuth credentials');
    throw new AppError('OAuth not configured', 500);
  }

  try {
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: env.SLACK_CLIENT_ID,
        client_secret: env.SLACK_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData: SlackOAuthResponse = await tokenResponse.json();

    if (!tokenData.ok) {
      logger.error('OAuth token exchange failed', { response: tokenData });
      throw new AppError('Failed to exchange authorization code', 400);
    }

    logger.info('OAuth successful', { 
      teamId: tokenData.team.id,
      appId: tokenData.app_id 
    });

    // Store installation data in KV
    try {
      const storageService = createStorageService(env, request);
      
      const installation: SlackInstallation = {
        teamId: tokenData.team.id,
        accessToken: tokenData.access_token,
        botToken: tokenData.access_token, // In OAuth v2, this is the bot token
        installedAt: Date.now(),
      };

      await storageService.storeInstallation(tokenData.team.id, installation);
      logger.info('Installation data stored successfully', { teamId: tokenData.team.id });
    } catch (storageError) {
      logger.error('Failed to store installation data', { 
        teamId: tokenData.team.id, 
        error: storageError 
      });
      // Continue with success response even if storage fails
      // This prevents blocking the OAuth flow
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Installation Complete</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: #2eb886; }
          </style>
        </head>
        <body>
          <h1 class="success">✅ Installation Complete!</h1>
          <p>Dwell Birthday Calendar has been successfully installed to your Slack workspace.</p>
          <p>You can now:</p>
          <ul style="text-align: left; display: inline-block;">
            <li>Use the <code>/birthdays</code> command in any channel</li>
            <li>Visit the app's home tab to see upcoming birthdays</li>
          </ul>
          <p><a href="slack://app?team=${tokenData.team.id}&id=${tokenData.app_id}">Open in Slack</a></p>
        </body>
      </html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });

  } catch (error) {
    logger.error('OAuth flow failed', { error });
    throw new AppError('OAuth flow failed', 500);
  }
}