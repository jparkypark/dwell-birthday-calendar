import { createLogger, Logger } from '../utils/logger';
import { verifySlackRequest } from '../middleware/slack-verification';
import { AppError } from '../middleware/error-handler';
import { createStorageService } from '../utils/storage';
import { createSlackApiService } from '../services/slack-api';
import { createHomeViewGenerator } from '../services/home-view-generator';
import { SlackInteractivePayload, SlackHomeView } from '../types/slack';
import { Env } from '../index';

export async function handleSlackInteractive(
  request: Request,
  env: Env,
  _ctx: ExecutionContext
): Promise<Response> {
  const logger = createLogger(request);
  logger.info('Received Slack interactive request');

  const body = await request.text();
  
  if (!await verifySlackRequest(request, env, body)) {
    logger.warn('Invalid Slack signature');
    throw new AppError('Invalid request signature', 401);
  }

  let payload: SlackInteractivePayload;
  
  try {
    // Slack sends interactive payloads as form-encoded data
    const formData = new URLSearchParams(body);
    const payloadString = formData.get('payload');
    
    if (!payloadString) {
      throw new Error('No payload found in request');
    }
    
    payload = JSON.parse(payloadString);
  } catch (error) {
    logger.error('Failed to parse interactive payload', { error });
    throw new AppError('Invalid payload format', 400);
  }

  logger.info('Processing interactive payload', { 
    type: payload.type,
    userId: payload.user.id,
    teamId: payload.team.id,
    actions: payload.actions?.map(a => a.action_id)
  });

  switch (payload.type) {
    case 'block_actions':
      return await handleBlockActions(payload, env, logger, request);
    
    default:
      logger.warn('Unhandled interactive type', { type: payload.type });
      return new Response('OK', { status: 200 });
  }
}

async function handleBlockActions(
  payload: SlackInteractivePayload,
  env: Env,
  logger: Logger,
  request: Request
): Promise<Response> {
  if (!payload.actions || payload.actions.length === 0) {
    logger.warn('No actions found in block_actions payload');
    return new Response('OK', { status: 200 });
  }

  const action = payload.actions[0];
  logger.info('Handling block action', { 
    actionId: action.action_id,
    userId: payload.user.id,
    teamId: payload.team.id
  });

  try {
    const storageService = createStorageService(env, request);
    const installation = await storageService.getInstallation(payload.team.id);
    
    if (!installation) {
      logger.warn('No installation found for team', { teamId: payload.team.id });
      return new Response('OK', { status: 200 });
    }

    const slackApi = createSlackApiService(logger);
    const homeViewGenerator = createHomeViewGenerator(logger);

    switch (action.action_id) {
      case 'refresh_home_view':
        await handleRefreshHomeView(
          payload, 
          storageService, 
          installation, 
          slackApi, 
          homeViewGenerator,
          logger
        );
        break;
      
      case 'show_expanded_view':
        await handleShowExpandedView(
          payload, 
          storageService, 
          installation, 
          slackApi, 
          homeViewGenerator,
          logger
        );
        break;
      
      case 'show_compact_view':
        await handleShowCompactView(
          payload, 
          storageService, 
          installation, 
          slackApi, 
          homeViewGenerator,
          logger
        );
        break;
      
      default:
        logger.warn('Unknown action ID', { actionId: action.action_id });
        break;
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    logger.error('Error handling block action', { 
      actionId: action.action_id,
      userId: payload.user.id,
      teamId: payload.team.id,
      error 
    });
    
    // Try to show error view to user
    try {
      const installation = await createStorageService(env, request).getInstallation(payload.team.id);
      if (installation) {
        const homeViewGenerator = createHomeViewGenerator(logger);
        const errorView = homeViewGenerator.generateErrorView(
          error instanceof Error ? error.message : 'Unknown error'
        );
        
        const slackApi = createSlackApiService(logger);
        await slackApi.publishHomeView(installation, payload.user.id, errorView as SlackHomeView);
      }
    } catch (errorViewError) {
      logger.error('Failed to show error view', { errorViewError });
    }
    
    return new Response('OK', { status: 200 });
  }
}

async function handleRefreshHomeView(
  payload: SlackInteractivePayload,
  storageService: import('../utils/storage').StorageService,
  installation: import('../types/slack').SlackInstallation,
  slackApi: import('../services/slack-api').SlackApiService,
  homeViewGenerator: import('../services/home-view-generator').HomeViewGenerator,
  logger: Logger
): Promise<void> {
  logger.info('Refreshing home view', { 
    userId: payload.user.id,
    teamId: payload.team.id
  });

  // Clear cached view and regenerate
  await storageService.clearCachedHomeView();
  
  const birthdayData = await storageService.getBirthdayData();
  const homeView = homeViewGenerator.generateHomeView(birthdayData.birthdays);

  // Cache the new view
  await storageService.storeCachedHomeView(homeView, 3600);

  // Publish the refreshed view
  await slackApi.publishHomeView(installation, payload.user.id, homeView);

  logger.info('Home view refreshed successfully', {
    userId: payload.user.id,
    teamId: payload.team.id,
    birthdayCount: birthdayData.birthdays.length
  });
}

async function handleShowExpandedView(
  payload: SlackInteractivePayload,
  storageService: import('../utils/storage').StorageService,
  installation: import('../types/slack').SlackInstallation,
  slackApi: import('../services/slack-api').SlackApiService,
  homeViewGenerator: import('../services/home-view-generator').HomeViewGenerator,
  logger: Logger
): Promise<void> {
  logger.info('Showing expanded view', { 
    userId: payload.user.id,
    teamId: payload.team.id
  });

  const birthdayData = await storageService.getBirthdayData();
  const homeView = homeViewGenerator.generateHomeView(birthdayData.birthdays, true);

  // Publish the expanded view (don't cache expanded views)
  await slackApi.publishHomeView(installation, payload.user.id, homeView);

  logger.info('Expanded view shown successfully', {
    userId: payload.user.id,
    teamId: payload.team.id,
    birthdayCount: birthdayData.birthdays.length
  });
}

async function handleShowCompactView(
  payload: SlackInteractivePayload,
  storageService: import('../utils/storage').StorageService,
  installation: import('../types/slack').SlackInstallation,
  slackApi: import('../services/slack-api').SlackApiService,
  homeViewGenerator: import('../services/home-view-generator').HomeViewGenerator,
  logger: Logger
): Promise<void> {
  logger.info('Showing compact view', { 
    userId: payload.user.id,
    teamId: payload.team.id
  });

  const birthdayData = await storageService.getBirthdayData();
  const homeView = homeViewGenerator.generateHomeView(birthdayData.birthdays, false);

  // Publish the compact view
  await slackApi.publishHomeView(installation, payload.user.id, homeView);

  logger.info('Compact view shown successfully', {
    userId: payload.user.id,
    teamId: payload.team.id,
    birthdayCount: birthdayData.birthdays.length
  });
}