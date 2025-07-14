import { createLogger, Logger } from '../utils/logger';
import { 
  SlackInstallation, 
  SlackHomeView, 
  SlackWebApiResponse, 
  SlackPublishViewResponse, 
  SlackAuthTestResponse 
} from '../types/slack';
import { AppError } from '../middleware/error-handler';
import { API_CONSTANTS } from '../config';

export class SlackApiService {
  private logger: Logger;
  private baseUrl = 'https://slack.com/api';

  constructor(logger?: Logger) {
    this.logger = logger || createLogger();
  }

  /**
   * Publish a home view to Slack
   */
  async publishHomeView(
    installation: SlackInstallation,
    userId: string,
    view: SlackHomeView
  ): Promise<SlackPublishViewResponse> {
    try {
      this.logger.info('Publishing home view', { userId, teamId: installation.teamId });

      const payload = {
        user_id: userId,
        view: view
      };

      const response = await this.makeApiCall(
        'views.publish',
        installation.botToken,
        payload
      );

      if (!response.ok) {
        this.logger.error('Failed to publish home view', {
          userId,
          teamId: installation.teamId,
          error: response.error
        });
        throw new AppError(`Slack API error: ${response.error}`, 500);
      }

      this.logger.info('Home view published successfully', {
        userId,
        teamId: installation.teamId,
        viewId: (response as SlackPublishViewResponse).view?.id
      });

      return response as SlackPublishViewResponse;
    } catch (error) {
      this.logger.error('Error publishing home view', {
        userId,
        teamId: installation.teamId,
        error
      });
      throw error;
    }
  }

  /**
   * Test authentication with Slack API
   */
  async testAuth(installation: SlackInstallation): Promise<boolean> {
    try {
      this.logger.info('Testing authentication', { teamId: installation.teamId });

      const response = await this.makeApiCall(
        'auth.test',
        installation.botToken,
        {}
      ) as SlackAuthTestResponse;

      if (!response.ok) {
        this.logger.warn('Authentication test failed', {
          teamId: installation.teamId,
          error: response.error
        });
        return false;
      }

      this.logger.info('Authentication test successful', {
        teamId: installation.teamId,
        botId: response.user_id
      });

      return true;
    } catch (error) {
      this.logger.error('Error testing authentication', {
        teamId: installation.teamId,
        error
      });
      return false;
    }
  }

  /**
   * Make a generic API call to Slack
   */
  private async makeApiCall(
    method: string,
    token: string,
    payload: Record<string, unknown>
  ): Promise<SlackWebApiResponse> {
    const url = `${this.baseUrl}/${method}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'Dwell Birthday Calendar/1.0'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new AppError(`HTTP error: ${response.status}`, response.status);
    }

    const data = await response.json() as SlackWebApiResponse;
    
    // Log API call details for debugging
    this.logger.debug('Slack API call completed', {
      method,
      success: data.ok,
      error: data.error,
      hasPayload: Object.keys(payload).length > 0
    });

    return data;
  }

  /**
   * Handle rate limiting and retries
   */
  private async makeApiCallWithRetry(
    method: string,
    token: string,
    payload: Record<string, unknown>,
    maxRetries: number = API_CONSTANTS.MAX_RETRIES
  ): Promise<SlackWebApiResponse> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.makeApiCall(method, token, payload);
        
        // Handle rate limiting
        if (response.error === 'rate_limited') {
          const retryAfter = response.retry_after as number || 1;
          this.logger.warn('Rate limited, retrying after delay', {
            method,
            attempt,
            retryAfter
          });
          
          await new Promise(resolve => globalThis.setTimeout(resolve, retryAfter * 1000));
          continue;
        }
        
        return response;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        this.logger.warn('API call failed, retrying', {
          method,
          attempt,
          error: lastError.message
        });
        
        // Exponential backoff
        const delay = Math.min(API_CONSTANTS.INITIAL_RETRY_DELAY * Math.pow(API_CONSTANTS.RETRY_BACKOFF_BASE, attempt - 1), API_CONSTANTS.MAX_RETRY_DELAY);
        await new Promise(resolve => globalThis.setTimeout(resolve, delay));
      }
    }
    
    throw lastError || new Error('Max retries exceeded');
  }
}

/**
 * Create a configured Slack API service instance
 */
export function createSlackApiService(logger?: Logger): SlackApiService {
  return new SlackApiService(logger);
}