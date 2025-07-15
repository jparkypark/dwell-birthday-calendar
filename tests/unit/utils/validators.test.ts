import { describe, it, expect, vi } from 'vitest';
import {
  validateBirthdayEntry,
  validateBirthdayData,
  validateBirthdayDataLimits,
  validateBirthdayDataSchema,
  ValidationError
} from '@/utils/validators';
import { Birthday, BirthdayData } from '@/types/birthday';

describe('Validation Utilities', () => {
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
      expect(result.slackUserId).toBeUndefined();
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

    it('should validate empty slackUserId', () => {
      const entry = {
        name: 'John Doe',
        month: 1,
        day: 15,
        slackUserId: ''
      };

      const result = validateBirthdayEntry(entry);
      expect(result.slackUserId).toBeUndefined();
    });

    describe('Name validation', () => {
      it('should reject null/undefined name', () => {
        expect(() => validateBirthdayEntry({ month: 1, day: 15 }))
          .toThrow(ValidationError);
        expect(() => validateBirthdayEntry({ name: null, month: 1, day: 15 }))
          .toThrow(ValidationError);
      });

      it('should reject non-string name', () => {
        expect(() => validateBirthdayEntry({ name: 123, month: 1, day: 15 }))
          .toThrow(ValidationError);
        expect(() => validateBirthdayEntry({ name: true, month: 1, day: 15 }))
          .toThrow(ValidationError);
      });

      it('should reject empty/whitespace name', () => {
        expect(() => validateBirthdayEntry({ name: '', month: 1, day: 15 }))
          .toThrow(ValidationError);
        expect(() => validateBirthdayEntry({ name: '   ', month: 1, day: 15 }))
          .toThrow(ValidationError);
      });

      it('should reject name that is too long', () => {
        const longName = 'a'.repeat(101); // Assuming 100 char limit
        expect(() => validateBirthdayEntry({ name: longName, month: 1, day: 15 }))
          .toThrow(ValidationError);
      });
    });

    describe('Month validation', () => {
      it('should reject invalid month values', () => {
        expect(() => validateBirthdayEntry({ name: 'John', month: 0, day: 15 }))
          .toThrow(ValidationError);
        expect(() => validateBirthdayEntry({ name: 'John', month: 13, day: 15 }))
          .toThrow(ValidationError);
        expect(() => validateBirthdayEntry({ name: 'John', month: -1, day: 15 }))
          .toThrow(ValidationError);
      });

      it('should handle non-integer month by flooring', () => {
        // The implementation uses Math.floor for months
        expect(() => validateBirthdayEntry({ name: 'John', month: 1.5, day: 15 }))
          .not.toThrow();
        expect(() => validateBirthdayEntry({ name: 'John', month: '1', day: 15 }))
          .toThrow(ValidationError); // String is still invalid
      });

      it('should reject missing month', () => {
        expect(() => validateBirthdayEntry({ name: 'John', day: 15 }))
          .toThrow(ValidationError);
      });
    });

    describe('Day validation', () => {
      it('should reject invalid day values', () => {
        expect(() => validateBirthdayEntry({ name: 'John', month: 1, day: 0 }))
          .toThrow(ValidationError);
        expect(() => validateBirthdayEntry({ name: 'John', month: 1, day: 32 }))
          .toThrow(ValidationError);
        expect(() => validateBirthdayEntry({ name: 'John', month: 1, day: -1 }))
          .toThrow(ValidationError);
      });

      it('should validate days per month correctly', () => {
        // February (non-leap year)
        expect(() => validateBirthdayEntry({ name: 'John', month: 2, day: 29 }))
          .not.toThrow(); // Should accept Feb 29 (handled as leap year)
        expect(() => validateBirthdayEntry({ name: 'John', month: 2, day: 30 }))
          .toThrow(ValidationError);

        // April (30 days)
        expect(() => validateBirthdayEntry({ name: 'John', month: 4, day: 30 }))
          .not.toThrow();
        expect(() => validateBirthdayEntry({ name: 'John', month: 4, day: 31 }))
          .toThrow(ValidationError);

        // January (31 days)
        expect(() => validateBirthdayEntry({ name: 'John', month: 1, day: 31 }))
          .not.toThrow();
      });

      it('should handle non-integer day by flooring', () => {
        // The implementation uses Math.floor for days
        expect(() => validateBirthdayEntry({ name: 'John', month: 1, day: 15.5 }))
          .not.toThrow();
        expect(() => validateBirthdayEntry({ name: 'John', month: 1, day: '15' }))
          .toThrow(ValidationError); // String is still invalid
      });

      it('should reject missing day', () => {
        expect(() => validateBirthdayEntry({ name: 'John', month: 1 }))
          .toThrow(ValidationError);
      });
    });

    describe('SlackUserId validation', () => {
      it('should validate proper Slack user IDs', () => {
        const validIds = ['U1234567890', 'U123456789', 'USLACKBOT'];
        
        validIds.forEach(id => {
          expect(() => validateBirthdayEntry({ 
            name: 'John', 
            month: 1, 
            day: 15, 
            slackUserId: id 
          })).not.toThrow();
        });
      });

      it('should reject invalid Slack user IDs', () => {
        const invalidIds = ['invalid', '123', 'T1234567890', 'C1234567890'];
        
        invalidIds.forEach(id => {
          expect(() => validateBirthdayEntry({ 
            name: 'John', 
            month: 1, 
            day: 15, 
            slackUserId: id 
          })).toThrow(ValidationError);
        });
      });

      it('should reject non-string slackUserId', () => {
        expect(() => validateBirthdayEntry({ 
          name: 'John', 
          month: 1, 
          day: 15, 
          slackUserId: 123 
        })).toThrow(ValidationError);
      });
    });

    describe('Special character handling', () => {
      it('should handle special characters safely', () => {
        const safeSpecialChars = [
          "O'Connor",
          "José María",
          "Anne-Marie",
          "李小明",
          "🎂 John"
        ];

        safeSpecialChars.forEach(name => {
          expect(() => validateBirthdayEntry({ 
            name, 
            month: 1, 
            day: 15 
          })).not.toThrow();
        });
      });

      it('should accept various name formats', () => {
        const validNames = [
          '<script>alert("xss")</script>', // No XSS protection in current implementation
          'John & Jane',
          'Mary-Sue',
          'Dr. Smith Jr.'
        ];

        validNames.forEach(name => {
          expect(() => validateBirthdayEntry({ 
            name, 
            month: 1, 
            day: 15 
          })).not.toThrow();
        });
      });
    });

    describe('Error messages', () => {
      it('should provide specific error messages', () => {
        try {
          validateBirthdayEntry({ name: '', month: 1, day: 15 });
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          expect((error as ValidationError).message).toContain('name');
          expect((error as ValidationError).field).toBe('name');
        }

        try {
          validateBirthdayEntry({ name: 'John', month: 13, day: 15 });
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          expect((error as ValidationError).message).toContain('Month must be between');
          expect((error as ValidationError).field).toBe('month');
        }
      });
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
      expect(() => validateBirthdayData(123)).toThrow(ValidationError);
    });

    it('should reject missing birthdays array', () => {
      expect(() => validateBirthdayData({})).toThrow(ValidationError);
      expect(() => validateBirthdayData({ birthdays: null })).toThrow(ValidationError);
      expect(() => validateBirthdayData({ birthdays: 'not array' })).toThrow(ValidationError);
    });

    it('should validate empty birthdays array', () => {
      const emptyData = { birthdays: [] };
      const result = validateBirthdayData(emptyData);
      expect(result).toEqual(emptyData);
    });

    it('should detect duplicate names', () => {
      const duplicateData = {
        birthdays: [
          { name: 'John Doe', month: 1, day: 15 },
          { name: 'john doe', month: 2, day: 20 } // Case-insensitive duplicate
        ]
      };

      expect(() => validateBirthdayData(duplicateData)).toThrow(ValidationError);
    });

    it('should validate all birthday entries', () => {
      const invalidData = {
        birthdays: [
          { name: 'John Doe', month: 1, day: 15 }, // Valid
          { name: 'Invalid', month: 13, day: 15 } // Invalid month
        ]
      };

      expect(() => validateBirthdayData(invalidData)).toThrow(ValidationError);
    });

    it('should provide context for validation errors', () => {
      const invalidData = {
        birthdays: [
          { name: 'John Doe', month: 1, day: 15 },
          { name: '', month: 1, day: 15 } // Invalid name at index 1
        ]
      };

      try {
        validateBirthdayData(invalidData);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain('Birthday entry 1');
      }
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

    it('should provide specific error message for limit exceeded', () => {
      const tooManyBirthdays = {
        birthdays: Array.from({ length: 1001 }, (_, i) => ({
          name: `Person ${i}`,
          month: (i % 12) + 1,
          day: (i % 28) + 1
        }))
      };

      try {
        validateBirthdayDataLimits(tooManyBirthdays);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain('1001');
        expect((error as ValidationError).message).toContain('Maximum allowed');
      }
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

    it('should return false for malformed data', () => {
      expect(validateBirthdayDataSchema(null)).toBe(false);
      expect(validateBirthdayDataSchema(undefined)).toBe(false);
      expect(validateBirthdayDataSchema('string')).toBe(false);
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

  describe('Performance tests', () => {
    it('should validate large datasets efficiently', () => {
      const largeData = {
        birthdays: Array.from({ length: 1000 }, (_, i) => ({
          name: `Person ${i}`,
          month: (i % 12) + 1,
          day: (i % 28) + 1,
          slackUserId: `U${String(i).padStart(9, '0')}`
        }))
      };

      const start = performance.now();
      const result = validateBirthdayData(largeData);
      const end = performance.now();

      expect(result).toBeDefined();
      expect(end - start).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe('Integration with Birthday type', () => {
    it('should work with TypeScript Birthday type', () => {
      const typedBirthday: Birthday = {
        name: 'John Doe',
        month: 1,
        day: 15,
        slackUserId: 'U1234567890'
      };

      expect(() => validateBirthdayEntry(typedBirthday)).not.toThrow();
    });

    it('should work with BirthdayData type', () => {
      const typedData: BirthdayData = {
        birthdays: [
          { name: 'John Doe', month: 1, day: 15, slackUserId: 'U1234567890' },
          { name: 'Jane Smith', month: 2, day: 20 }
        ]
      };

      expect(() => validateBirthdayData(typedData)).not.toThrow();
    });
  });
});