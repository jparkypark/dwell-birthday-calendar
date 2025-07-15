import { describe, it, expect } from 'vitest';
import {
  validateBirthdayEntry,
  validateBirthdayData,
  validateBirthdayDataLimits,
  validateBirthdayDataSchema,
  ValidationError
} from '../../../src/utils/validators';
import { Birthday, BirthdayData } from '../../../src/types/birthday';

describe('Validation Utilities - Core Tests', () => {
  describe('validateBirthdayEntry', () => {
    it('should validate valid birthday entry', () => {
      const validEntry = {
        name: 'John Doe',
        month: 1,
        day: 15,
        slackUserId: 'U1234567890'
      };

      const result = validateBirthdayEntry(validEntry);
      expect(result).toEqual(validEntry);
    });

    it('should validate birthday entry without slackUserId', () => {
      const validEntry = {
        name: 'John Doe',
        month: 1,
        day: 15
      };

      const result = validateBirthdayEntry(validEntry);
      expect(result.name).toBe('John Doe');
      expect(result.month).toBe(1);
      expect(result.day).toBe(15);
    });

    it('should trim whitespace from name', () => {
      const entry = {
        name: '  John Doe  ',
        month: 1,
        day: 15
      };

      const result = validateBirthdayEntry(entry);
      expect(result.name).toBe('John Doe');
    });

    it('should reject invalid name', () => {
      expect(() => validateBirthdayEntry({ month: 1, day: 15 }))
        .toThrow(ValidationError);
      expect(() => validateBirthdayEntry({ name: '', month: 1, day: 15 }))
        .toThrow(ValidationError);
      expect(() => validateBirthdayEntry({ name: '   ', month: 1, day: 15 }))
        .toThrow(ValidationError);
    });

    it('should reject invalid month', () => {
      expect(() => validateBirthdayEntry({ name: 'John', month: 0, day: 15 }))
        .toThrow(ValidationError);
      expect(() => validateBirthdayEntry({ name: 'John', month: 13, day: 15 }))
        .toThrow(ValidationError);
    });

    it('should reject invalid day', () => {
      expect(() => validateBirthdayEntry({ name: 'John', month: 1, day: 0 }))
        .toThrow(ValidationError);
      expect(() => validateBirthdayEntry({ name: 'John', month: 1, day: 32 }))
        .toThrow(ValidationError);
    });

    it('should validate month-specific days', () => {
      // February 29th should be accepted (leap year handling)
      expect(() => validateBirthdayEntry({ name: 'John', month: 2, day: 29 }))
        .not.toThrow();
      
      // February 30th should be rejected
      expect(() => validateBirthdayEntry({ name: 'John', month: 2, day: 30 }))
        .toThrow(ValidationError);

      // April 31st should be rejected
      expect(() => validateBirthdayEntry({ name: 'John', month: 4, day: 31 }))
        .toThrow(ValidationError);
    });
  });

  describe('validateBirthdayData', () => {
    it('should validate valid birthday data', () => {
      const validData = {
        birthdays: [
          { name: 'John Doe', month: 1, day: 15, slackUserId: 'U1234567890' },
          { name: 'Jane Smith', month: 2, day: 20 }
        ]
      };

      const result = validateBirthdayData(validData);
      expect(result).toEqual(validData);
    });

    it('should reject non-object data', () => {
      expect(() => validateBirthdayData(null)).toThrow(ValidationError);
      expect(() => validateBirthdayData(undefined)).toThrow(ValidationError);
      expect(() => validateBirthdayData('string')).toThrow(ValidationError);
    });

    it('should reject missing birthdays array', () => {
      expect(() => validateBirthdayData({})).toThrow(ValidationError);
      expect(() => validateBirthdayData({ birthdays: null })).toThrow(ValidationError);
    });

    it('should accept empty birthdays array', () => {
      const emptyData = { birthdays: [] };
      const result = validateBirthdayData(emptyData);
      expect(result).toEqual(emptyData);
    });

    it('should detect duplicate names (case-insensitive)', () => {
      const duplicateData = {
        birthdays: [
          { name: 'John Doe', month: 1, day: 15 },
          { name: 'john doe', month: 2, day: 20 }
        ]
      };

      expect(() => validateBirthdayData(duplicateData)).toThrow(ValidationError);
    });

    it('should validate all entries', () => {
      const invalidData = {
        birthdays: [
          { name: 'John Doe', month: 1, day: 15 }, // Valid
          { name: 'Invalid', month: 13, day: 15 } // Invalid month
        ]
      };

      expect(() => validateBirthdayData(invalidData)).toThrow(ValidationError);
    });
  });

  describe('validateBirthdayDataLimits', () => {
    it('should accept data within limits', () => {
      const validData = {
        birthdays: Array.from({ length: 50 }, (_, i) => ({
          name: `Person ${i}`,
          month: (i % 12) + 1,
          day: (i % 28) + 1
        }))
      };

      expect(() => validateBirthdayDataLimits(validData)).not.toThrow();
    });

    it('should reject data exceeding limits', () => {
      const tooManyBirthdays = {
        birthdays: Array.from({ length: 1001 }, (_, i) => ({
          name: `Person ${i}`,
          month: (i % 12) + 1,
          day: (i % 28) + 1
        }))
      };

      expect(() => validateBirthdayDataLimits(tooManyBirthdays)).toThrow(ValidationError);
    });
  });

  describe('validateBirthdayDataSchema', () => {
    it('should return true for valid data', () => {
      const validData = {
        birthdays: [
          { name: 'John Doe', month: 1, day: 15 }
        ]
      };

      expect(validateBirthdayDataSchema(validData)).toBe(true);
    });

    it('should return false for invalid data', () => {
      const invalidData = {
        birthdays: [
          { name: '', month: 1, day: 15 }
        ]
      };

      expect(validateBirthdayDataSchema(invalidData)).toBe(false);
    });

    it('should not throw errors', () => {
      const malformedData = {
        birthdays: [
          { name: 'John', month: 'invalid', day: 15 }
        ]
      };

      expect(() => validateBirthdayDataSchema(malformedData)).not.toThrow();
      expect(validateBirthdayDataSchema(malformedData)).toBe(false);
    });
  });
});