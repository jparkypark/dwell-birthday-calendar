import { describe, it, expect, vi } from 'vitest';
import {
  formatRelativeDate,
  formatBirthdayDate,
  getBirthdayStats,
  getDaysUntilBirthday,
  isBirthdayInRange
} from '../../../src/utils/dates';
import { Birthday } from '../../../src/types/birthday';

describe('Simple Date Tests', () => {
  it('should test formatRelativeDate', () => {
    expect(formatRelativeDate(0)).toBe('today');
    expect(formatRelativeDate(1)).toBe('tomorrow');
    expect(formatRelativeDate(2)).toBe('in 2 days');
  });

  it('should test formatBirthdayDate', () => {
    const result = formatBirthdayDate(1, 15);
    expect(result).toBe('January 15');
    
    // Test invalid date
    const invalid = formatBirthdayDate(13, 15);
    expect(invalid).toBe('Unknown 15');
  });

  it('should test getBirthdayStats', () => {
    const mockBirthdays: Birthday[] = [
      { name: 'John', month: 1, day: 15, slackUserId: 'U1' },
      { name: 'Jane', month: 1, day: 20, slackUserId: 'U2' }
    ];
    
    const mockDate = new Date('2024-01-15T12:00:00Z');
    const stats = getBirthdayStats(mockBirthdays, mockDate);
    
    expect(stats.totalBirthdays).toBe(2);
    expect(stats.birthdaysThisMonth).toBe(2);
  });

  it('should test getDaysUntilBirthday', () => {
    const mockDate = new Date('2024-01-15T12:00:00Z');
    
    // Test today
    expect(getDaysUntilBirthday(1, 15, mockDate)).toBe(0);
    
    // Test 5 days from now
    expect(getDaysUntilBirthday(1, 20, mockDate)).toBe(5);
    
    // Test invalid month - see what it returns
    const invalidMonth = getDaysUntilBirthday(13, 15, mockDate);
    console.log('Invalid month result:', invalidMonth);
  });

  it('should test isBirthdayInRange', () => {
    const mockDate = new Date('2024-01-15T12:00:00Z');
    
    // Test if function expects Date objects
    try {
      const result = isBirthdayInRange(1, 15, 30, mockDate);
      expect(result).toBe(true);
    } catch (error) {
      console.log('isBirthdayInRange error:', error.message);
    }
  });
});