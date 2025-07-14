import { SlackEvent, SlackVerificationRequest } from '../types';
import { createLogger, Logger } from '../utils/logger';
import { verifySlackRequest } from '../middleware/slack-verification';
import { createStorageService } from '../utils/storage';
import { AppError } from '../middleware/error-handler';
import { Env } from '../index';

export async function handleSlackEvents(
  request: Request,
  env: Env,
  _ctx: ExecutionContext
): Promise<Response> {
  const logger = createLogger(request);
  logger.info('Received Slack event request');

  const body = await request.text();
  
  if (!await verifySlackRequest(request, env, body)) {
    logger.warn('Invalid Slack signature');
    throw new AppError('Invalid request signature', 401);
  }

  let payload: SlackEvent | SlackVerificationRequest;
  
  try {
    payload = JSON.parse(body);
  } catch (error) {
    logger.error('Failed to parse request body', { error });
    throw new AppError('Invalid JSON payload', 400);
  }

  if (payload.type === 'url_verification') {
    logger.info('Handling URL verification challenge');
    const verification = payload as SlackVerificationRequest;
    
    // Log challenge details for debugging
    logger.info('URL verification details', {
      challenge: verification.challenge?.substring(0, 10) + '...',
      token: verification.token?.substring(0, 10) + '...'
    });
    
    return new Response(verification.challenge, {
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const slackEvent = payload as SlackEvent;
  logger.info('Processing Slack event', { 
    eventType: slackEvent.event.type,
    teamId: slackEvent.team_id 
  });

  switch (slackEvent.event.type) {
    case 'app_home_opened':
      return await handleAppHomeOpened(slackEvent, env, logger, request);
    
    default:
      logger.warn('Unhandled event type', { eventType: slackEvent.event.type });
      return new Response('OK', { status: 200 });
  }
}

async function handleAppHomeOpened(
  event: SlackEvent,
  env: Env,
  logger: Logger,
  request: Request
): Promise<Response> {
  logger.info('Handling app_home_opened event', { 
    userId: event.event.user,
    tab: event.event.tab,
    teamId: event.team_id
  });

  if (event.event.tab !== 'home') {
    logger.info('Ignoring non-home tab event');
    return new Response('OK', { status: 200 });
  }

  try {
    // Verify installation exists
    const storageService = createStorageService(env, request);
    const installation = await storageService.getInstallation(event.team_id);
    
    if (!installation) {
      logger.warn('No installation found for team', { teamId: event.team_id });
      return new Response('OK', { status: 200 });
    }

    logger.info('Installation verified, home tab will be updated', {
      teamId: event.team_id,
      userId: event.event.user
    });

    // TODO: In Phase 2, we'll implement actual home view generation here
    // For now, just log that we're ready to handle this event
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    logger.error('Error handling app_home_opened', { 
      teamId: event.team_id,
      error 
    });
    return new Response('OK', { status: 200 });
  }
}