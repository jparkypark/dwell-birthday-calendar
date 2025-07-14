import { SlackEvent, SlackVerificationRequest } from '../types';
import { createLogger, Logger } from '../utils/logger';
import { verifySlackRequest } from '../middleware/slack-verification';
import { AppError } from '../middleware/error-handler';
import { Env } from '../index';

export async function handleSlackEvents(
  request: Request,
  env: Env,
  ctx: ExecutionContext
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
      return await handleAppHomeOpened(slackEvent, env, logger);
    
    default:
      logger.warn('Unhandled event type', { eventType: slackEvent.event.type });
      return new Response('OK', { status: 200 });
  }
}

async function handleAppHomeOpened(
  event: SlackEvent,
  env: Env,
  logger: Logger
): Promise<Response> {
  logger.info('Handling app_home_opened event', { 
    userId: event.event.user,
    tab: event.event.tab 
  });

  if (event.event.tab !== 'home') {
    return new Response('OK', { status: 200 });
  }

  return new Response('OK', { status: 200 });
}