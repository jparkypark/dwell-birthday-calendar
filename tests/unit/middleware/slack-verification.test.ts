import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { verifySlackRequest, createSlackVerificationMiddleware } from '@/middleware/slack-verification';
import { Env } from '@/index';

// Mock dependencies
vi.mock('@/utils/crypto');

import { verifySlackSignature } from '@/utils/crypto';

describe('Slack Verification Middleware', () => {
  let mockEnv: Env;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockEnv = {
      SLACK_SIGNING_SECRET: 'test-signing-secret',
      ADMIN_PASSWORD: 'test-password',
      BIRTHDAY_KV: {} as any,
    };
  });

  describe('verifySlackRequest', () => {
    it('should verify valid Slack request', async () => {
      // Setup
      const mockRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        headers: {
          'X-Slack-Request-Timestamp': '1531420618',
          'X-Slack-Signature': 'v0=a2114d57b48eac39b9ad189dd8316235a7b4a8d21a10bd27519666489c69b503',
        },
        body: 'test body',
      });

      const body = 'test body';
      (verifySlackSignature as Mock).mockResolvedValue(true);

      // Execute
      const result = await verifySlackRequest(mockRequest, mockEnv, body);

      // Verify
      expect(result).toBe(true);
      expect(verifySlackSignature).toHaveBeenCalledWith(
        body,
        '1531420618',
        'v0=a2114d57b48eac39b9ad189dd8316235a7b4a8d21a10bd27519666489c69b503',
        'test-signing-secret'
      );
    });

    it('should reject request with missing timestamp', async () => {
      // Setup
      const mockRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        headers: {
          'X-Slack-Signature': 'v0=a2114d57b48eac39b9ad189dd8316235a7b4a8d21a10bd27519666489c69b503',
        },
        body: 'test body',
      });

      const body = 'test body';

      // Execute
      const result = await verifySlackRequest(mockRequest, mockEnv, body);

      // Verify
      expect(result).toBe(false);
      expect(verifySlackSignature).not.toHaveBeenCalled();
    });

    it('should reject request with missing signature', async () => {
      // Setup
      const mockRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        headers: {
          'X-Slack-Request-Timestamp': '1531420618',
        },
        body: 'test body',
      });

      const body = 'test body';

      // Execute
      const result = await verifySlackRequest(mockRequest, mockEnv, body);

      // Verify
      expect(result).toBe(false);
      expect(verifySlackSignature).not.toHaveBeenCalled();
    });

    it('should reject request with missing signing secret', async () => {
      // Setup
      const mockRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        headers: {
          'X-Slack-Request-Timestamp': '1531420618',
          'X-Slack-Signature': 'v0=a2114d57b48eac39b9ad189dd8316235a7b4a8d21a10bd27519666489c69b503',
        },
        body: 'test body',
      });

      const envWithoutSecret = {
        ...mockEnv,
        SLACK_SIGNING_SECRET: '',
      };

      const body = 'test body';

      // Execute
      const result = await verifySlackRequest(mockRequest, envWithoutSecret, body);

      // Verify
      expect(result).toBe(false);
      expect(verifySlackSignature).not.toHaveBeenCalled();
    });

    it('should handle crypto verification failure', async () => {
      // Setup
      const mockRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        headers: {
          'X-Slack-Request-Timestamp': '1531420618',
          'X-Slack-Signature': 'v0=invalid-signature',
        },
        body: 'test body',
      });

      const body = 'test body';
      (verifySlackSignature as Mock).mockResolvedValue(false);

      // Execute
      const result = await verifySlackRequest(mockRequest, mockEnv, body);

      // Verify
      expect(result).toBe(false);
      expect(verifySlackSignature).toHaveBeenCalledWith(
        body,
        '1531420618',
        'v0=invalid-signature',
        'test-signing-secret'
      );
    });

    it('should handle crypto verification error', async () => {
      // Setup
      const mockRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        headers: {
          'X-Slack-Request-Timestamp': '1531420618',
          'X-Slack-Signature': 'v0=a2114d57b48eac39b9ad189dd8316235a7b4a8d21a10bd27519666489c69b503',
        },
        body: 'test body',
      });

      const body = 'test body';
      (verifySlackSignature as Mock).mockRejectedValue(new Error('Crypto error'));

      // Execute & Verify
      await expect(verifySlackRequest(mockRequest, mockEnv, body))
        .rejects.toThrow('Crypto error');
    });

    it('should handle empty body', async () => {
      // Setup
      const mockRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        headers: {
          'X-Slack-Request-Timestamp': '1531420618',
          'X-Slack-Signature': 'v0=a2114d57b48eac39b9ad189dd8316235a7b4a8d21a10bd27519666489c69b503',
        },
        body: '',
      });

      const body = '';
      (verifySlackSignature as Mock).mockResolvedValue(true);

      // Execute
      const result = await verifySlackRequest(mockRequest, mockEnv, body);

      // Verify
      expect(result).toBe(true);
      expect(verifySlackSignature).toHaveBeenCalledWith(
        '',
        '1531420618',
        'v0=a2114d57b48eac39b9ad189dd8316235a7b4a8d21a10bd27519666489c69b503',
        'test-signing-secret'
      );
    });

    it('should handle null headers gracefully', async () => {
      // Setup - manually create request with potentially null headers
      const mockRequest = {
        headers: {
          get: vi.fn().mockReturnValue(null),
        },
      } as any as Request;

      const body = 'test body';

      // Execute
      const result = await verifySlackRequest(mockRequest, mockEnv, body);

      // Verify
      expect(result).toBe(false);
      expect(mockRequest.headers.get).toHaveBeenCalledWith('X-Slack-Request-Timestamp');
      expect(mockRequest.headers.get).toHaveBeenCalledWith('X-Slack-Signature');
      expect(verifySlackSignature).not.toHaveBeenCalled();
    });

    it('should handle different signature formats', async () => {
      // Setup
      const mockRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        headers: {
          'X-Slack-Request-Timestamp': '1531420618',
          'X-Slack-Signature': 'v1=different-version-signature',
        },
        body: 'test body',
      });

      const body = 'test body';
      (verifySlackSignature as Mock).mockResolvedValue(true);

      // Execute
      const result = await verifySlackRequest(mockRequest, mockEnv, body);

      // Verify
      expect(result).toBe(true);
      expect(verifySlackSignature).toHaveBeenCalledWith(
        body,
        '1531420618',
        'v1=different-version-signature',
        'test-signing-secret'
      );
    });
  });

  describe('createSlackVerificationMiddleware', () => {
    it('should return null for valid requests', async () => {
      // Setup
      const middleware = createSlackVerificationMiddleware();
      const mockRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        headers: {
          'X-Slack-Request-Timestamp': '1531420618',
          'X-Slack-Signature': 'v0=a2114d57b48eac39b9ad189dd8316235a7b4a8d21a10bd27519666489c69b503',
        },
        body: 'test body',
      });

      const body = 'test body';
      (verifySlackSignature as Mock).mockResolvedValue(true);

      // Execute
      const result = await middleware(mockRequest, mockEnv, body);

      // Verify
      expect(result).toBeNull();
    });

    it('should return 401 response for invalid requests', async () => {
      // Setup
      const middleware = createSlackVerificationMiddleware();
      const mockRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        headers: {
          'X-Slack-Request-Timestamp': '1531420618',
          'X-Slack-Signature': 'v0=invalid-signature',
        },
        body: 'test body',
      });

      const body = 'test body';
      (verifySlackSignature as Mock).mockResolvedValue(false);

      // Execute
      const result = await middleware(mockRequest, mockEnv, body);

      // Verify
      expect(result).toBeInstanceOf(Response);
      expect(result!.status).toBe(401);
      
      const responseText = await result!.text();
      expect(responseText).toBe('Unauthorized');
    });

    it('should handle verification errors in middleware', async () => {
      // Setup
      const middleware = createSlackVerificationMiddleware();
      const mockRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        headers: {
          'X-Slack-Request-Timestamp': '1531420618',
          'X-Slack-Signature': 'v0=a2114d57b48eac39b9ad189dd8316235a7b4a8d21a10bd27519666489c69b503',
        },
        body: 'test body',
      });

      const body = 'test body';
      (verifySlackSignature as Mock).mockRejectedValue(new Error('Verification failed'));

      // Execute & Verify
      await expect(middleware(mockRequest, mockEnv, body))
        .rejects.toThrow('Verification failed');
    });

    it('should handle missing headers in middleware', async () => {
      // Setup
      const middleware = createSlackVerificationMiddleware();
      const mockRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        headers: {},
        body: 'test body',
      });

      const body = 'test body';

      // Execute
      const result = await middleware(mockRequest, mockEnv, body);

      // Verify
      expect(result).toBeInstanceOf(Response);
      expect(result!.status).toBe(401);
      expect(verifySlackSignature).not.toHaveBeenCalled();
    });

    it('should be reusable across multiple requests', async () => {
      // Setup
      const middleware = createSlackVerificationMiddleware();
      const validRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        headers: {
          'X-Slack-Request-Timestamp': '1531420618',
          'X-Slack-Signature': 'v0=valid-signature',
        },
        body: 'test body',
      });

      const invalidRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        headers: {},
        body: 'test body',
      });

      const body = 'test body';
      (verifySlackSignature as Mock).mockResolvedValue(true);

      // Execute
      const validResult = await middleware(validRequest, mockEnv, body);
      const invalidResult = await middleware(invalidRequest, mockEnv, body);

      // Verify
      expect(validResult).toBeNull();
      expect(invalidResult).toBeInstanceOf(Response);
      expect(invalidResult!.status).toBe(401);
    });
  });

  describe('Edge Cases', () => {
    it('should handle extremely long signatures', async () => {
      // Setup
      const longSignature = 'v0=' + 'a'.repeat(1000);
      const mockRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        headers: {
          'X-Slack-Request-Timestamp': '1531420618',
          'X-Slack-Signature': longSignature,
        },
        body: 'test body',
      });

      const body = 'test body';
      (verifySlackSignature as Mock).mockResolvedValue(true);

      // Execute
      const result = await verifySlackRequest(mockRequest, mockEnv, body);

      // Verify
      expect(result).toBe(true);
      expect(verifySlackSignature).toHaveBeenCalledWith(
        body,
        '1531420618',
        longSignature,
        'test-signing-secret'
      );
    });

    it('should handle special characters in body', async () => {
      // Setup
      const specialBody = 'test body with special chars: üñíçødé & émojis 🎂';
      const mockRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        headers: {
          'X-Slack-Request-Timestamp': '1531420618',
          'X-Slack-Signature': 'v0=a2114d57b48eac39b9ad189dd8316235a7b4a8d21a10bd27519666489c69b503',
        },
        body: specialBody,
      });

      (verifySlackSignature as Mock).mockResolvedValue(true);

      // Execute
      const result = await verifySlackRequest(mockRequest, mockEnv, specialBody);

      // Verify
      expect(result).toBe(true);
      expect(verifySlackSignature).toHaveBeenCalledWith(
        specialBody,
        '1531420618',
        'v0=a2114d57b48eac39b9ad189dd8316235a7b4a8d21a10bd27519666489c69b503',
        'test-signing-secret'
      );
    });

    it('should handle malformed timestamp', async () => {
      // Setup
      const mockRequest = new Request('https://test.com/slack/events', {
        method: 'POST',
        headers: {
          'X-Slack-Request-Timestamp': 'not-a-number',
          'X-Slack-Signature': 'v0=a2114d57b48eac39b9ad189dd8316235a7b4a8d21a10bd27519666489c69b503',
        },
        body: 'test body',
      });

      const body = 'test body';
      (verifySlackSignature as Mock).mockResolvedValue(false);

      // Execute
      const result = await verifySlackRequest(mockRequest, mockEnv, body);

      // Verify
      expect(result).toBe(false);
      expect(verifySlackSignature).toHaveBeenCalledWith(
        body,
        'not-a-number',
        'v0=a2114d57b48eac39b9ad189dd8316235a7b4a8d21a10bd27519666489c69b503',
        'test-signing-secret'
      );
    });
  });
});