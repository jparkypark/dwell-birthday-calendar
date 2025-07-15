import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { handleSlackEvents } from '@/handlers/slack-events';
import { Env } from '@/index';

// Mock dependencies
vi.mock('@/middleware/slack-verification');
vi.mock('@/utils/validation');
vi.mock('@/utils/storage');
vi.mock('@/services/slack-api');
vi.mock('@/services/home-view-generator');
vi.mock('@/utils/logger');

import { verifySlackRequest } from '@/middleware/slack-verification';
import { validateSlackEvent, validateUrlVerification } from '@/utils/validation';
import { createStorageService } from '@/utils/storage';
import { createSlackApiService } from '@/services/slack-api';
import { createHomeViewGenerator } from '@/services/home-view-generator';
import { createLogger } from '@/utils/logger';

describe('Slack Events Handler', () => {
  let mockEnv: Env;
  let mockCtx: ExecutionContext;
  let mockRequest: Request;
  let mockLogger: any;
  let mockStorage: any;
  let mockSlackApi: any;
  let mockHomeViewGenerator: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockEnv = {
      SLACK_SIGNING_SECRET: 'test-signing-secret',
      ADMIN_PASSWORD: 'test-password',
      BIRTHDAY_KV: {} as any,
    };

    mockCtx = {} as ExecutionContext;

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    mockStorage = {
      getInstallation: vi.fn(),
      getCachedHomeView: vi.fn(),
      getBirthdayData: vi.fn(),
      storeCachedHomeView: vi.fn(),
    };

    mockSlackApi = {
      publishHomeView: vi.fn(),
    };

    mockHomeViewGenerator = {
      generateHomeView: vi.fn(),
      generateErrorView: vi.fn(),
    };

    // Setup default mocks
    (createLogger as Mock).mockReturnValue(mockLogger);
    (createStorageService as Mock).mockReturnValue(mockStorage);
    (createSlackApiService as Mock).mockReturnValue(mockSlackApi);
    (createHomeViewGenerator as Mock).mockReturnValue(mockHomeViewGenerator);
    (verifySlackRequest as Mock).mockResolvedValue(true);
    (validateSlackEvent as Mock).mockImplementation(() => {});
    (validateUrlVerification as Mock).mockImplementation(() => {});
  });

  describe('URL Verification', () => {
    it('should handle URL verification challenge', async () => {
      // Setup
      const verificationPayload = {
        type: 'url_verification',
        challenge: 'test-challenge-123',
        token: 'test-token',
      };

      mockRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        body: JSON.stringify(verificationPayload),
        headers: { 'Content-Type': 'application/json' },
      });

      // Execute
      const response = await handleSlackEvents(mockRequest, mockEnv, mockCtx);

      // Verify
      expect(response.status).toBe(200);
      expect(validateUrlVerification).toHaveBeenCalledWith(verificationPayload);
      expect(mockLogger.info).toHaveBeenCalledWith('Handling URL verification challenge');
      
      const responseText = await response.text();
      expect(responseText).toBe('test-challenge-123');
      expect(response.headers.get('Content-Type')).toBe('text/plain');
    });

    it('should log verification details safely', async () => {
      // Setup
      const verificationPayload = {
        type: 'url_verification',
        challenge: 'very-long-challenge-string-12345',
        token: 'very-long-token-string-67890',
      };

      mockRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        body: JSON.stringify(verificationPayload),
        headers: { 'Content-Type': 'application/json' },
      });

      // Execute
      await handleSlackEvents(mockRequest, mockEnv, mockCtx);

      // Verify that sensitive data is truncated in logs
      expect(mockLogger.info).toHaveBeenCalledWith('URL verification details', {
        challenge: 'very-long-...',
        token: 'very-long-...',
      });
    });
  });

  describe('App Home Opened Events', () => {
    it('should handle app_home_opened event with cached view', async () => {
      // Setup
      const eventPayload = {
        type: 'event_callback',
        team_id: 'T123456',
        event: {
          type: 'app_home_opened',
          user: 'U123456',
          tab: 'home',
        },
      };

      mockRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        body: JSON.stringify(eventPayload),
        headers: { 'Content-Type': 'application/json' },
      });

      const mockInstallation = {
        teamId: 'T123456',
        accessToken: 'xoxb-test-token',
      };

      const mockCachedView = {
        type: 'home',
        blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'Cached view' } }],
      };

      mockStorage.getInstallation.mockResolvedValue(mockInstallation);
      mockStorage.getCachedHomeView.mockResolvedValue(mockCachedView);
      mockSlackApi.publishHomeView.mockResolvedValue(undefined);

      // Execute
      const response = await handleSlackEvents(mockRequest, mockEnv, mockCtx);

      // Verify
      expect(response.status).toBe(200);
      expect(mockStorage.getInstallation).toHaveBeenCalledWith('T123456');
      expect(mockStorage.getCachedHomeView).toHaveBeenCalled();
      expect(mockSlackApi.publishHomeView).toHaveBeenCalledWith(
        mockInstallation,
        'U123456',
        mockCachedView
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Using cached home view');
    });

    it('should generate new home view when no cache exists', async () => {
      // Setup
      const eventPayload = {
        type: 'event_callback',
        team_id: 'T123456',
        event: {
          type: 'app_home_opened',
          user: 'U123456',
          tab: 'home',
        },
      };

      mockRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        body: JSON.stringify(eventPayload),
        headers: { 'Content-Type': 'application/json' },
      });

      const mockInstallation = {
        teamId: 'T123456',
        accessToken: 'xoxb-test-token',
      };

      const mockBirthdays = [
        { name: 'John Doe', month: 1, day: 20, slackUserId: 'U1' },
        { name: 'Jane Smith', month: 1, day: 25, slackUserId: 'U2' },
      ];

      const mockHomeView = {
        type: 'home',
        blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'Generated view' } }],
      };

      mockStorage.getInstallation.mockResolvedValue(mockInstallation);
      mockStorage.getCachedHomeView.mockResolvedValue(null);
      mockStorage.getBirthdayData.mockResolvedValue({ birthdays: mockBirthdays });
      mockStorage.storeCachedHomeView.mockResolvedValue(undefined);
      mockHomeViewGenerator.generateHomeView.mockReturnValue(mockHomeView);
      mockSlackApi.publishHomeView.mockResolvedValue(undefined);

      // Execute
      const response = await handleSlackEvents(mockRequest, mockEnv, mockCtx);

      // Verify
      expect(response.status).toBe(200);
      expect(mockStorage.getBirthdayData).toHaveBeenCalled();
      expect(mockHomeViewGenerator.generateHomeView).toHaveBeenCalledWith(mockBirthdays);
      expect(mockStorage.storeCachedHomeView).toHaveBeenCalledWith(mockHomeView, 3600);
      expect(mockSlackApi.publishHomeView).toHaveBeenCalledWith(
        mockInstallation,
        'U123456',
        mockHomeView
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Home view published successfully', {
        teamId: 'T123456',
        userId: 'U123456',
        birthdayCount: 2,
      });
    });

    it('should ignore non-home tab events', async () => {
      // Setup
      const eventPayload = {
        type: 'event_callback',
        team_id: 'T123456',
        event: {
          type: 'app_home_opened',
          user: 'U123456',
          tab: 'messages',
        },
      };

      mockRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        body: JSON.stringify(eventPayload),
        headers: { 'Content-Type': 'application/json' },
      });

      // Execute
      const response = await handleSlackEvents(mockRequest, mockEnv, mockCtx);

      // Verify
      expect(response.status).toBe(200);
      expect(mockLogger.info).toHaveBeenCalledWith('Ignoring non-home tab event');
      expect(mockStorage.getInstallation).not.toHaveBeenCalled();
    });

    it('should handle missing installation gracefully', async () => {
      // Setup
      const eventPayload = {
        type: 'event_callback',
        team_id: 'T123456',
        event: {
          type: 'app_home_opened',
          user: 'U123456',
          tab: 'home',
        },
      };

      mockRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        body: JSON.stringify(eventPayload),
        headers: { 'Content-Type': 'application/json' },
      });

      mockStorage.getInstallation.mockResolvedValue(null);

      // Execute
      const response = await handleSlackEvents(mockRequest, mockEnv, mockCtx);

      // Verify
      expect(response.status).toBe(200);
      expect(mockLogger.warn).toHaveBeenCalledWith('No installation found for team', {
        teamId: 'T123456',
      });
      expect(mockSlackApi.publishHomeView).not.toHaveBeenCalled();
    });

    it('should handle home view generation errors with error view', async () => {
      // Setup
      const eventPayload = {
        type: 'event_callback',
        team_id: 'T123456',
        event: {
          type: 'app_home_opened',
          user: 'U123456',
          tab: 'home',
        },
      };

      mockRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        body: JSON.stringify(eventPayload),
        headers: { 'Content-Type': 'application/json' },
      });

      const mockInstallation = {
        teamId: 'T123456',
        accessToken: 'xoxb-test-token',
      };

      const mockErrorView = {
        type: 'home',
        blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'Error occurred' } }],
      };

      mockStorage.getInstallation.mockResolvedValue(mockInstallation);
      mockStorage.getCachedHomeView.mockResolvedValue(null);
      mockStorage.getBirthdayData.mockRejectedValue(new Error('Storage error'));
      mockHomeViewGenerator.generateErrorView.mockReturnValue(mockErrorView);
      mockSlackApi.publishHomeView.mockResolvedValue(undefined);

      // Execute
      const response = await handleSlackEvents(mockRequest, mockEnv, mockCtx);

      // Verify
      expect(response.status).toBe(200);
      expect(mockLogger.error).toHaveBeenCalledWith('Error handling app_home_opened', {
        teamId: 'T123456',
        error: expect.any(Error),
      });
      expect(mockHomeViewGenerator.generateErrorView).toHaveBeenCalledWith('Storage error');
      expect(mockSlackApi.publishHomeView).toHaveBeenCalledWith(
        mockInstallation,
        'U123456',
        mockErrorView
      );
    });

    it('should handle error view failure gracefully', async () => {
      // Setup
      const eventPayload = {
        type: 'event_callback',
        team_id: 'T123456',
        event: {
          type: 'app_home_opened',
          user: 'U123456',
          tab: 'home',
        },
      };

      mockRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        body: JSON.stringify(eventPayload),
        headers: { 'Content-Type': 'application/json' },
      });

      const mockInstallation = {
        teamId: 'T123456',
        accessToken: 'xoxb-test-token',
      };

      mockStorage.getInstallation
        .mockResolvedValueOnce(mockInstallation) // First call succeeds
        .mockResolvedValueOnce(mockInstallation); // Second call in error handler
      mockStorage.getCachedHomeView.mockResolvedValue(null);
      mockStorage.getBirthdayData.mockRejectedValue(new Error('Storage error'));
      mockHomeViewGenerator.generateErrorView.mockReturnValue({});
      mockSlackApi.publishHomeView.mockRejectedValue(new Error('Slack API error'));

      // Execute
      const response = await handleSlackEvents(mockRequest, mockEnv, mockCtx);

      // Verify
      expect(response.status).toBe(200);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to show error view', {
        errorViewError: expect.any(Error),
      });
    });
  });

  describe('Unknown Events', () => {
    it('should handle unknown event types gracefully', async () => {
      // Setup
      const eventPayload = {
        type: 'event_callback',
        team_id: 'T123456',
        event: {
          type: 'unknown_event',
          user: 'U123456',
        },
      };

      mockRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        body: JSON.stringify(eventPayload),
        headers: { 'Content-Type': 'application/json' },
      });

      // Execute
      const response = await handleSlackEvents(mockRequest, mockEnv, mockCtx);

      // Verify
      expect(response.status).toBe(200);
      expect(mockLogger.warn).toHaveBeenCalledWith('Unhandled event type', {
        eventType: 'unknown_event',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid Slack signature', async () => {
      // Setup
      const eventPayload = {
        type: 'event_callback',
        team_id: 'T123456',
        event: { type: 'app_home_opened' },
      };

      mockRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        body: JSON.stringify(eventPayload),
        headers: { 'Content-Type': 'application/json' },
      });

      (verifySlackRequest as Mock).mockResolvedValue(false);

      // Execute & Verify
      await expect(handleSlackEvents(mockRequest, mockEnv, mockCtx))
        .rejects.toThrow('Invalid request signature');

      expect(mockLogger.warn).toHaveBeenCalledWith('Invalid Slack signature');
    });

    it('should handle invalid JSON payload', async () => {
      // Setup
      mockRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      // Execute & Verify
      await expect(handleSlackEvents(mockRequest, mockEnv, mockCtx))
        .rejects.toThrow('Invalid JSON payload');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to parse request body', {
        error: expect.any(Error),
      });
    });

    it('should handle validation errors', async () => {
      // Setup
      const eventPayload = {
        type: 'event_callback',
        team_id: 'T123456',
        event: { type: 'app_home_opened' },
      };

      mockRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        body: JSON.stringify(eventPayload),
        headers: { 'Content-Type': 'application/json' },
      });

      (validateSlackEvent as Mock).mockImplementation(() => {
        throw new Error('Invalid event format');
      });

      // Execute & Verify
      await expect(handleSlackEvents(mockRequest, mockEnv, mockCtx))
        .rejects.toThrow('Invalid event format');
    });
  });

  describe('Logging', () => {
    it('should log event processing details', async () => {
      // Setup
      const eventPayload = {
        type: 'event_callback',
        team_id: 'T123456',
        event: {
          type: 'app_home_opened',
          user: 'U123456',
          tab: 'home',
        },
      };

      mockRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        body: JSON.stringify(eventPayload),
        headers: { 'Content-Type': 'application/json' },
      });

      mockStorage.getInstallation.mockResolvedValue(null);

      // Execute
      await handleSlackEvents(mockRequest, mockEnv, mockCtx);

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith('Received Slack event request');
      expect(mockLogger.info).toHaveBeenCalledWith('Processing Slack event', {
        eventType: 'app_home_opened',
        teamId: 'T123456',
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Handling app_home_opened event', {
        userId: 'U123456',
        tab: 'home',
        teamId: 'T123456',
      });
    });
  });
});