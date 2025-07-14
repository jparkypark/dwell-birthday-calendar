import { SlackCommand } from '../types';
import { createLogger, Logger } from '../utils/logger';
import { verifySlackRequest } from '../middleware/slack-verification';
import { AppError } from '../middleware/error-handler';
import { validateSlackCommand } from '../utils/validation';
import { createStorageService } from '../utils/storage';
import { calculateUpcomingBirthdays, formatRelativeDate } from '../utils/dates';
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

  try {
    const storage = createStorageService(env);
    const birthdayData = await storage.getBirthdayData();
    
    if (!birthdayData.birthdays || birthdayData.birthdays.length === 0) {
      logger.info('No birthday data found');
      return createNoBirthdaysResponse();
    }

    const upcomingBirthdays = calculateUpcomingBirthdays(birthdayData.birthdays, 30);
    
    if (upcomingBirthdays.length === 0) {
      logger.info('No upcoming birthdays in next 30 days');
      return createNoUpcomingBirthdaysResponse();
    }

    logger.info('Found upcoming birthdays', { count: upcomingBirthdays.length });
    return createBirthdaysResponse(upcomingBirthdays);

  } catch (error) {
    const err = error as Error;
    logger.error('Error handling birthdays command', { error: err.message, stack: err.stack });
    
    return new Response(JSON.stringify({
      response_type: 'ephemeral',
      text: '❌ Sorry, I encountered an error while fetching birthday data. Please try again later.',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function createNoBirthdaysResponse(): Response {
  const response = {
    response_type: 'ephemeral' as const,
    text: '📅 No birthday data available',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '📅 *No Birthday Data Available*\n\nIt looks like no birthday information has been added yet. Please contact your workspace administrator to add birthday data.',
        },
      },
    ],
  };

  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function createNoUpcomingBirthdaysResponse(): Response {
  const response = {
    response_type: 'ephemeral' as const,
    text: '🎉 No upcoming birthdays in the next 30 days',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '🎉 *No Upcoming Birthdays*\n\nThere are no birthdays coming up in the next 30 days. Check back later!',
        },
      },
    ],
  };

  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' },
  });
}

interface SlackContextBlock {
  type: 'context';
  elements: Array<{
    type: 'mrkdwn' | 'plain_text';
    text: string;
  }>;
}

interface SlackSectionBlock {
  type: 'section';
  text: {
    type: 'mrkdwn' | 'plain_text';
    text: string;
  };
}

interface SlackDividerBlock {
  type: 'divider';
}

type SlackBlock = SlackContextBlock | SlackSectionBlock | SlackDividerBlock;

function createBirthdaysResponse(upcomingBirthdays: import('../types/birthday').UpcomingBirthday[]): Response {
  const blocks: SlackBlock[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🎂 *Upcoming Birthdays* 🎂\n\nHere are the next ${upcomingBirthdays.length} birthday${upcomingBirthdays.length > 1 ? 's' : ''} coming up:`,
      },
    },
    {
      type: 'divider',
    },
  ];

  // Group birthdays by date to show multiple people with the same birthday together
  const birthdayGroups: Record<string, typeof upcomingBirthdays> = {};
  
  for (const birthday of upcomingBirthdays) {
    const key = `${birthday.daysUntil}-${birthday.displayDate}`;
    if (!birthdayGroups[key]) {
      birthdayGroups[key] = [];
    }
    birthdayGroups[key].push(birthday);
  }

  // Sort groups by days until birthday
  const sortedGroups = Object.entries(birthdayGroups).sort(([a], [b]) => {
    const aDays = parseInt(a.split('-')[0]);
    const bDays = parseInt(b.split('-')[0]);
    return aDays - bDays;
  });

  for (const [, group] of sortedGroups) {
    const firstBirthday = group[0];
    const relativeDate = formatRelativeDate(firstBirthday.daysUntil);
    
    // Create list of names, with @mentions if Slack user IDs are available
    const namesList = group.map(birthday => 
      birthday.slackUserId ? `<@${birthday.slackUserId}>` : birthday.name
    ).join(', ');

    // Use appropriate emoji based on how soon the birthday is
    let emoji = '🎉';
    if (firstBirthday.daysUntil === 0) {
      emoji = '🎂';
    } else if (firstBirthday.daysUntil === 1) {
      emoji = '🎁';
    } else if (firstBirthday.daysUntil <= 7) {
      emoji = '📅';
    }

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${emoji} **${firstBirthday.displayDate}** (${relativeDate})\n${namesList}`,
      },
    });
  }

  // Add footer with total count
  blocks.push(
    {
      type: 'divider',
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `📊 Showing ${upcomingBirthdays.length} upcoming birthday${upcomingBirthdays.length > 1 ? 's' : ''} in the next 30 days`,
        },
      ],
    }
  );

  const response = {
    response_type: 'ephemeral' as const,
    text: `🎂 ${upcomingBirthdays.length} upcoming birthday${upcomingBirthdays.length > 1 ? 's' : ''}!`,
    blocks,
  };

  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' },
  });
}