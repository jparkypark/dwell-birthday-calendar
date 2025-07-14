import { BirthdayData, Birthday } from '../types/birthday';
import { validateBirthdayData, ValidationError } from './validators';

/**
 * Current data schema version
 */
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Data migration result
 */
export interface MigrationResult {
  success: boolean;
  originalVersion: number | null;
  targetVersion: number;
  migratedData?: BirthdayData;
  warnings: string[];
  errors: string[];
}

// Legacy data formats are handled via Record<string, unknown> typing for flexibility

/**
 * Detect the schema version of birthday data
 */
export function detectDataVersion(data: unknown): number | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const obj = data as Record<string, unknown>;

  // Check for version 1 (current format)
  if (Array.isArray(obj.birthdays)) {
    const firstBirthday = obj.birthdays[0];
    if (firstBirthday && typeof firstBirthday === 'object') {
      const birthday = firstBirthday as Record<string, unknown>;
      if (typeof birthday.month === 'number' && typeof birthday.day === 'number' && typeof birthday.name === 'string') {
        return 1;
      }
    }
  }

  // Check for version 0 (legacy format with date strings)
  if (Array.isArray(obj.members) || Array.isArray(obj.birthdays)) {
    const members = obj.members || obj.birthdays;
    if (Array.isArray(members) && members.length > 0) {
      const firstMember = members[0];
      if (firstMember && typeof firstMember === 'object') {
        const member = firstMember as Record<string, unknown>;
        if (typeof member.date === 'string' && typeof member.name === 'string') {
          return 0;
        }
      }
    }
  }

  return null;
}

/**
 * Migrate data to the latest format
 */
