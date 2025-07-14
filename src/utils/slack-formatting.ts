import { UpcomingBirthday } from '../types/birthday';
import { formatRelativeDate } from './dates';
import { DATE_CONSTANTS, BUSINESS_RULES } from '../config';

export interface SlackBlock {
  type: 'section' | 'divider' | 'context';
  text?: {
    type: 'mrkdwn' | 'plain_text';
    text: string;
  };
  elements?: Array<{
    type: 'mrkdwn' | 'plain_text';
    text: string;
  }>;
}

export interface SlackResponse {
  response_type: 'ephemeral' | 'in_channel';
  text: string;
  blocks?: SlackBlock[];
}

/**
 * Groups birthdays by their date to show multiple people with the same birthday together
 */
export function groupBirthdaysByDate(birthdays: UpcomingBirthday[]): Record<string, UpcomingBirthday[]> {
  const birthdayGroups: Record<string, UpcomingBirthday[]> = {};
  
  for (const birthday of birthdays) {
    const key = `${birthday.daysUntil}-${birthday.displayDate}`;
    if (!birthdayGroups[key]) {
      birthdayGroups[key] = [];
    }
    birthdayGroups[key].push(birthday);
  }
  
  return birthdayGroups;
}

/**
 * Sorts birthday groups by days until birthday
 */
export function sortBirthdayGroups(birthdayGroups: Record<string, UpcomingBirthday[]>): [string, UpcomingBirthday[]][] {
  return Object.entries(birthdayGroups).sort(([a], [b]) => {
    const aDays = parseInt(a.split('-')[0]);
    const bDays = parseInt(b.split('-')[0]);
    return aDays - bDays;
  });
}

/**
 * Formats a list of names with proper Slack mentions
 */
export function formatNamesList(birthdays: UpcomingBirthday[]): string {
  return birthdays.map(birthday => 
    birthday.slackUserId ? `<@${birthday.slackUserId}>` : birthday.name
  ).join(', ');
}

/**
 * Gets appropriate emoji based on how soon the birthday is
 */
export function getBirthdayEmoji(daysUntil: number): string {
  if (daysUntil === 0) {
    return '🎂';
  } else if (daysUntil === 1) {
    return '🎁';
  } else if (daysUntil <= DATE_CONSTANTS.DAYS_PER_WEEK) {
    return '📅';
  } else {
    return '🎉';
  }
}

/**
 * Creates header block for birthday responses
 */
export function createBirthdayHeaderBlock(count: number): SlackBlock[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🎂 *Upcoming Birthdays* 🎂\n\nHere are the next ${count} birthday${count > 1 ? 's' : ''} coming up:`,
      },
    },
    {
      type: 'divider',
    },
  ];
}

/**
 * Creates footer block for birthday responses
 */
export function createBirthdayFooterBlock(count: number): SlackBlock[] {
  return [
    {
      type: 'divider',
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `📊 Showing ${count} upcoming birthday${count > 1 ? 's' : ''} in the next ${BUSINESS_RULES.DEFAULT_UPCOMING_DAYS} days`,
        },
      ],
    }
  ];
}

/**
 * Creates a birthday section block for a group of birthdays on the same date
 */
export function createBirthdayGroupBlock(group: UpcomingBirthday[]): SlackBlock {
  const firstBirthday = group[0];
  const relativeDate = formatRelativeDate(firstBirthday.daysUntil);
  const namesList = formatNamesList(group);
  const emoji = getBirthdayEmoji(firstBirthday.daysUntil);

  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `${emoji} **${firstBirthday.displayDate}** (${relativeDate})\n${namesList}`,
    },
  };
}

/**
 * Creates a complete Slack response for upcoming birthdays
 */
export function createBirthdaysSlackResponse(upcomingBirthdays: UpcomingBirthday[]): SlackResponse {
  const blocks: SlackBlock[] = [];
  
  // Add header
  blocks.push(...createBirthdayHeaderBlock(upcomingBirthdays.length));
  
  // Group and sort birthdays
  const birthdayGroups = groupBirthdaysByDate(upcomingBirthdays);
  const sortedGroups = sortBirthdayGroups(birthdayGroups);
  
  // Add birthday groups
  for (const [, group] of sortedGroups) {
    blocks.push(createBirthdayGroupBlock(group));
  }
  
  // Add footer
  blocks.push(...createBirthdayFooterBlock(upcomingBirthdays.length));
  
  return {
    response_type: 'ephemeral',
    text: `🎂 ${upcomingBirthdays.length} upcoming birthday${upcomingBirthdays.length > 1 ? 's' : ''}!`,
    blocks,
  };
}

/**
 * Creates standard Slack error response
 */
export function createSlackErrorResponse(message: string): SlackResponse {
  return {
    response_type: 'ephemeral',
    text: `❌ ${message}`,
  };
}

/**
 * Creates standard Slack info response
 */
export function createSlackInfoResponse(title: string, message: string): SlackResponse {
  return {
    response_type: 'ephemeral',
    text: title,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${title}\n\n${message}`,
        },
      },
    ],
  };
}