import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateUpcomingBirthdays,
  getDaysUntilBirthday,
  getTodaysBirthdays,
  isLeapYear,
  formatBirthdayDate,
  getBirthdayStats,
  isBirthdayInRange,
  formatRelativeDate,
  BirthdayStats
} from '@/utils/dates';
import { Birthday } from '@/types/birthday';
import { TEST_CONSTANTS } from '@tests/setup';

describe('Date Utilities', () => {
  const mockBirthdays: Birthday[] = [
    { name: 'John Doe', month: 1, day: 20, slackUserId: 'U1' }, // 5 days from mock date (Jan 15)
    { name: 'Jane Smith', month: 1, day: 15, slackUserId: 'U2' }, // Today (Jan 15)
    { name: 'Bob Johnson', month: 2, day: 29, slackUserId: 'U3' }, // Leap year birthday
    { name: 'Alice Williams', month: 12, day: 31, slackUserId: 'U4' }, // Year boundary
    { name: 'Charlie Brown', month: 1, day: 10, slackUserId: 'U5' }, // 5 days ago
    { name: 'Diana Prince', month: 3, day: 1, slackUserId: 'U6' }, // 46 days away
  ];

  beforeEach(() => {
    // Mock date is set to January 15, 2024 in setup.ts
    vi.setSystemTime(TEST_CONSTANTS.MOCK_DATE);
  });

  describe('isLeapYear', () => {
    it('should identify leap years correctly', () => {
      expect(isLeapYear(2020)).toBe(true);
      expect(isLeapYear(2024)).toBe(true);
      expect(isLeapYear(2000)).toBe(true);
      expect(isLeapYear(1900)).toBe(false);
      expect(isLeapYear(2023)).toBe(false);
      expect(isLeapYear(2025)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isLeapYear(400)).toBe(true);
      expect(isLeapYear(100)).toBe(false);
      expect(isLeapYear(4)).toBe(true);
    });
  });

  describe('getDaysUntilBirthday', () => {
    it('should calculate days until birthday correctly', () => {
      const mockDate = TEST_CONSTANTS.MOCK_DATE; // Jan 15, 2024
      
      // John's birthday is Jan 20 (5 days from Jan 15)
      expect(getDaysUntilBirthday(1, 20, mockDate)).toBe(5);
      
      // Jane's birthday is today (Jan 15)
      expect(getDaysUntilBirthday(1, 15, mockDate)).toBe(0);
      
      // Charlie's birthday was 5 days ago (Jan 10), so next year
      expect(getDaysUntilBirthday(1, 10, mockDate)).toBe(361); // 366 - 5 (2024 is leap year)
    });

    it('should handle leap year February 29th correctly', () => {
      // Test leap year (2024)
      expect(getDaysUntilBirthday(2, 29)).toBe(45); // Jan 15 to Feb 29
      
      // Test non-leap year behavior
      vi.setSystemTime(new Date('2023-01-15T12:00:00Z'));
      expect(getDaysUntilBirthday(2, 29)).toBe(44); // Feb 29 becomes Feb 28 in non-leap year
    });

    it('should handle year boundary correctly', () => {
      // December 31st from January 15th
      expect(getDaysUntilBirthday(12, 31)).toBe(351); // Days until end of year
    });

    it('should handle invalid dates', () => {
      // Invalid dates return days until calculated date (may be > 365)
      expect(getDaysUntilBirthday(13, 15)).toBeGreaterThan(0); // Invalid month
      expect(getDaysUntilBirthday(2, 30)).toBeGreaterThan(0); // Invalid day for February
      expect(getDaysUntilBirthday(4, 31)).toBeGreaterThan(0); // Invalid day for April
    });
  });

  describe('getTodaysBirthdays', () => {
    it('should return only today\'s birthdays', () => {
      const todaysBirthdays = getTodaysBirthdays(mockBirthdays);
      
      expect(todaysBirthdays).toHaveLength(1);
      expect(todaysBirthdays[0].name).toBe('Jane Smith');
      expect(todaysBirthdays[0].daysUntil).toBe(0);
    });

    it('should return empty array when no birthdays today', () => {
      const noBirthdaysToday = mockBirthdays.filter(b => b.name !== 'Jane Smith');
      const todaysBirthdays = getTodaysBirthdays(noBirthdaysToday);
      
      expect(todaysBirthdays).toHaveLength(0);
    });

    it('should handle empty birthday list', () => {
      const todaysBirthdays = getTodaysBirthdays([]);
      expect(todaysBirthdays).toHaveLength(0);
    });
  });

  describe('calculateUpcomingBirthdays', () => {
    it('should return upcoming birthdays within specified days', () => {
      const upcomingBirthdays = calculateUpcomingBirthdays(mockBirthdays, 30);
      
      // Should include Jane (today) and John (5 days)
      expect(upcomingBirthdays).toHaveLength(2);
      expect(upcomingBirthdays.map(b => b.name)).toContain('Jane Smith');
      expect(upcomingBirthdays.map(b => b.name)).toContain('John Doe');
    });

    it('should sort birthdays by days until', () => {
      const upcomingBirthdays = calculateUpcomingBirthdays(mockBirthdays, 30);
      
      // Jane (0 days) should come before John (5 days)
      expect(upcomingBirthdays[0].name).toBe('Jane Smith');
      expect(upcomingBirthdays[0].daysUntil).toBe(0);
      expect(upcomingBirthdays[1].name).toBe('John Doe');
      expect(upcomingBirthdays[1].daysUntil).toBe(5);
    });

    it('should handle large day ranges', () => {
      const upcomingBirthdays = calculateUpcomingBirthdays(mockBirthdays, 365);
      
      // Should include all birthdays
      expect(upcomingBirthdays).toHaveLength(6);
    });

    it('should handle edge case of 0 days', () => {
      const upcomingBirthdays = calculateUpcomingBirthdays(mockBirthdays, 0);
      
      // Should only include today's birthdays
      expect(upcomingBirthdays).toHaveLength(1);
      expect(upcomingBirthdays[0].name).toBe('Jane Smith');
    });

    it('should handle leap year birthdays in non-leap years', () => {
      // Set to non-leap year
      vi.setSystemTime(new Date('2023-01-15T12:00:00Z'));
      
      const upcomingBirthdays = calculateUpcomingBirthdays(mockBirthdays, 60);
      
      // Bob's Feb 29 birthday should be treated as Feb 28
      const bobsBirthday = upcomingBirthdays.find(b => b.name === 'Bob Johnson');
      expect(bobsBirthday).toBeDefined();
      expect(bobsBirthday?.daysUntil).toBe(44); // Jan 15 to Feb 28
    });
  });

  describe('formatBirthdayDate', () => {
    it('should format birthday dates correctly', () => {
      expect(formatBirthdayDate(1, 15)).toBe('January 15');
      expect(formatBirthdayDate(12, 31)).toBe('December 31');
      expect(formatBirthdayDate(2, 29)).toBe('February 29');
    });

    it('should handle single digit days', () => {
      expect(formatBirthdayDate(3, 5)).toBe('March 5');
      expect(formatBirthdayDate(7, 1)).toBe('July 1');
    });

    it('should handle invalid dates gracefully', () => {
      expect(formatBirthdayDate(13, 15)).toBe('Unknown 15');
      expect(formatBirthdayDate(2, 30)).toBe('February 30');
      expect(formatBirthdayDate(0, 15)).toBe('Unknown 15');
    });
  });

  describe('formatRelativeDate', () => {
    it('should format relative dates correctly', () => {
      expect(formatRelativeDate(0)).toBe('today');
      expect(formatRelativeDate(1)).toBe('tomorrow');
      expect(formatRelativeDate(2)).toBe('in 2 days');
      expect(formatRelativeDate(7)).toBe('in 7 days');
      expect(formatRelativeDate(30)).toBe('in 5 weeks');
    });

    it('should handle negative days', () => {
      expect(formatRelativeDate(-1)).toBe('in -1 days');
      expect(formatRelativeDate(-5)).toBe('in -5 days');
    });

    it('should handle large numbers', () => {
      expect(formatRelativeDate(365)).toBe('in 13 months');
      expect(formatRelativeDate(100)).toBe('in 4 months');
    });
  });

  describe('getBirthdayStats', () => {
    it('should calculate birthday statistics correctly', () => {
      const stats = getBirthdayStats(mockBirthdays);
      
      expect(stats.totalBirthdays).toBe(6);
      expect(stats.birthdaysThisMonth).toBe(3); // John, Jane, Charlie in January
      expect(stats.birthdaysNextMonth).toBe(1); // Bob in February
      expect(stats.birthdaysNext30Days).toBeGreaterThan(0);
    });

    it('should handle empty birthday list', () => {
      const stats = getBirthdayStats([]);
      
      expect(stats.totalBirthdays).toBe(0);
      expect(stats.birthdaysThisMonth).toBe(0);
      expect(stats.birthdaysNextMonth).toBe(0);
      expect(stats.birthdaysNext30Days).toBe(0);
    });

    it('should handle year boundary correctly', () => {
      // Set date to December 15
      vi.setSystemTime(new Date('2024-12-15T12:00:00Z'));
      
      const stats = getBirthdayStats(mockBirthdays);
      
      expect(stats.birthdaysThisMonth).toBe(1); // Alice in December
      expect(stats.birthdaysNextMonth).toBe(3); // John, Jane, Charlie in January (next month)
    });
  });

  describe('isBirthdayInRange', () => {
    it('should check if birthday is in range correctly', () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-02-15');
      
      expect(isBirthdayInRange({ name: 'Jane', month: 1, day: 15 }, startDate, endDate)).toBe(true);
      expect(isBirthdayInRange({ name: 'John', month: 1, day: 20 }, startDate, endDate)).toBe(true);
      expect(isBirthdayInRange({ name: 'Diana', month: 3, day: 1 }, startDate, endDate)).toBe(false);
    });

    it('should handle edge cases', () => {
      const today = new Date('2024-01-15');
      const tomorrow = new Date('2024-01-16');
      
      expect(isBirthdayInRange({ name: 'Jane', month: 1, day: 15 }, today, today)).toBe(true);
      expect(isBirthdayInRange({ name: 'John', month: 1, day: 16 }, today, tomorrow)).toBe(false);
    });

    it('should handle leap year dates', () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-03-15');
      
      expect(isBirthdayInRange({ name: 'Bob', month: 2, day: 29 }, startDate, endDate)).toBe(true);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle invalid input gracefully', () => {
      expect(() => calculateUpcomingBirthdays([], 30)).not.toThrow();
      expect(() => getTodaysBirthdays([])).not.toThrow();
      expect(() => getBirthdayStats([])).not.toThrow();
    });

    it('should handle malformed birthday objects', () => {
      const malformedBirthdays = [
        { name: 'Invalid', month: 0, day: 15, slackUserId: 'U1' },
        { name: 'Also Invalid', month: 13, day: 15, slackUserId: 'U2' },
        { name: 'Invalid Day', month: 2, day: 30, slackUserId: 'U3' }
      ] as Birthday[];

      expect(() => calculateUpcomingBirthdays(malformedBirthdays, 30)).not.toThrow();
      expect(() => getTodaysBirthdays(malformedBirthdays)).not.toThrow();
    });

    it('should handle extreme date ranges', () => {
      expect(() => calculateUpcomingBirthdays(mockBirthdays, 999)).not.toThrow();
      expect(() => calculateUpcomingBirthdays(mockBirthdays, -1)).not.toThrow();
    });
  });

  describe('Performance with large datasets', () => {
    it('should handle large birthday lists efficiently', () => {
      const largeBirthdayList: Birthday[] = [];
      for (let i = 0; i < 1000; i++) {
        largeBirthdayList.push({
          name: `Person ${i}`,
          month: (i % 12) + 1,
          day: (i % 28) + 1,
          slackUserId: `U${i}`
        });
      }

      const start = performance.now();
      const upcomingBirthdays = calculateUpcomingBirthdays(largeBirthdayList, 30);
      const end = performance.now();

      expect(upcomingBirthdays).toBeDefined();
      expect(end - start).toBeLessThan(100); // Should complete in under 100ms
    });
  });
});