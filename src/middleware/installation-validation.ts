import { Logger } from '../utils/logger';
import { AppError } from './error-handler';
import { createStorageService } from '../utils/storage';
import { SlackInstallation } from '../types/slack';
import { Env } from '../index';

export interface InstallationValidationOptions {
  required: boolean;
  throwOnMissing: boolean;
}

export interface InstallationValidationResult {
  installation: SlackInstallation | null;
  isValid: boolean;
}

/**
 * Validates that a Slack installation exists for a given team
 */
export async function validateInstallation(
  teamId: string,
  env: Env,
  logger: Logger,
  request?: Request,
  options: InstallationValidationOptions = { required: true, throwOnMissing: true }
): Promise<InstallationValidationResult> {
  logger.info('Validating installation', { teamId });

  try {
    const storageService = createStorageService(env, request);
    const installation = await storageService.getInstallation(teamId);

    if (!installation) {
      logger.warn('No installation found for team', { teamId });
      
      if (options.throwOnMissing) {
        throw new AppError('Installation not found', 404);
      }
      
      return { installation: null, isValid: false };
    }

    logger.info('Installation validated successfully', { teamId });
    return { installation, isValid: true };
  } catch (error) {
    logger.error('Error validating installation', { teamId, error });
    
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError('Installation validation failed', 500);
  }
}

/**
 * Middleware function to validate installation for handlers
 */
export function requireInstallation(
  teamId: string,
  env: Env,
  logger: Logger,
  request?: Request
): Promise<SlackInstallation> {
  return validateInstallation(teamId, env, logger, request, { required: true, throwOnMissing: true })
    .then(result => result.installation!);
}

/**
 * Checks if installation exists without throwing errors
 */
export function checkInstallation(
  teamId: string,
  env: Env,
  logger: Logger,
  request?: Request
): Promise<SlackInstallation | null> {
  return validateInstallation(teamId, env, logger, request, { required: false, throwOnMissing: false })
    .then(result => result.installation);
}