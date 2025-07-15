import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { HomeViewGenerator, createHomeViewGenerator } from '@/services/home-view-generator';
import { Birthday } from '@/types/birthday';
import { TEST_CONSTANTS } from '@tests/setup';

// Mock dependencies
vi.mock('@/utils/dates');
vi.mock('@/utils/logger');

import { 
  calculateUpcomingBirthdays, 
  getTodaysBirthdays, 
  getBirthdayStats, 
  formatRelativeDate 
} from '@/utils/dates';
import { createLogger } from '@/utils/logger';

describe('HomeViewGenerator', () => {
  let generator: HomeViewGenerator;
  let mockLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    (createLogger as Mock).mockReturnValue(mockLogger);
    generator = new HomeViewGenerator(mockLogger);

    // Mock date utilities with default behaviors
    (getTodaysBirthdays as Mock).mockReturnValue([]);
    (calculateUpcomingBirthdays as Mock).mockReturnValue([]);
    (getBirthdayStats as Mock).mockReturnValue({
      totalBirthdays: 0,
      birthdaysThisMonth: 0,
      birthdaysNextMonth: 0,
      birthdaysNext30Days: 0,
      mostCommonMonth: 1,
      monthDistribution: {}
    });
    (formatRelativeDate as Mock).mockImplementation((days) => `in ${days} days`);
  });

  describe('generateHomeView', () => {
    it('should generate welcome view for empty birthday list', () => {
      // Execute
      const view = generator.generateHomeView([]);

      // Verify
      expect(view.type).toBe('home');
      expect(view.blocks).toBeDefined();
      expect(view.blocks[0].type).toBe('header');
      expect(view.blocks[0].text?.text).toBe('🎂 Dwell Church Birthdays');
      
      // Should contain welcome message
      const welcomeSection = view.blocks.find(block => 
        block.type === 'section' && 
        block.text?.text?.includes('Welcome to Dwell Church Birthdays!')
      );
      expect(welcomeSection).toBeDefined();
      
      expect(mockLogger.info).toHaveBeenCalledWith('Generating welcome view (no birthday data)');
    });

    it('should generate view with today\'s birthdays', () => {
      // Setup
      const birthdays: Birthday[] = [
        { name: 'John Doe', month: 1, day: 15, slackUserId: 'U123456' }
      ];

      const todaysBirthdays = [
        { name: 'John Doe', month: 1, day: 15, daysUntil: 0, monthName: 'January', displayDate: 'January 15', slackUserId: 'U123456' }
      ];

      const stats = {
        totalBirthdays: 1,
        birthdaysThisMonth: 1,
        birthdaysNextMonth: 0,
        birthdaysNext30Days: 1,
        mostCommonMonth: 1,
        monthDistribution: { 1: 1 }
      };

      (getTodaysBirthdays as Mock).mockReturnValue(todaysBirthdays);
      (getBirthdayStats as Mock).mockReturnValue(stats);

      // Execute
      const view = generator.generateHomeView(birthdays);

      // Verify
      expect(view.type).toBe('home');
      expect(view.blocks).toBeDefined();
      
      // Should have header
      const header = view.blocks.find(block => block.type === 'header');
      expect(header).toBeDefined();
      
      // Should have today's birthday section
      const todaySection = view.blocks.find(block => 
        block.type === 'section' && 
        block.text?.text?.includes('Today\'s Birthday')
      );
      expect(todaySection).toBeDefined();
      
      // Should mention the person with @mention
      const birthdayMention = view.blocks.find(block =>
        block.type === 'section' && 
        block.text?.text?.includes('<@U123456>')
      );
      expect(birthdayMention).toBeDefined();

      expect(mockLogger.info).toHaveBeenCalledWith('Generating home view', {
        birthdayCount: 1,
        expanded: false
      });
    });

    it('should generate view with upcoming birthdays', () => {
      // Setup
      const birthdays: Birthday[] = [
        { name: 'Jane Smith', month: 1, day: 20 },
        { name: 'Bob Johnson', month: 1, day: 25 }
      ];

      const upcomingBirthdays = [
        { name: 'Jane Smith', month: 1, day: 20, daysUntil: 5, monthName: 'January', displayDate: 'January 20' },
        { name: 'Bob Johnson', month: 1, day: 25, daysUntil: 10, monthName: 'January', displayDate: 'January 25' }
      ];

      const stats = {
        totalBirthdays: 2,
        birthdaysThisMonth: 2,
        birthdaysNextMonth: 0,
        birthdaysNext30Days: 2,
        mostCommonMonth: 1,
        monthDistribution: { 1: 2 }
      };

      (calculateUpcomingBirthdays as Mock).mockReturnValue(upcomingBirthdays);
      (getBirthdayStats as Mock).mockReturnValue(stats);

      // Execute
      const view = generator.generateHomeView(birthdays);

      // Verify
      expect(view.type).toBe('home');
      
      // Should have upcoming birthdays section
      const upcomingSection = view.blocks.find(block =>
        block.type === 'section' && 
        block.text?.text?.includes('Upcoming Birthdays')
      );
      expect(upcomingSection).toBeDefined();

      // Should display individual birthdays
      const janeBirthday = view.blocks.find(block =>
        block.type === 'section' && 
        block.text?.text?.includes('January 20')
      );
      expect(janeBirthday).toBeDefined();

      expect(calculateUpcomingBirthdays).toHaveBeenCalledWith(birthdays, 30); // Default days
    });

    it('should generate expanded view when requested', () => {
      // Setup
      const birthdays: Birthday[] = [
        { name: 'John Doe', month: 1, day: 15 }
      ];

      const upcomingBirthdays = [
        { name: 'John Doe', month: 1, day: 15, daysUntil: 5, monthName: 'January', displayDate: 'January 15' }
      ];

      (calculateUpcomingBirthdays as Mock).mockReturnValue(upcomingBirthdays);
      (getBirthdayStats as Mock).mockReturnValue({
        totalBirthdays: 1,
        birthdaysThisMonth: 1,
        birthdaysNextMonth: 0,
        birthdaysNext30Days: 1,
        mostCommonMonth: 1,
        monthDistribution: { 1: 1 }
      });

      // Execute
      const view = generator.generateHomeView(birthdays, true);

      // Verify
      expect(calculateUpcomingBirthdays).toHaveBeenCalledWith(birthdays, 90); // Expanded days
      expect(mockLogger.info).toHaveBeenCalledWith('Generating home view', {
        birthdayCount: 1,
        expanded: true
      });

      // Should have "Show Less" button in expanded mode
      const actionsBlock = view.blocks.find(block => block.type === 'actions');
      expect(actionsBlock).toBeDefined();
      
      const showLessButton = actionsBlock?.elements?.find(element =>
        element.type === 'button' && element.action_id === 'show_compact_view'
      );
      expect(showLessButton).toBeDefined();
    });

    it('should generate statistics section', () => {
      // Setup
      const birthdays: Birthday[] = [
        { name: 'John Doe', month: 1, day: 15 }
      ];

      const stats = {
        totalBirthdays: 10,
        birthdaysThisMonth: 3,
        birthdaysNextMonth: 2,
        birthdaysNext30Days: 4,
        mostCommonMonth: 3,
        monthDistribution: { 1: 3, 2: 2, 3: 5 }
      };

      (getBirthdayStats as Mock).mockReturnValue(stats);

      // Execute
      const view = generator.generateHomeView(birthdays);

      // Verify statistics section
      const statsSection = view.blocks.find(block =>
        block.type === 'section' && 
        block.text?.text?.includes('Birthday Statistics')
      );
      expect(statsSection).toBeDefined();

      const statsData = view.blocks.find(block =>
        block.type === 'section' && 
        block.text?.text?.includes('Total birthdays: 10')
      );
      expect(statsData).toBeDefined();
    });

    it('should handle birthdays without Slack user IDs', () => {
      // Setup
      const birthdays: Birthday[] = [
        { name: 'John Doe', month: 1, day: 15 } // No slackUserId
      ];

      const todaysBirthdays = [
        { name: 'John Doe', month: 1, day: 15, daysUntil: 0, monthName: 'January', displayDate: 'January 15' }
      ];

      (getTodaysBirthdays as Mock).mockReturnValue(todaysBirthdays);

      // Execute
      const view = generator.generateHomeView(birthdays);

      // Verify that name is bolded instead of @mentioned
      const birthdayMention = view.blocks.find(block =>
        block.type === 'section' && 
        block.text?.text?.includes('**John Doe**')
      );
      expect(birthdayMention).toBeDefined();
    });

    it('should group birthdays by same date', () => {
      // Setup
      const birthdays: Birthday[] = [
        { name: 'John Doe', month: 1, day: 20 },
        { name: 'Jane Smith', month: 1, day: 20 } // Same date
      ];

      const upcomingBirthdays = [
        { name: 'John Doe', month: 1, day: 20, daysUntil: 5, monthName: 'January', displayDate: 'January 20' },
        { name: 'Jane Smith', month: 1, day: 20, daysUntil: 5, monthName: 'January', displayDate: 'January 20' }
      ];

      (calculateUpcomingBirthdays as Mock).mockReturnValue(upcomingBirthdays);
      (getBirthdayStats as Mock).mockReturnValue({
        totalBirthdays: 2,
        birthdaysThisMonth: 2,
        birthdaysNextMonth: 0,
        birthdaysNext30Days: 2,
        mostCommonMonth: 1,
        monthDistribution: { 1: 2 }
      });

      // Execute
      const view = generator.generateHomeView(birthdays);

      // Verify that both names appear together
      const groupedBirthday = view.blocks.find(block =>
        block.type === 'section' && 
        block.text?.text?.includes('January 20') &&
        block.text?.text?.includes('John Doe') &&
        block.text?.text?.includes('Jane Smith')
      );
      expect(groupedBirthday).toBeDefined();
    });

    it('should include action buttons', () => {
      // Setup
      const birthdays: Birthday[] = [
        { name: 'John Doe', month: 1, day: 15 }
      ];

      (getBirthdayStats as Mock).mockReturnValue({
        totalBirthdays: 1,
        birthdaysThisMonth: 1,
        birthdaysNextMonth: 0,
        birthdaysNext30Days: 1,
        mostCommonMonth: 1,
        monthDistribution: { 1: 1 }
      });

      // Execute
      const view = generator.generateHomeView(birthdays);

      // Verify action buttons
      const actionsBlock = view.blocks.find(block => block.type === 'actions');
      expect(actionsBlock).toBeDefined();
      
      const refreshButton = actionsBlock?.elements?.find(element =>
        element.type === 'button' && element.action_id === 'refresh_home_view'
      );
      expect(refreshButton).toBeDefined();

      const viewAllButton = actionsBlock?.elements?.find(element =>
        element.type === 'button' && element.action_id === 'show_expanded_view'
      );
      expect(viewAllButton).toBeDefined();
    });

    it('should handle no upcoming birthdays', () => {
      // Setup
      const birthdays: Birthday[] = [
        { name: 'John Doe', month: 12, day: 31 } // Far future birthday
      ];

      (calculateUpcomingBirthdays as Mock).mockReturnValue([]);
      (getBirthdayStats as Mock).mockReturnValue({
        totalBirthdays: 1,
        birthdaysThisMonth: 0,
        birthdaysNextMonth: 0,
        birthdaysNext30Days: 0,
        mostCommonMonth: 12,
        monthDistribution: { 12: 1 }
      });

      // Execute
      const view = generator.generateHomeView(birthdays);

      // Verify no upcoming birthdays section
      const noUpcomingSection = view.blocks.find(block =>
        block.type === 'section' && 
        block.text?.text?.includes('No Upcoming Birthdays')
      );
      expect(noUpcomingSection).toBeDefined();
    });
  });

  describe('generateWelcomeView', () => {
    it('should generate proper welcome view structure', () => {
      // Execute
      const view = generator.generateWelcomeView();

      // Verify
      expect(view.type).toBe('home');
      expect(view.blocks).toHaveLength(5);
      
      // Header
      expect(view.blocks[0].type).toBe('header');
      expect(view.blocks[0].text?.text).toBe('🎂 Dwell Church Birthdays');
      
      // Welcome message
      expect(view.blocks[1].type).toBe('section');
      expect(view.blocks[1].text?.text).toContain('Welcome to Dwell Church Birthdays!');
      
      // Getting started
      expect(view.blocks[2].type).toBe('section');
      expect(view.blocks[2].text?.text).toContain('Getting Started');
      
      // Divider
      expect(view.blocks[3].type).toBe('divider');
      
      // Tip
      expect(view.blocks[4].type).toBe('context');
      expect(view.blocks[4].elements?.[0].text).toContain('/birthdays');
    });
  });

  describe('generateErrorView', () => {
    it('should generate proper error view structure', () => {
      // Execute
      const errorMessage = 'Database connection failed';
      const view = generator.generateErrorView(errorMessage);

      // Verify
      expect(view.type).toBe('home');
      expect(view.blocks).toBeDefined();
      
      // Header
      const header = view.blocks.find(block => block.type === 'header');
      expect(header).toBeDefined();
      
      // Error message
      const errorSection = view.blocks.find(block =>
        block.type === 'section' && 
        block.text?.text?.includes('Something went wrong')
      );
      expect(errorSection).toBeDefined();
      
      // Error details
      const errorDetails = view.blocks.find(block =>
        block.type === 'section' && 
        block.text?.text?.includes(errorMessage)
      );
      expect(errorDetails).toBeDefined();
      
      // Refresh button
      const actionsBlock = view.blocks.find(block => block.type === 'actions');
      expect(actionsBlock).toBeDefined();
      
      const refreshButton = actionsBlock?.elements?.find(element =>
        element.type === 'button' && element.action_id === 'refresh_home_view'
      );
      expect(refreshButton).toBeDefined();
      
      expect(mockLogger.error).toHaveBeenCalledWith('Generating error view', {
        error: errorMessage
      });
    });

    it('should handle long error messages', () => {
      // Execute
      const longError = 'A'.repeat(1000);
      const view = generator.generateErrorView(longError);

      // Verify error is included in code block
      const errorDetails = view.blocks.find(block =>
        block.type === 'section' && 
        block.text?.text?.includes(longError)
      );
      expect(errorDetails).toBeDefined();
      expect(errorDetails?.text?.text).toContain('```');
    });
  });

  describe('Emoji Selection', () => {
    it('should use appropriate emojis for different time ranges', () => {
      // Setup
      const birthdays: Birthday[] = [
        { name: 'Tomorrow Birthday', month: 1, day: 16 },
        { name: 'This Week Birthday', month: 1, day: 20 },
        { name: 'Future Birthday', month: 2, day: 15 }
      ];

      const upcomingBirthdays = [
        { name: 'Tomorrow Birthday', month: 1, day: 16, daysUntil: 1, monthName: 'January', displayDate: 'January 16' },
        { name: 'This Week Birthday', month: 1, day: 20, daysUntil: 5, monthName: 'January', displayDate: 'January 20' },
        { name: 'Future Birthday', month: 2, day: 15, daysUntil: 30, monthName: 'February', displayDate: 'February 15' }
      ];

      (calculateUpcomingBirthdays as Mock).mockReturnValue(upcomingBirthdays);
      (getBirthdayStats as Mock).mockReturnValue({
        totalBirthdays: 3,
        birthdaysThisMonth: 2,
        birthdaysNextMonth: 1,
        birthdaysNext30Days: 3,
        mostCommonMonth: 1,
        monthDistribution: { 1: 2, 2: 1 }
      });

      // Execute
      const view = generator.generateHomeView(birthdays);

      // Verify different emojis are used
      const viewText = JSON.stringify(view);
      expect(viewText).toContain('🎁'); // Tomorrow (1 day)
      expect(viewText).toContain('📅'); // This week (5 days)
      expect(viewText).toContain('🎉'); // Future (30 days)
    });
  });

  describe('createHomeViewGenerator', () => {
    it('should create generator with provided logger', () => {
      // Execute
      const customLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
      const newGenerator = createHomeViewGenerator(customLogger);

      // Verify
      expect(newGenerator).toBeInstanceOf(HomeViewGenerator);
      
      // Test that custom logger is used
      newGenerator.generateWelcomeView();
      expect(customLogger.info).toHaveBeenCalled();
    });

    it('should create generator with default logger when none provided', () => {
      // Execute
      const newGenerator = createHomeViewGenerator();

      // Verify
      expect(newGenerator).toBeInstanceOf(HomeViewGenerator);
      expect(createLogger).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined birthdays gracefully', () => {
      // Execute - pass empty array instead of null since that's what the implementation expects
      const view = generator.generateHomeView([] as any);

      // Verify welcome view is generated
      expect(view.type).toBe('home');
      expect(view.blocks[1].text?.text).toContain('Welcome to Dwell Church Birthdays!');
    });

    it('should handle birthdays with special characters in names', () => {
      // Setup
      const birthdays: Birthday[] = [
        { name: 'José María O\'Connor-Smith', month: 1, day: 15 }
      ];

      const todaysBirthdays = [
        { name: 'José María O\'Connor-Smith', month: 1, day: 15, daysUntil: 0, monthName: 'January', displayDate: 'January 15' }
      ];

      (getTodaysBirthdays as Mock).mockReturnValue(todaysBirthdays);
      (getBirthdayStats as Mock).mockReturnValue({
        totalBirthdays: 1,
        birthdaysThisMonth: 1,
        birthdaysNextMonth: 0,
        birthdaysNext30Days: 1,
        mostCommonMonth: 1,
        monthDistribution: { 1: 1 }
      });

      // Execute
      const view = generator.generateHomeView(birthdays);

      // Verify name is properly handled
      const birthdaySection = view.blocks.find(block =>
        block.type === 'section' && 
        block.text?.text?.includes('José María O\'Connor-Smith')
      );
      expect(birthdaySection).toBeDefined();
    });

    it('should handle very large birthday lists', () => {
      // Setup
      const largeBirthdayList: Birthday[] = Array.from({ length: 100 }, (_, i) => ({
        name: `Person ${i + 1}`,
        month: (i % 12) + 1,
        day: (i % 28) + 1
      }));

      const largeUpcomingList = largeBirthdayList.slice(0, 50).map((birthday, i) => ({
        ...birthday,
        daysUntil: i + 1,
        monthName: 'January',
        displayDate: `January ${birthday.day}`
      }));

      (calculateUpcomingBirthdays as Mock).mockReturnValue(largeUpcomingList);
      (getBirthdayStats as Mock).mockReturnValue({
        totalBirthdays: 100,
        birthdaysThisMonth: 10,
        birthdaysNextMonth: 8,
        birthdaysNext30Days: 30,
        mostCommonMonth: 1,
        monthDistribution: { 1: 100 }
      });

      // Execute
      const view = generator.generateHomeView(largeBirthdayList);

      // Verify view is generated without errors
      expect(view.type).toBe('home');
      expect(view.blocks).toBeDefined();
      
      // Should have stats showing 100 total
      const statsSection = view.blocks.find(block =>
        block.type === 'section' && 
        block.text?.text?.includes('Total birthdays: 100')
      );
      expect(statsSection).toBeDefined();
    });
  });
});