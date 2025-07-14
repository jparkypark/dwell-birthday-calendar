import { Birthday, UpcomingBirthday } from '../types/birthday';
import { SlackHomeView, SlackHomeViewBlock, SlackHomeViewAction } from '../types/slack';
import { 
  calculateUpcomingBirthdays, 
  getTodaysBirthdays, 
  getBirthdayStats, 
  formatRelativeDate
} from '../utils/dates';
import { createLogger, Logger } from '../utils/logger';

export interface HomeViewState {
  hasData: boolean;
  todaysBirthdays: UpcomingBirthday[];
  upcomingBirthdays: UpcomingBirthday[];
  totalBirthdays: number;
  showExpanded: boolean;
}

export class HomeViewGenerator {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || createLogger();
  }

  /**
   * Generate a complete home view based on birthday data
   */
  generateHomeView(birthdays: Birthday[], expanded: boolean = false): SlackHomeView {
    this.logger.info('Generating home view', { 
      birthdayCount: birthdays.length,
      expanded 
    });

    if (!birthdays || birthdays.length === 0) {
      return this.generateWelcomeView();
    }

    const todaysBirthdays = getTodaysBirthdays(birthdays);
    const upcomingBirthdays = calculateUpcomingBirthdays(birthdays, expanded ? 90 : 30);
    const stats = getBirthdayStats(birthdays);

    const blocks: SlackHomeViewBlock[] = [];

    // Header
    blocks.push({
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🎂 Dwell Church Birthdays'
      }
    });

    // Today's birthdays (if any)
    if (todaysBirthdays.length > 0) {
      blocks.push(...this.generateTodaysBirthdaysSection(todaysBirthdays));
    }

    // Upcoming birthdays
    if (upcomingBirthdays.length > 0) {
      blocks.push(...this.generateUpcomingBirthdaysSection(upcomingBirthdays, expanded));
    } else {
      blocks.push(...this.generateNoUpcomingBirthdaysSection());
    }

    // Statistics section
    blocks.push(...this.generateStatsSection(stats));

    // Action buttons
    blocks.push(...this.generateActionButtons(expanded));

    this.logger.info('Home view generated successfully', { 
      blockCount: blocks.length,
      todaysBirthdays: todaysBirthdays.length,
      upcomingBirthdays: upcomingBirthdays.length
    });

    return {
      type: 'home',
      blocks
    };
  }

  /**
   * Generate welcome view for when no birthday data exists
   */
  generateWelcomeView(): SlackHomeView {
    this.logger.info('Generating welcome view (no birthday data)');

    return {
      type: 'home',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🎂 Dwell Church Birthdays'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '📅 *Welcome to Dwell Church Birthdays!*\n\nThis app helps you keep track of everyone\'s special day. Currently, no birthday information has been added yet.'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '🔧 *Getting Started*\n\n• Contact your workspace administrator to add birthday data\n• Once added, you\'ll see upcoming birthdays right here\n• Use the `/birthdays` command to see birthdays anywhere in Slack'
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '💡 *Tip: Use `/birthdays` to see upcoming birthdays from any channel*'
            }
          ]
        }
      ]
    };
  }

  /**
   * Generate error view for when something goes wrong
   */
  generateErrorView(error: string): SlackHomeView {
    this.logger.error('Generating error view', { error });

    return {
      type: 'home',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🎂 Dwell Church Birthdays'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '❌ *Something went wrong*\n\nWe encountered an error while loading birthday information. Please try refreshing or contact your administrator.'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Error details:*\n\`\`\`${error}\`\`\``
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              action_id: 'refresh_home_view',
              text: {
                type: 'plain_text',
                text: '🔄 Refresh',
                emoji: true
              },
              style: 'primary'
            }
          ]
        }
      ]
    };
  }

  /**
   * Generate today's birthdays section
   */
  private generateTodaysBirthdaysSection(todaysBirthdays: UpcomingBirthday[]): SlackHomeViewBlock[] {
    const blocks: SlackHomeViewBlock[] = [];

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🎂 *Today's Birthday${todaysBirthdays.length > 1 ? 's' : ''}!*`
      }
    });

    for (const birthday of todaysBirthdays) {
      const nameText = birthday.slackUserId 
        ? `<@${birthday.slackUserId}>`
        : `**${birthday.name}**`;

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🎉 ${nameText} is celebrating today!\n*Happy Birthday!* 🎈`
        }
      });
    }

    blocks.push({ type: 'divider' });

    return blocks;
  }

  /**
   * Generate upcoming birthdays section
   */
  private generateUpcomingBirthdaysSection(upcomingBirthdays: UpcomingBirthday[], expanded: boolean): SlackHomeViewBlock[] {
    const blocks: SlackHomeViewBlock[] = [];

    // Filter out today's birthdays for this section
    const futureBirthdays = upcomingBirthdays.filter(b => b.daysUntil > 0);

    if (futureBirthdays.length === 0) {
      return blocks;
    }

    const headerText = expanded 
      ? `📅 *Upcoming Birthdays* (next ${futureBirthdays[futureBirthdays.length - 1].daysUntil} days)`
      : '📅 *Upcoming Birthdays* (next 30 days)';

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: headerText
      }
    });

    // Group birthdays by date to show multiple people with the same birthday together
    const birthdayGroups: Record<string, UpcomingBirthday[]> = {};
    
    for (const birthday of futureBirthdays) {
      const key = `${birthday.daysUntil}-${birthday.displayDate}`;
      if (!birthdayGroups[key]) {
        birthdayGroups[key] = [];
      }
      birthdayGroups[key].push(birthday);
    }

    // Sort groups by days until birthday
    const sortedGroups = Object.entries(birthdayGroups)
      .sort(([a], [b]) => {
        const aDays = parseInt(a.split('-')[0]);
        const bDays = parseInt(b.split('-')[0]);
        return aDays - bDays;
      })
      .slice(0, expanded ? 20 : 10); // Limit display

    for (const [, group] of sortedGroups) {
      const firstBirthday = group[0];
      const relativeDate = formatRelativeDate(firstBirthday.daysUntil);
      
      // Create list of names, with @mentions if Slack user IDs are available
      const namesList = group.map(birthday => 
        birthday.slackUserId ? `<@${birthday.slackUserId}>` : `**${birthday.name}**`
      ).join(', ');

      // Use appropriate emoji based on how soon the birthday is
      let emoji = '🎉';
      if (firstBirthday.daysUntil === 1) {
        emoji = '🎁';
      } else if (firstBirthday.daysUntil <= 7) {
        emoji = '📅';
      }

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${emoji} *${firstBirthday.displayDate}* (${relativeDate})\n${namesList}`
        }
      });
    }

    if (futureBirthdays.length > sortedGroups.length) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `... and ${futureBirthdays.length - sortedGroups.length} more`
          }
        ]
      });
    }

    blocks.push({ type: 'divider' });

    return blocks;
  }

  /**
   * Generate section for when no upcoming birthdays
   */
  private generateNoUpcomingBirthdaysSection(): SlackHomeViewBlock[] {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '🎉 *No Upcoming Birthdays*\n\nThere are no birthdays coming up in the next 30 days. Check back later!'
        }
      },
      { type: 'divider' }
    ];
  }

  /**
   * Generate statistics section
   */
  private generateStatsSection(stats: import('../utils/dates').BirthdayStats): SlackHomeViewBlock[] {
    const blocks: SlackHomeViewBlock[] = [];

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '📊 *Birthday Statistics*'
      }
    });

    const statsText = [
      `👥 Total birthdays: ${stats.totalBirthdays}`,
      `📅 This month: ${stats.birthdaysThisMonth}`,
      `📅 Next month: ${stats.birthdaysNextMonth}`,
      `🎯 Next 30 days: ${stats.birthdaysNext30Days}`
    ].join('\n');

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: statsText
      }
    });

    blocks.push({ type: 'divider' });

    return blocks;
  }

  /**
   * Generate action buttons
   */
  private generateActionButtons(expanded: boolean): SlackHomeViewBlock[] {
    const elements: SlackHomeViewAction[] = [];

    if (expanded) {
      elements.push({
        type: 'button',
        action_id: 'show_compact_view',
        text: {
          type: 'plain_text',
          text: '📋 Show Less',
          emoji: true
        }
      });
    } else {
      elements.push({
        type: 'button',
        action_id: 'show_expanded_view',
        text: {
          type: 'plain_text',
          text: '📋 View All',
          emoji: true
        }
      });
    }

    elements.push({
      type: 'button',
      action_id: 'refresh_home_view',
      text: {
        type: 'plain_text',
        text: '🔄 Refresh',
        emoji: true
      }
    });

    return [
      {
        type: 'actions',
        elements
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '💡 Use `/birthdays` to see upcoming birthdays from any channel'
          }
        ]
      }
    ];
  }
}

/**
 * Create a configured Home View Generator instance
 */
export function createHomeViewGenerator(logger?: Logger): HomeViewGenerator {
  return new HomeViewGenerator(logger);
}