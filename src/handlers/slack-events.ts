import { SlackEvent, SlackVerificationRequest } from '../types';
import { SlackHomeView } from '../types/slack';
import { createLogger, Logger } from '../utils/logger';
import { verifySlackRequest } from '../middleware/slack-verification';
import { createStorageService } from '../utils/storage';
import { AppError } from '../middleware/error-handler';
import { validateSlackEvent, validateUrlVerification } from '../utils/validation';
import { createSlackApiService } from '../services/slack-api';
import { createHomeViewGenerator } from '../services/home-view-generator';
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
    
    validateUrlVerification(payload);
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

  validateSlackEvent(payload);
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

    logger.info('Installation verified, generating home view', {
      teamId: event.team_id,
      userId: event.event.user
    });

    // Check for cached home view first
    const cachedView = await storageService.getCachedHomeView();
    if (cachedView) {
      logger.info('Using cached home view');
      
      const slackApi = createSlackApiService(logger);
      await slackApi.publishHomeView(
        installation,
        event.event.user,
        cachedView as SlackHomeView
      );
      
      return new Response('OK', { status: 200 });
    }

    // Generate new home view
    const birthdayData = await storageService.getBirthdayData();
    const homeViewGenerator = createHomeViewGenerator(logger);
    const homeView = homeViewGenerator.generateHomeView(birthdayData.birthdays);

    // Cache the view for 1 hour
    await storageService.storeCachedHomeView(homeView, 3600);

    // Publish the view to Slack
    const slackApi = createSlackApiService(logger);
    await slackApi.publishHomeView(installation, event.event.user, homeView);

    logger.info('Home view published successfully', {
      teamId: event.team_id,
      userId: event.event.user,
      birthdayCount: birthdayData.birthdays.length
    });
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    logger.error('Error handling app_home_opened', { 
      teamId: event.team_id,
      error 
    });
    
    // Try to show error view to user
    try {
      const installation = await createStorageService(env, request).getInstallation(event.team_id);
      if (installation) {
        const homeViewGenerator = createHomeViewGenerator(logger);
        const errorView = homeViewGenerator.generateErrorView(
          error instanceof Error ? error.message : 'Unknown error'
        );
        
        const slackApi = createSlackApiService(logger);
        await slackApi.publishHomeView(installation, event.event.user, errorView);
      }
    } catch (errorViewError) {
      logger.error('Failed to show error view', { errorViewError });
    }
    
    return new Response('OK', { status: 200 });
  }
}