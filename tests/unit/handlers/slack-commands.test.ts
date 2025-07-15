import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { handleSlackCommands } from '@/handlers/slack-commands';
import { Env } from '@/index';
import { TEST_CONSTANTS } from '@tests/setup';

// Mock dependencies
vi.mock('@/middleware/slack-verification');
vi.mock('@/utils/validation');
vi.mock('@/utils/storage');
vi.mock('@/utils/dates');
vi.mock('@/utils/slack-formatting');
vi.mock('@/utils/logger');

import { verifySlackRequest } from '@/middleware/slack-verification';
import { validateSlackCommand } from '@/utils/validation';
import { createStorageService } from '@/utils/storage';
import { calculateUpcomingBirthdays } from '@/utils/dates';
import { 
  createBirthdaysSlackResponse, 
  createSlackErrorResponse, 
  createSlackInfoResponse 
} from '@/utils/slack-formatting';
import { createLogger } from '@/utils/logger';

describe('Slack Commands Handler', () => {
  let mockEnv: Env;
  let mockCtx: ExecutionContext;
  let mockRequest: Request;
  let mockLogger: any;
  let mockStorage: any;

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
      getBirthdayData: vi.fn(),
    };

    // Setup default mocks
    (createLogger as Mock).mockReturnValue(mockLogger);
    (createStorageService as Mock).mockReturnValue(mockStorage);
    (verifySlackRequest as Mock).mockResolvedValue(true);
    (validateSlackCommand as Mock).mockImplementation(() => {});
  });

  describe('handleSlackCommands', () => {
    it('should handle valid /birthdays command with upcoming birthdays', async () => {
      // Setup
      const formData = new URLSearchParams({
        token: 'test-token',
        team_id: 'T123456',
        team_domain: 'test-team',
        channel_id: 'C123456',
        channel_name: 'general',
        user_id: 'U123456',
        user_name: 'testuser',
        command: '/birthdays',
        text: '',
        response_url: 'https://hooks.slack.com/test',
        trigger_id: 'trigger123',
      });

      mockRequest = new Request('https://test.com/slack/commands', {
        method: 'POST',
        body: formData.toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const mockBirthdays = [
        { name: 'John Doe', month: 1, day: 20, slackUserId: 'U1' },
        { name: 'Jane Smith', month: 1, day: 25, slackUserId: 'U2' },
      ];

      const mockUpcomingBirthdays = [
        { name: 'John Doe', month: 1, day: 20, daysUntil: 5, monthName: 'January', displayDate: 'January 20' },
        { name: 'Jane Smith', month: 1, day: 25, daysUntil: 10, monthName: 'January', displayDate: 'January 25' },
      ];

      const mockSlackResponse = {
        response_type: 'ephemeral',
        blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'Upcoming birthdays!' } }],
      };

      mockStorage.getBirthdayData.mockResolvedValue({ birthdays: mockBirthdays });
      (calculateUpcomingBirthdays as Mock).mockReturnValue(mockUpcomingBirthdays);
      (createBirthdaysSlackResponse as Mock).mockReturnValue(mockSlackResponse);

      // Execute
      const response = await handleSlackCommands(mockRequest, mockEnv, mockCtx);

      // Verify
      expect(response.status).toBe(200);
      expect(verifySlackRequest).toHaveBeenCalledWith(mockRequest, mockEnv, expect.any(String));
      expect(validateSlackCommand).toHaveBeenCalled();
      expect(mockStorage.getBirthdayData).toHaveBeenCalled();
      expect(calculateUpcomingBirthdays).toHaveBeenCalledWith(mockBirthdays, 30);
      expect(createBirthdaysSlackResponse).toHaveBeenCalledWith(mockUpcomingBirthdays);

      const responseBody = await response.json();
      expect(responseBody).toEqual(mockSlackResponse);
    });

    it('should handle /birthdays command with no birthday data', async () => {
      // Setup
      const formData = new URLSearchParams({
        command: '/birthdays',
        user_id: 'U123456',
        team_id: 'T123456',
      });

      mockRequest = new Request('https://test.com/slack/commands', {
        method: 'POST',
        body: formData.toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const mockInfoResponse = {
        response_type: 'ephemeral',
        text: 'No birthday data available',
      };

      mockStorage.getBirthdayData.mockResolvedValue({ birthdays: [] });
      (createSlackInfoResponse as Mock).mockReturnValue(mockInfoResponse);

      // Execute
      const response = await handleSlackCommands(mockRequest, mockEnv, mockCtx);

      // Verify
      expect(response.status).toBe(200);
      expect(createSlackInfoResponse).toHaveBeenCalledWith(
        '📅 No birthday data available',
        expect.stringContaining('no birthday information has been added')
      );

      const responseBody = await response.json();
      expect(responseBody).toEqual(mockInfoResponse);
    });

    it('should handle /birthdays command with no upcoming birthdays', async () => {
      // Setup
      const formData = new URLSearchParams({
        command: '/birthdays',
        user_id: 'U123456',
        team_id: 'T123456',
      });

      mockRequest = new Request('https://test.com/slack/commands', {
        method: 'POST',
        body: formData.toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const mockBirthdays = [
        { name: 'Future Birthday', month: 12, day: 31, slackUserId: 'U1' },
      ];

      const mockInfoResponse = {
        response_type: 'ephemeral',
        text: 'No upcoming birthdays',
      };

      mockStorage.getBirthdayData.mockResolvedValue({ birthdays: mockBirthdays });
      (calculateUpcomingBirthdays as Mock).mockReturnValue([]);
      (createSlackInfoResponse as Mock).mockReturnValue(mockInfoResponse);

      // Execute
      const response = await handleSlackCommands(mockRequest, mockEnv, mockCtx);

      // Verify
      expect(response.status).toBe(200);
      expect(calculateUpcomingBirthdays).toHaveBeenCalledWith(mockBirthdays, 30);
      expect(createSlackInfoResponse).toHaveBeenCalledWith(
        '🎉 No upcoming birthdays in the next 30 days',
        expect.stringContaining('no birthdays coming up')
      );

      const responseBody = await response.json();
      expect(responseBody).toEqual(mockInfoResponse);
    });

    it('should handle unknown commands', async () => {
      // Setup
      const formData = new URLSearchParams({
        command: '/unknown',
        user_id: 'U123456',
        team_id: 'T123456',
      });

      mockRequest = new Request('https://test.com/slack/commands', {
        method: 'POST',
        body: formData.toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      // Execute
      const response = await handleSlackCommands(mockRequest, mockEnv, mockCtx);

      // Verify
      expect(response.status).toBe(200);
      expect(mockLogger.warn).toHaveBeenCalledWith('Unknown command', { command: '/unknown' });

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        response_type: 'ephemeral',
        text: 'Unknown command. Use `/birthdays` to see upcoming birthdays.',
      });
    });

    it('should handle invalid Slack signature', async () => {
      // Setup
      const formData = new URLSearchParams({
        command: '/birthdays',
        user_id: 'U123456',
        team_id: 'T123456',
      });

      mockRequest = new Request('https://test.com/slack/commands', {
        method: 'POST',
        body: formData.toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      (verifySlackRequest as Mock).mockResolvedValue(false);

      // Execute & Verify
      await expect(handleSlackCommands(mockRequest, mockEnv, mockCtx))
        .rejects.toThrow('Invalid request signature');

      expect(mockLogger.warn).toHaveBeenCalledWith('Invalid Slack signature');
    });

    it('should handle validation errors', async () => {
      // Setup
      const formData = new URLSearchParams({
        command: '/birthdays',
        user_id: 'U123456',
        team_id: 'T123456',
      });

      mockRequest = new Request('https://test.com/slack/commands', {
        method: 'POST',
        body: formData.toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      (validateSlackCommand as Mock).mockImplementation(() => {
        throw new Error('Invalid command format');
      });

      // Execute & Verify
      await expect(handleSlackCommands(mockRequest, mockEnv, mockCtx))
        .rejects.toThrow('Invalid command format');
    });

    it('should handle storage errors gracefully', async () => {
      // Setup
      const formData = new URLSearchParams({
        command: '/birthdays',
        user_id: 'U123456',
        team_id: 'T123456',
      });

      mockRequest = new Request('https://test.com/slack/commands', {
        method: 'POST',
        body: formData.toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const mockErrorResponse = {
        response_type: 'ephemeral',
        text: 'Error occurred',
      };

      mockStorage.getBirthdayData.mockRejectedValue(new Error('Storage error'));
      (createSlackErrorResponse as Mock).mockReturnValue(mockErrorResponse);

      // Execute
      const response = await handleSlackCommands(mockRequest, mockEnv, mockCtx);

      // Verify
      expect(response.status).toBe(200);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error handling birthdays command',
        expect.objectContaining({
          error: 'Storage error',
          stack: expect.any(String),
        })
      );
      expect(createSlackErrorResponse).toHaveBeenCalledWith(
        'Sorry, I encountered an error while fetching birthday data. Please try again later.'
      );

      const responseBody = await response.json();
      expect(responseBody).toEqual(mockErrorResponse);
    });

    it('should log command processing details', async () => {
      // Setup
      const formData = new URLSearchParams({
        command: '/birthdays',
        user_id: 'U123456',
        team_id: 'T123456',
        user_name: 'testuser',
      });

      mockRequest = new Request('https://test.com/slack/commands', {
        method: 'POST',
        body: formData.toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      mockStorage.getBirthdayData.mockResolvedValue({ birthdays: [] });

      // Execute
      await handleSlackCommands(mockRequest, mockEnv, mockCtx);

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith('Received Slack command request');
      expect(mockLogger.info).toHaveBeenCalledWith('Processing Slack command', {
        command: '/birthdays',
        userId: 'U123456',
        teamId: 'T123456',
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Handling /birthdays command', { userId: 'U123456' });
    });

    it('should parse form data correctly', async () => {
      // Setup with all possible fields
      const formData = new URLSearchParams({
        token: 'test-token',
        team_id: 'T123456',
        team_domain: 'test-team',
        channel_id: 'C123456',
        channel_name: 'general',
        user_id: 'U123456',
        user_name: 'testuser',
        command: '/birthdays',
        text: 'optional text',
        response_url: 'https://hooks.slack.com/test',
        trigger_id: 'trigger123',
      });

      mockRequest = new Request('https://test.com/slack/commands', {
        method: 'POST',
        body: formData.toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      mockStorage.getBirthdayData.mockResolvedValue({ birthdays: [] });

      // Execute
      await handleSlackCommands(mockRequest, mockEnv, mockCtx);

      // Verify that validateSlackCommand was called with correct parsed data
      expect(validateSlackCommand).toHaveBeenCalledWith({
        token: 'test-token',
        team_id: 'T123456',
        team_domain: 'test-team',
        channel_id: 'C123456',
        channel_name: 'general',
        user_id: 'U123456',
        user_name: 'testuser',
        command: '/birthdays',
        text: 'optional text',
        response_url: 'https://hooks.slack.com/test',
        trigger_id: 'trigger123',
      });
    });
  });
});