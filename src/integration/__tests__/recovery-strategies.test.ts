/**
 * Unit tests for recovery strategies
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import {
  OfficeApiRecoveryStrategy,
  ValidationRecoveryStrategy,
  ParsingRecoveryStrategy,
  NetworkRecoveryStrategy,
  GracefulDegradationStrategy,
  createRecoveryStrategies
} from '../recovery-strategies';
import {
  OfficeIntegrationError,
  ValidationError,
  ParsingError,
  NetworkError,
  PermissionError
} from '../error-handler';

// Mock Office.js
const mockOffice = {
  context: {
    mailbox: {
      item: {
        itemType: 'message',
        itemClass: 'IPM.Note'
      }
    }
  }
};

// @ts-ignore
global.Office = mockOffice;

describe('Recovery Strategies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OfficeApiRecoveryStrategy', () => {
    let strategy: OfficeApiRecoveryStrategy;

    beforeEach(() => {
      strategy = new OfficeApiRecoveryStrategy();
    });

    it('should identify recoverable Office API errors', () => {
      const recoverableError = new OfficeIntegrationError('Test error', 'INTERNAL_ERROR');
      const nonRecoverableError = new OfficeIntegrationError('Test error', 'PERMISSION_DENIED');
      const nonOfficeError = new Error('Regular error');

      expect(strategy.canRecover(recoverableError)).toBe(true);
      expect(strategy.canRecover(nonRecoverableError)).toBe(false);
      expect(strategy.canRecover(nonOfficeError)).toBe(false);
    });

    it('should recover from internal errors', async () => {
      const error = new OfficeIntegrationError('Internal error', 'INTERNAL_ERROR');
      
      await expect(strategy.recover(error)).resolves.not.toThrow();
    });

    it('should recover from item not found errors', async () => {
      const error = new OfficeIntegrationError('Item not found', 'ITEM_NOT_FOUND');
      
      await expect(strategy.recover(error)).resolves.not.toThrow();
    });

    it('should recover from network errors', async () => {
      const error = new OfficeIntegrationError('Network error', 'NETWORK_ERROR');
      
      await expect(strategy.recover(error)).resolves.not.toThrow();
    });

    it('should throw for unsupported error codes', async () => {
      const error = new OfficeIntegrationError('Unsupported error', 'UNSUPPORTED_CODE');
      
      await expect(strategy.recover(error)).rejects.toThrow('No recovery strategy for code');
    });

    it('should respect max recovery attempts', async () => {
      const error = new OfficeIntegrationError('Internal error', 'INTERNAL_ERROR');
      
      // First 3 attempts should work
      await strategy.recover(error);
      await strategy.recover(error);
      await strategy.recover(error);
      
      // 4th attempt should fail (max attempts exceeded)
      expect(strategy.canRecover(error)).toBe(false);
    });

    it('should provide recovery message', () => {
      expect(strategy.getRecoveryMessage()).toContain('Office API error');
    });
  });

  describe('ValidationRecoveryStrategy', () => {
    let strategy: ValidationRecoveryStrategy;

    beforeEach(() => {
      strategy = new ValidationRecoveryStrategy();
    });

    it('should identify recoverable validation errors', () => {
      const recoverableError = new ValidationError('Test error', 'content_parsing');
      const nonRecoverableError = new ValidationError('Test error', 'unsupported_step');
      const nonValidationError = new Error('Regular error');

      expect(strategy.canRecover(recoverableError)).toBe(true);
      expect(strategy.canRecover(nonRecoverableError)).toBe(false);
      expect(strategy.canRecover(nonValidationError)).toBe(false);
    });

    it('should recover from content parsing errors', async () => {
      const error = new ValidationError('Content parsing failed', 'content_parsing');
      
      await expect(strategy.recover(error)).resolves.not.toThrow();
    });

    it('should recover from recipient parsing errors', async () => {
      const error = new ValidationError('Recipient parsing failed', 'recipient_parsing');
      
      await expect(strategy.recover(error)).resolves.not.toThrow();
    });

    it('should recover from name matching errors', async () => {
      const error = new ValidationError('Name matching failed', 'name_matching');
      
      await expect(strategy.recover(error)).resolves.not.toThrow();
    });

    it('should throw for unsupported validation steps', async () => {
      const error = new ValidationError('Unsupported step', 'unsupported_step');
      
      await expect(strategy.recover(error)).rejects.toThrow('No recovery strategy for validation step');
    });

    it('should provide recovery message', () => {
      expect(strategy.getRecoveryMessage()).toContain('validation error');
    });
  });

  describe('ParsingRecoveryStrategy', () => {
    let strategy: ParsingRecoveryStrategy;

    beforeEach(() => {
      strategy = new ParsingRecoveryStrategy();
    });

    it('should identify recoverable parsing errors', () => {
      const recoverableError = new ParsingError('Parsing failed', 'greeting_extraction');
      const nonParsingError = new Error('Regular error');

      expect(strategy.canRecover(recoverableError)).toBe(true);
      expect(strategy.canRecover(nonParsingError)).toBe(false);
    });

    it('should recover from greeting extraction errors', async () => {
      const error = new ParsingError('Greeting extraction failed', 'greeting_extraction');
      
      await expect(strategy.recover(error)).resolves.not.toThrow();
    });

    it('should recover from email parsing errors', async () => {
      const error = new ParsingError('Email parsing failed', 'email_parsing');
      
      await expect(strategy.recover(error)).resolves.not.toThrow();
    });

    it('should recover from generic parsing errors', async () => {
      const error = new ParsingError('Generic parsing failed');
      
      await expect(strategy.recover(error)).resolves.not.toThrow();
    });

    it('should provide recovery message', () => {
      expect(strategy.getRecoveryMessage()).toContain('parsing error');
    });
  });

  describe('NetworkRecoveryStrategy', () => {
    let strategy: NetworkRecoveryStrategy;

    beforeEach(() => {
      strategy = new NetworkRecoveryStrategy();
    });

    it('should identify recoverable network errors', () => {
      const recoverableError = new NetworkError('Network failed');
      const nonNetworkError = new Error('Regular error');

      expect(strategy.canRecover(recoverableError)).toBe(true);
      expect(strategy.canRecover(nonNetworkError)).toBe(false);
    });

    it('should recover from network errors', async () => {
      const error = new NetworkError('Network failed');
      
      // Mock setTimeout to avoid actual delays in tests
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn().mockImplementation((callback) => {
        callback();
        return 1;
      });

      await expect(strategy.recover(error)).resolves.not.toThrow();

      global.setTimeout = originalSetTimeout;
    });

    it('should provide recovery message', () => {
      expect(strategy.getRecoveryMessage()).toContain('network connectivity');
    });

    it('should increase wait time with attempts', async () => {
      const error = new NetworkError('Network failed');
      
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        callback();
        return 1;
      });

      // First attempt
      await strategy.recover(error);
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

      // Second attempt
      await strategy.recover(error);
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);

      setTimeoutSpy.mockRestore();
    });
  });

  describe('GracefulDegradationStrategy', () => {
    let strategy: GracefulDegradationStrategy;

    beforeEach(() => {
      strategy = new GracefulDegradationStrategy();
    });

    it('should always be able to recover', () => {
      const anyError = new Error('Any error');
      const officeError = new OfficeIntegrationError('Office error');
      const permissionError = new PermissionError('Permission error');

      expect(strategy.canRecover(anyError)).toBe(true);
      expect(strategy.canRecover(officeError)).toBe(true);
      expect(strategy.canRecover(permissionError)).toBe(true);
    });

    it('should return degraded mode information', async () => {
      const error = new Error('Any error');
      
      const result = await strategy.recover(error);
      
      expect(result.degradedMode).toBe(true);
      expect(Array.isArray(result.availableFeatures)).toBe(true);
    });

    it('should detect available Office features', async () => {
      const error = new Error('Any error');
      
      const result = await strategy.recover(error);
      
      expect(result.availableFeatures).toContain('basic_office_access');
    });

    it('should handle missing Office context gracefully', async () => {
      const originalOffice = global.Office;
      // @ts-ignore
      global.Office = undefined;
      
      const error = new Error('Any error');
      const result = await strategy.recover(error);
      
      expect(result.degradedMode).toBe(true);
      expect(result.availableFeatures).toEqual([]);
      
      // Restore Office
      // @ts-ignore
      global.Office = originalOffice;
    });

    it('should provide recovery message', () => {
      expect(strategy.getRecoveryMessage()).toContain('limited functionality');
    });
  });

  describe('createRecoveryStrategies', () => {
    it('should create all recovery strategies', () => {
      const strategies = createRecoveryStrategies();
      
      expect(strategies.size).toBeGreaterThan(0);
      expect(strategies.has('OfficeIntegrationError')).toBe(true);
      expect(strategies.has('ValidationError')).toBe(true);
      expect(strategies.has('ParsingError')).toBe(true);
      expect(strategies.has('NetworkError')).toBe(true);
      expect(strategies.has('graceful_degradation')).toBe(true);
    });

    it('should create working strategy instances', () => {
      const strategies = createRecoveryStrategies();
      
      const officeStrategy = strategies.get('OfficeIntegrationError');
      expect(officeStrategy).toBeDefined();
      expect(typeof officeStrategy?.canRecover).toBe('function');
      expect(typeof officeStrategy?.recover).toBe('function');
      expect(typeof officeStrategy?.getRecoveryMessage).toBe('function');
    });
  });

  describe('Strategy Integration', () => {
    it('should work with different error types', async () => {
      const strategies = createRecoveryStrategies();
      
      const officeError = new OfficeIntegrationError('Test', 'INTERNAL_ERROR');
      const validationError = new ValidationError('Test', 'content_parsing');
      const parsingError = new ParsingError('Test', 'greeting_extraction');
      const networkError = new NetworkError('Test');
      
      const officeStrategy = strategies.get('OfficeIntegrationError')!;
      const validationStrategy = strategies.get('ValidationError')!;
      const parsingStrategy = strategies.get('ParsingError')!;
      const networkStrategy = strategies.get('NetworkError')!;
      
      expect(officeStrategy.canRecover(officeError)).toBe(true);
      expect(validationStrategy.canRecover(validationError)).toBe(true);
      expect(parsingStrategy.canRecover(parsingError)).toBe(true);
      expect(networkStrategy.canRecover(networkError)).toBe(true);
      
      // Cross-type recovery should fail
      expect(officeStrategy.canRecover(validationError)).toBe(false);
      expect(validationStrategy.canRecover(parsingError)).toBe(false);
    });
  });
});