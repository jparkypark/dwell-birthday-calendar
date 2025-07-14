import { Birthday, BirthdayData } from '../types/birthday';

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validates a single birthday entry
 */
export function validateBirthdayEntry(birthday: unknown): Birthday {
  if (!birthday || typeof birthday !== 'object') {
    throw new ValidationError('Birthday entry must be an object');
  }

  const entry = birthday as Record<string, unknown>;

  // Validate name
  if (!entry.name || typeof entry.name !== 'string') {
    throw new ValidationError('Birthday entry must have a valid name', 'name');
  }

  const name = entry.name.trim();
  if (name.length === 0) {
    throw new ValidationError('Birthday name cannot be empty', 'name');
  }

  if (name.length > 100) {
    throw new ValidationError('Birthday name cannot exceed 100 characters', 'name');
  }

  // Validate month
  if (!entry.month || typeof entry.month !== 'number') {
    throw new ValidationError('Birthday entry must have a valid month', 'month');
  }

  const month = Math.floor(entry.month);
  if (month < 1 || month > 12) {
    throw new ValidationError('Month must be between 1 and 12', 'month');
  }

  // Validate day
  if (!entry.day || typeof entry.day !== 'number') {
    throw new ValidationError('Birthday entry must have a valid day', 'day');
  }

  const day = Math.floor(entry.day);
  if (day < 1 || day > 31) {
    throw new ValidationError('Day must be between 1 and 31', 'day');
  }

  // Validate day exists for the given month
  if (!isValidDate(month, day)) {
    throw new ValidationError(`Invalid date: ${month}/${day}`, 'day');
  }

  // Validate optional slackUserId
  let slackUserId: string | undefined;
  if (entry.slackUserId !== undefined) {
    if (typeof entry.slackUserId !== 'string') {
      throw new ValidationError('slackUserId must be a string', 'slackUserId');
    }
    
    slackUserId = entry.slackUserId.trim();
    if (slackUserId.length === 0) {
      slackUserId = undefined;
    } else if (!/^U[A-Z0-9]{8,}$/.test(slackUserId)) {
      throw new ValidationError('slackUserId must be a valid Slack user ID format (U followed by 8+ characters)', 'slackUserId');
    }
  }

  return {
    name,
    month,
    day,
    slackUserId
  };
}

/**
 * Validates birthday data structure
 */
export function validateBirthdayData(data: unknown): BirthdayData {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Birthday data must be an object');
  }

  const birthdayData = data as Record<string, unknown>;

  if (!Array.isArray(birthdayData.birthdays)) {
    throw new ValidationError('Birthday data must have a birthdays array', 'birthdays');
  }

  const birthdays: Birthday[] = [];
  const seenNames = new Set<string>();

  for (let i = 0; i < birthdayData.birthdays.length; i++) {
    try {
      const birthday = validateBirthdayEntry(birthdayData.birthdays[i]);
      
      // Check for duplicate names
      const normalizedName = birthday.name.toLowerCase();
      if (seenNames.has(normalizedName)) {
        throw new ValidationError(`Duplicate name found: ${birthday.name}`, `birthdays[${i}].name`);
      }
      seenNames.add(normalizedName);

      birthdays.push(birthday);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(`Birthday entry ${i}: ${error.message}`, `birthdays[${i}]${error.field ? '.' + error.field : ''}`);
      }
      throw error;
    }
  }

  return { birthdays };
}

/**
 * Sanitizes birthday input by cleaning and normalizing data
 */
export function sanitizeBirthdayInput(input: unknown): Birthday {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Input must be an object');
  }

  const entry = input as Record<string, unknown>;

  // Sanitize name
  let name = '';
  if (typeof entry.name === 'string') {
    name = entry.name.trim().replace(/\s+/g, ' ');
  }

  // Sanitize month and day
  let month = 0;
  let day = 0;

  if (typeof entry.month === 'number') {
    month = Math.floor(entry.month);
  } else if (typeof entry.month === 'string') {
    const parsed = parseInt(entry.month, 10);
    if (!isNaN(parsed)) {
      month = parsed;
    }
  }

  if (typeof entry.day === 'number') {
    day = Math.floor(entry.day);
  } else if (typeof entry.day === 'string') {
    const parsed = parseInt(entry.day, 10);
    if (!isNaN(parsed)) {
      day = parsed;
    }
  }

  // Sanitize slackUserId
  let slackUserId: string | undefined;
  if (typeof entry.slackUserId === 'string') {
    const trimmed = entry.slackUserId.trim();
    slackUserId = trimmed.length > 0 ? trimmed : undefined;
  }

  // Validate the sanitized data
  return validateBirthdayEntry({
    name,
    month,
    day,
    slackUserId
  });
}

/**
 * Validates if a given month/day combination is a valid date
 */
export function isValidDate(month: number, day: number): boolean {
  // Days in each month (non-leap year)
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  if (month < 1 || month > 12) {
    return false;
  }

  if (day < 1) {
    return false;
  }

  // For February, allow day 29 (leap year handling)
  if (month === 2 && day === 29) {
    return true;
  }

  return day <= daysInMonth[month - 1];
}

/**
 * Validates that birthday data doesn't exceed reasonable limits
 */
export function validateBirthdayDataLimits(data: BirthdayData): void {
  const MAX_BIRTHDAYS = 1000; // Reasonable limit for a church
  
  if (data.birthdays.length > MAX_BIRTHDAYS) {
    throw new ValidationError(`Too many birthdays: ${data.birthdays.length}. Maximum allowed: ${MAX_BIRTHDAYS}`);
  }
}

/**
 * Checks if the birthday data structure matches expected schema version
 */
export function validateBirthdayDataSchema(data: unknown): boolean {
  try {
    validateBirthdayData(data);
    return true;
  } catch {
    return false;
  }
}