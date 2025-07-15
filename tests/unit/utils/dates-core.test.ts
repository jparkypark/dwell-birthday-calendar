import { describe, it, expect, vi } from 'vitest';
import {
  calculateUpcomingBirthdays,
  getDaysUntilBirthday,
  getTodaysBirthdays,
  isLeapYear,
  formatBirthdayDate,
  formatRelativeDate
} from '../../../src/utils/dates';
import { Birthday } from '../../../src/types/birthday';

describe('Date Utilities - Core Tests', () => {
  const mockDate = new Date('2024-01-15T12:00:00Z');

  beforeEach(() => {
    vi.setSystemTime(mockDate);
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
  });

  describe('getDaysUntilBirthday', () => {
    it('should calculate days until birthday correctly', () => {
      // Today's birthday
      expect(getDaysUntilBirthday(1, 15, mockDate)).toBe(0);
      
      // 5 days from now
      expect(getDaysUntilBirthday(1, 20, mockDate)).toBe(5);
      
      // Next year (leap year 2024 has 366 days)
      expect(getDaysUntilBirthday(1, 10, mockDate)).toBe(361);
    });

    it('should handle leap year February 29th', () => {
      expect(getDaysUntilBirthday(2, 29, mockDate)).toBe(45);
    });
  });

  describe('formatBirthdayDate', () => {
    it('should format valid dates correctly', () => {
      expect(formatBirthdayDate(1, 15)).toBe('January 15');
      expect(formatBirthdayDate(12, 31)).toBe('December 31');
      expect(formatBirthdayDate(2, 29)).toBe('February 29');
    });

    it('should handle invalid dates', () => {
      expect(formatBirthdayDate(13, 15)).toBe('Unknown 15');
      expect(formatBirthdayDate(2, 30)).toBe('Unknown 30');
      expect(formatBirthdayDate(0, 15)).toBe('Unknown 15');
    });
  });

  describe('formatRelativeDate', () => {
    it('should format relative dates correctly', () => {
      expect(formatRelativeDate(0)).toBe('today');
      expect(formatRelativeDate(1)).toBe('tomorrow');
      expect(formatRelativeDate(2)).toBe('in 2 days');
      expect(formatRelativeDate(7)).toBe('in 7 days');
    });

    it('should handle large numbers with months', () => {
      expect(formatRelativeDate(365)).toBe('in 13 months');
      expect(formatRelativeDate(100)).toBe('in 15 weeks');
    });
  });

  describe('getTodaysBirthdays', () => {
    it('should return today\'s birthdays', () => {
      const birthdays: Birthday[] = [
        { name: 'John Doe', month: 1, day: 15, slackUserId: 'U1' }, // Today
        { name: 'Jane Smith', month: 1, day: 20, slackUserId: 'U2' }, // Future
        { name: 'Bob Johnson', month: 1, day: 10, slackUserId: 'U3' } // Past
      ];

      const todaysBirthdays = getTodaysBirthdays(birthdays);
      expect(todaysBirthdays).toHaveLength(1);
      expect(todaysBirthdays[0].name).toBe('John Doe');
      expect(todaysBirthdays[0].daysUntil).toBe(0);
    });
  });

  describe('calculateUpcomingBirthdays', () => {
    it('should return upcoming birthdays within range', () => {
      const birthdays: Birthday[] = [
        { name: 'John Doe', month: 1, day: 15, slackUserId: 'U1' }, // Today
        { name: 'Jane Smith', month: 1, day: 20, slackUserId: 'U2' }, // 5 days
        { name: 'Bob Johnson', month: 3, day: 1, slackUserId: 'U3' } // 46 days
      ];

      const upcoming = calculateUpcomingBirthdays(birthdays, 30);
      expect(upcoming).toHaveLength(2);
      expect(upcoming[0].name).toBe('John Doe');
      expect(upcoming[1].name).toBe('Jane Smith');
    });

    it('should sort by days until birthday', () => {
      const birthdays: Birthday[] = [
        { name: 'Future', month: 1, day: 20, slackUserId: 'U1' }, // 5 days
        { name: 'Today', month: 1, day: 15, slackUserId: 'U2' }, // 0 days
      ];

      const upcoming = calculateUpcomingBirthdays(birthdays, 30);
      expect(upcoming[0].name).toBe('Today');
      expect(upcoming[1].name).toBe('Future');
    });
  });
});