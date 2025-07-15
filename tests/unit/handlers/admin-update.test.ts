import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { AdminUpdateHandler } from '@/handlers/admin-update';
import { HandlerContext } from '@/utils/handler-utils';
import { Env } from '@/index';

// Mock dependencies
vi.mock('@/utils/storage');
vi.mock('@/utils/validators');
vi.mock('@/utils/logger');

import { createStorageService } from '@/utils/storage';
import { validateBirthdayData } from '@/utils/validators';
import { createLogger } from '@/utils/logger';

describe('AdminUpdateHandler', () => {
  let handler: AdminUpdateHandler;
  let mockContext: HandlerContext;
  let mockLogger: any;
  let mockStorage: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    handler = new AdminUpdateHandler();
    
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    mockStorage = {
      storeBirthdayData: vi.fn(),
      clearCache: vi.fn(),
    };

    const mockEnv: Env = {
      SLACK_SIGNING_SECRET: 'test-signing-secret',
      ADMIN_PASSWORD: 'test-password',
      BIRTHDAY_KV: {} as any,
    };

    mockContext = {
      env: mockEnv,
      logger: mockLogger,
      request: {} as Request,
      ctx: {} as ExecutionContext,
    };

    // Setup default mocks
    (createLogger as Mock).mockReturnValue(mockLogger);
    (createStorageService as Mock).mockReturnValue(mockStorage);
    (validateBirthdayData as Mock).mockImplementation((data) => data);
  });

  describe('handle', () => {
    it('should successfully update birthday data', async () => {
      // Setup
      const validBirthdayData = {
        birthdays: [
          { name: 'John Doe', month: 1, day: 15 },
          { name: 'Jane Smith', month: 2, day: 20 }
        ]
      };

      const formData = new FormData();
      formData.append('birthdayData', JSON.stringify(validBirthdayData));

      mockContext.request = new Request('https://test.com/admin/update', {
        method: 'POST',
        body: formData,
      });

      mockStorage.storeBirthdayData.mockResolvedValue(undefined);
      mockStorage.clearCache.mockResolvedValue(undefined);

      // Execute
      const response = await handler.handle(mockContext);

      // Verify
      expect(response.status).toBe(200);
      expect(response.headers['Content-Type']).toBe('text/html');
      expect(validateBirthdayData).toHaveBeenCalledWith(validBirthdayData);
      expect(mockStorage.storeBirthdayData).toHaveBeenCalledWith(validBirthdayData);
      expect(mockStorage.clearCache).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Birthday data updated successfully', {
        birthdayCount: 2
      });

      // Check that success HTML contains expected elements
      expect(response.body).toContain('Update Successful!');
      expect(response.body).toContain('Total Birthdays:</strong> 2');
      expect(response.body).toContain(JSON.stringify(validBirthdayData, null, 2));
    });

    it('should handle missing birthday data', async () => {
      // Setup
      const formData = new FormData();
      // No birthdayData field

      mockContext.request = new Request('https://test.com/admin/update', {
        method: 'POST',
        body: formData,
      });

      // Execute & Verify
      await expect(handler.handle(mockContext)).rejects.toThrow('No birthday data provided');
    });

    it('should handle invalid JSON', async () => {
      // Setup
      const invalidJson = '{ invalid json }';
      const formData = new FormData();
      formData.append('birthdayData', invalidJson);

      mockContext.request = new Request('https://test.com/admin/update', {
        method: 'POST',
        body: formData,
      });

      // Execute
      const response = await handler.handle(mockContext);

      // Verify
      expect(response.status).toBe(400);
      expect(response.headers['Content-Type']).toBe('text/html');
      expect(mockLogger.error).toHaveBeenCalledWith('Invalid JSON provided', {
        error: expect.any(Error)
      });

      // Check error HTML
      expect(response.body).toContain('Update Failed!');
      expect(response.body).toContain('Invalid JSON format');
      expect(response.body).toContain(invalidJson);
    });

    it('should handle validation errors', async () => {
      // Setup
      const invalidData = {
        birthdays: [
          { name: '', month: 1, day: 15 } // Invalid empty name
        ]
      };

      const formData = new FormData();
      formData.append('birthdayData', JSON.stringify(invalidData));

      mockContext.request = new Request('https://test.com/admin/update', {
        method: 'POST',
        body: formData,
      });

      const validationError = new Error('Birthday name cannot be empty');
      (validateBirthdayData as Mock).mockImplementation(() => {
        throw validationError;
      });

      // Execute
      const response = await handler.handle(mockContext);

      // Verify
      expect(response.status).toBe(400);
      expect(response.headers['Content-Type']).toBe('text/html');
      expect(mockLogger.error).toHaveBeenCalledWith('Birthday data validation failed', {
        error: validationError
      });

      // Check error HTML
      expect(response.body).toContain('Update Failed!');
      expect(response.body).toContain('Validation failed: Birthday name cannot be empty');
      expect(response.body).toContain(JSON.stringify(invalidData));
    });

    it('should handle storage errors', async () => {
      // Setup
      const validBirthdayData = {
        birthdays: [
          { name: 'John Doe', month: 1, day: 15 }
        ]
      };

      const formData = new FormData();
      formData.append('birthdayData', JSON.stringify(validBirthdayData));

      mockContext.request = new Request('https://test.com/admin/update', {
        method: 'POST',
        body: formData,
      });

      const storageError = new Error('Storage service unavailable');
      mockStorage.storeBirthdayData.mockRejectedValue(storageError);

      // Execute & Verify
      await expect(handler.handle(mockContext)).rejects.toThrow('Failed to update birthday data');
      
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to update birthday data', {
        error: storageError
      });
    });

    it('should handle cache clearing errors gracefully', async () => {
      // Setup
      const validBirthdayData = {
        birthdays: [
          { name: 'John Doe', month: 1, day: 15 }
        ]
      };

      const formData = new FormData();
      formData.append('birthdayData', JSON.stringify(validBirthdayData));

      mockContext.request = new Request('https://test.com/admin/update', {
        method: 'POST',
        body: formData,
      });

      mockStorage.storeBirthdayData.mockResolvedValue(undefined);
      mockStorage.clearCache.mockRejectedValue(new Error('Cache clear failed'));

      // Execute & Verify
      await expect(handler.handle(mockContext)).rejects.toThrow('Failed to update birthday data');
    });

    it('should handle empty birthdays array', async () => {
      // Setup
      const emptyBirthdayData = { birthdays: [] };
      const formData = new FormData();
      formData.append('birthdayData', JSON.stringify(emptyBirthdayData));

      mockContext.request = new Request('https://test.com/admin/update', {
        method: 'POST',
        body: formData,
      });

      mockStorage.storeBirthdayData.mockResolvedValue(undefined);
      mockStorage.clearCache.mockResolvedValue(undefined);

      // Execute
      const response = await handler.handle(mockContext);

      // Verify
      expect(response.status).toBe(200);
      expect(mockLogger.info).toHaveBeenCalledWith('Birthday data updated successfully', {
        birthdayCount: 0
      });
      expect(response.body).toContain('Total Birthdays:</strong> 0');
    });

    it('should properly format JSON in success response', async () => {
      // Setup
      const birthdayData = {
        birthdays: [
          { name: 'John Doe', month: 1, day: 15, slackUserId: 'U1234567' },
          { name: 'Jane Smith', month: 2, day: 20 }
        ]
      };

      const formData = new FormData();
      formData.append('birthdayData', JSON.stringify(birthdayData));

      mockContext.request = new Request('https://test.com/admin/update', {
        method: 'POST',
        body: formData,
      });

      mockStorage.storeBirthdayData.mockResolvedValue(undefined);
      mockStorage.clearCache.mockResolvedValue(undefined);

      // Execute
      const response = await handler.handle(mockContext);

      // Verify that JSON is properly formatted in the response
      const expectedFormattedJson = JSON.stringify(birthdayData, null, 2);
      expect(response.body).toContain(expectedFormattedJson);
    });

    it('should include current timestamp in response', async () => {
      // Setup
      const birthdayData = { birthdays: [] };
      const formData = new FormData();
      formData.append('birthdayData', JSON.stringify(birthdayData));

      mockContext.request = new Request('https://test.com/admin/update', {
        method: 'POST',
        body: formData,
      });

      mockStorage.storeBirthdayData.mockResolvedValue(undefined);
      mockStorage.clearCache.mockResolvedValue(undefined);

      // Mock Date to control timestamp
      const mockDate = new Date('2024-01-15T12:00:00Z');
      const originalDate = global.Date;
      global.Date = vi.fn(() => mockDate) as any;
      global.Date.now = originalDate.now;

      // Execute
      const response = await handler.handle(mockContext);

      // Restore Date
      global.Date = originalDate;

      // Verify timestamp is included
      expect(response.body).toContain(mockDate.toLocaleString());
    });

    it('should log processing steps', async () => {
      // Setup
      const birthdayData = { birthdays: [{ name: 'Test', month: 1, day: 1 }] };
      const formData = new FormData();
      formData.append('birthdayData', JSON.stringify(birthdayData));

      mockContext.request = new Request('https://test.com/admin/update', {
        method: 'POST',
        body: formData,
      });

      mockStorage.storeBirthdayData.mockResolvedValue(undefined);
      mockStorage.clearCache.mockResolvedValue(undefined);

      // Execute
      await handler.handle(mockContext);

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith('Admin update requested');
      expect(mockLogger.info).toHaveBeenCalledWith('Birthday data updated successfully', {
        birthdayCount: 1
      });
    });

    it('should include JavaScript functionality in HTML response', async () => {
      // Setup
      const birthdayData = { birthdays: [] };
      const formData = new FormData();
      formData.append('birthdayData', JSON.stringify(birthdayData));

      mockContext.request = new Request('https://test.com/admin/update', {
        method: 'POST',
        body: formData,
      });

      mockStorage.storeBirthdayData.mockResolvedValue(undefined);
      mockStorage.clearCache.mockResolvedValue(undefined);

      // Execute
      const response = await handler.handle(mockContext);

      // Verify JavaScript functions are included
      expect(response.body).toContain('function validateJSON()');
      expect(response.body).toContain('function formatJSON()');
      expect(response.body).toContain('addEventListener');
    });

    it('should handle complex birthday data with all fields', async () => {
      // Setup
      const complexBirthdayData = {
        birthdays: [
          { 
            name: 'John O\'Connor', 
            month: 12, 
            day: 31, 
            slackUserId: 'U1234567890' 
          },
          { 
            name: 'Jane Smith-Johnson', 
            month: 2, 
            day: 29 
          }
        ]
      };

      const formData = new FormData();
      formData.append('birthdayData', JSON.stringify(complexBirthdayData));

      mockContext.request = new Request('https://test.com/admin/update', {
        method: 'POST',
        body: formData,
      });

      mockStorage.storeBirthdayData.mockResolvedValue(undefined);
      mockStorage.clearCache.mockResolvedValue(undefined);

      // Execute
      const response = await handler.handle(mockContext);

      // Verify
      expect(response.status).toBe(200);
      expect(validateBirthdayData).toHaveBeenCalledWith(complexBirthdayData);
      expect(mockStorage.storeBirthdayData).toHaveBeenCalledWith(complexBirthdayData);
      expect(response.body).toContain('Total Birthdays:</strong> 2');
    });
  });

  describe('Error Response HTML', () => {
    it('should generate proper error HTML structure', async () => {
      // Setup
      const invalidJson = '{ malformed }';
      const formData = new FormData();
      formData.append('birthdayData', invalidJson);

      mockContext.request = new Request('https://test.com/admin/update', {
        method: 'POST',
        body: formData,
      });

      // Execute
      const response = await handler.handle(mockContext);

      // Verify HTML structure
      expect(response.body).toContain('<!DOCTYPE html>');
      expect(response.body).toContain('<title>Birthday Calendar Admin - Error</title>');
      expect(response.body).toContain('Birthday Calendar Admin');
      expect(response.body).toContain('Update Failed!');
      expect(response.body).toContain('form method="POST"');
      expect(response.body).toContain('name="birthdayData"');
      expect(response.body).toContain(invalidJson);
    });
  });

  describe('Success Response HTML', () => {
    it('should generate proper success HTML structure', async () => {
      // Setup
      const birthdayData = { birthdays: [] };
      const formData = new FormData();
      formData.append('birthdayData', JSON.stringify(birthdayData));

      mockContext.request = new Request('https://test.com/admin/update', {
        method: 'POST',
        body: formData,
      });

      mockStorage.storeBirthdayData.mockResolvedValue(undefined);
      mockStorage.clearCache.mockResolvedValue(undefined);

      // Execute
      const response = await handler.handle(mockContext);

      // Verify HTML structure
      expect(response.body).toContain('<!DOCTYPE html>');
      expect(response.body).toContain('<title>Birthday Calendar Admin - Updated</title>');
      expect(response.body).toContain('Birthday Calendar Admin');
      expect(response.body).toContain('Update Successful!');
      expect(response.body).toContain('Cache:</strong> Cleared and will refresh');
      expect(response.body).toContain('form method="POST"');
      expect(response.body).toContain('name="birthdayData"');
    });
  });
});