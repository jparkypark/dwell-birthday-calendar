import { SlackCommand } from '../types';
import { createLogger, Logger } from '../utils/logger';
import { verifySlackRequest } from '../middleware/slack-verification';
import { AppError } from '../middleware/error-handler';
import { validateSlackCommand } from '../utils/validation';
import { Env } from '../index';

export async function handleSlackCommands(
  request: Request,
  env: Env,
  _ctx: ExecutionContext
): Promise<Response> {
  const logger = createLogger(request);
  logger.info('Received Slack command request');

  const body = await request.text();
  
  if (!await verifySlackRequest(request, env, body)) {
    logger.warn('Invalid Slack signature');
    throw new AppError('Invalid request signature', 401);
  }

  const formData = new URLSearchParams(body);
  const command: SlackCommand = {
    token: formData.get('token') || '',
    team_id: formData.get('team_id') || '',
    team_domain: formData.get('team_domain') || '',
    channel_id: formData.get('channel_id') || '',
    channel_name: formData.get('channel_name') || '',
    user_id: formData.get('user_id') || '',
    user_name: formData.get('user_name') || '',
    command: formData.get('command') || '',
    text: formData.get('text') || '',
    response_url: formData.get('response_url') || '',
    trigger_id: formData.get('trigger_id') || '',
  };

  validateSlackCommand(command);

  logger.info('Processing Slack command', { 
    command: command.command,
    userId: command.user_id,
    teamId: command.team_id 
  });

  switch (command.command) {
    case '/birthdays':
      return await handleBirthdaysCommand(command, env, logger);
    
    default:
      logger.warn('Unknown command', { command: command.command });
      return new Response(JSON.stringify({
        response_type: 'ephemeral',
        text: 'Unknown command. Use `/birthdays` to see upcoming birthdays.',
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
  }
}

async function handleBirthdaysCommand(
  command: SlackCommand,
  env: Env,
  logger: Logger
): Promise<Response> {
  logger.info('Handling /birthdays command', { userId: command.user_id });

  const response = {
    response_type: 'ephemeral' as const,
    text: 'Here are the upcoming birthdays! 🎉',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '🎂 *Upcoming Birthdays* 🎂\n\n_Birthday data will be loaded here once the data layer is implemented._',
        },
      },
    ],
  };

  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' },
  });
}