export function migrateToLatestFormat(data: unknown): MigrationResult {
  const result: MigrationResult = {
    success: false,
    originalVersion: detectDataVersion(data),
    targetVersion: CURRENT_SCHEMA_VERSION,
    warnings: [],
    errors: []
  };

  try {
    // If data is already in the latest format, validate and return
    if (result.originalVersion === CURRENT_SCHEMA_VERSION) {
      const validatedData = validateBirthdayData(data);
      result.migratedData = validatedData;
      result.success = true;
      return result;
    }

    // If we can't detect the version, try to infer and migrate
    if (result.originalVersion === null) {
      result.warnings.push('Could not detect data version, attempting automatic migration');
      
      // Try to migrate as if it's version 0
      const migrated = migrateFromV0(data);
      if (migrated) {
        result.migratedData = migrated.data;
        result.warnings.push(...migrated.warnings);
        result.errors.push(...migrated.errors);
        result.success = migrated.success;
        return result;
      }

      result.errors.push('Unable to automatically migrate data');
      return result;
    }

    // Migrate from specific versions
    switch (result.originalVersion) {
      case 0: {
        const v0Result = migrateFromV0(data);
        result.migratedData = v0Result.data;
        result.warnings.push(...v0Result.warnings);
        result.errors.push(...v0Result.errors);
        result.success = v0Result.success;
        break;
      }
      default:
        result.errors.push(`Unsupported data version: ${result.originalVersion}`);
        break;
    }

    return result;
  } catch (error) {
    result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

/**
 * Migrate from version 0 (legacy format with date strings)
 */
function migrateFromV0(data: unknown): { data?: BirthdayData; success: boolean; warnings: string[]; errors: string[] } {
  const result = {
    success: false,
    warnings: [] as string[],
    errors: [] as string[]
  };

  try {
    if (!data || typeof data !== 'object') {
      result.errors.push('Invalid data format');
      return result;
    }

    const obj = data as Record<string, unknown>;
    const legacyBirthdays = obj.members || obj.birthdays;

    if (!Array.isArray(legacyBirthdays)) {
      result.errors.push('No birthday array found in legacy data');
      return result;
    }

    const migratedBirthdays: Birthday[] = [];

    for (let i = 0; i < legacyBirthdays.length; i++) {
      const legacy = legacyBirthdays[i];
      
      if (!legacy || typeof legacy !== 'object') {
        result.warnings.push(`Skipping invalid birthday entry at index ${i}`);
        continue;
      }

      const legacyBirthday = legacy as Record<string, unknown>;

      try {
        const migrated = migrateLegacyBirthday(legacyBirthday);
        migratedBirthdays.push(migrated);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        result.warnings.push(`Skipping birthday entry at index ${i}: ${message}`);
      }
    }

    if (migratedBirthdays.length === 0) {
      result.errors.push('No valid birthdays could be migrated');
      return result;
    }

    const birthdayData: BirthdayData = { birthdays: migratedBirthdays };
    
    // Validate the migrated data
    const validatedData = validateBirthdayData(birthdayData);
    
    result.success = true;
    return { ...result, data: validatedData };
  } catch (error) {
    result.errors.push(`V0 migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

/**
 * Migrate a single legacy birthday entry
 */
function migrateLegacyBirthday(legacy: Record<string, unknown>): Birthday {
  if (typeof legacy.name !== 'string') {
    throw new ValidationError('Missing or invalid name');
  }

  if (typeof legacy.date !== 'string') {
    throw new ValidationError('Missing or invalid date');
  }

  // Parse legacy date format (MM/DD or MM-DD)
  const dateParts = legacy.date.split(/[/-]/);
  if (dateParts.length !== 2) {
    throw new ValidationError(`Invalid date format: ${legacy.date}. Expected MM/DD or MM-DD`);
  }

  const month = parseInt(dateParts[0], 10);
  const day = parseInt(dateParts[1], 10);

  if (isNaN(month) || isNaN(day)) {
    throw new ValidationError(`Invalid date numbers in: ${legacy.date}`);
  }

  const birthday: Birthday = {
    name: legacy.name.trim(),
    month,
    day
  };

  // Migrate optional slackUserId
  if (legacy.slackUserId && typeof legacy.slackUserId === 'string') {
    const slackUserId = legacy.slackUserId.trim();
    if (slackUserId.length > 0) {
      birthday.slackUserId = slackUserId;
    }
  }

  return birthday;
}

/**
 * Validate that data matches the expected current schema
 */
export function validateDataVersion(data: unknown): boolean {
  try {
    const version = detectDataVersion(data);
    return version === CURRENT_SCHEMA_VERSION;
  } catch {
    return false;
  }
}

/**
 * Create a backup-friendly representation of birthday data
 */
export function createDataBackup(data: BirthdayData): string {
  const backup = {
    version: CURRENT_SCHEMA_VERSION,
    timestamp: new Date().toISOString(),
    data
  };
  
  return JSON.stringify(backup, null, 2);
}

/**
 * Restore data from a backup
 */
export function restoreFromBackup(backupString: string): MigrationResult {
  const result: MigrationResult = {
    success: false,
    originalVersion: null,
    targetVersion: CURRENT_SCHEMA_VERSION,
    warnings: [],
    errors: []
  };

  try {
    const backup = JSON.parse(backupString);
    
    if (!backup || typeof backup !== 'object') {
      result.errors.push('Invalid backup format');
      return result;
    }

    // If this is a modern backup with version info
    if (backup.version && backup.data) {
      result.originalVersion = backup.version;
      return migrateToLatestFormat(backup.data);
    }

    // If this is raw data without backup wrapper
    return migrateToLatestFormat(backup);
  } catch (error) {
    result.errors.push(`Failed to parse backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

/**
 * Check if migration is needed
 */
export function needsMigration(data: unknown): boolean {
  const version = detectDataVersion(data);
  return version !== null && version < CURRENT_SCHEMA_VERSION;
}

/**
 * Get human-readable migration summary
 */
export function getMigrationSummary(result: MigrationResult): string {
  if (result.success) {
    const birthdayCount = result.migratedData?.birthdays.length || 0;
    let summary = `Successfully migrated ${birthdayCount} birthdays`;
    
    if (result.originalVersion !== null) {
      summary += ` from version ${result.originalVersion} to version ${result.targetVersion}`;
    }
    
    if (result.warnings.length > 0) {
      summary += ` with ${result.warnings.length} warnings`;
    }
    
    return summary;
  } else {
    return `Migration failed: ${result.errors.join(', ')}`;
  }
}