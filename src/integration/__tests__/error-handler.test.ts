/**
 * Unit tests for error handling and recovery mechanisms
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import {
  OfficeErrorHandler,
  DiagnosticLogger,
  OfficeIntegrationError,
  ValidationError,
  ParsingError,
  PermissionError,
  ApiUnavailableError,
  NetworkError,
  ConfigurationError,
  ErrorCategory,
  ErrorSeverity,
  BaseValidationError
} from '../error-handler';

// Mock Office.js
const mockOffice = {
  context: {
    mailbox: {
      item: {
        itemType: 'message',
        itemClass: 'IPM.Note'
      },
      diagnostics: {
        hostVersion: '16.0.0'
      }
    },
    platform: 'PC',
    host: 'Outlook',
    diagnostics: {
      version: '1.1'
    }
  },
  AsyncResultStatus: {
    Succeeded: 0,
    Failed: 1
  },
  ErrorCodes: {
    PermissionDenied: 7,
    InvalidApiCall: 5,
    ItemNotFound: 3,
    InternalError: 2,
    NetworkProblem: 13
  }
};

// @ts-ignore
global.Office = mockOffice;

describe('Error Handler', () => {
  beforeEach(() => {
    // Reset error handler state
    OfficeErrorHandler.resetErrorState();
    DiagnosticLogger.clearLogs();
    vi.clearAllMocks();
  });

  afterEach(() => {
    DiagnosticLogger.clearLogs();
  });

  describe('BaseValidationError', () => {
    it('should create error with all properties', () => {
      const error = new OfficeIntegrationError(
        'Test error',
        'TEST_CODE',
        new Error('Original error'),
        { testContext: 'value' }
      );

      expect(error.message).toBe('Test error');
      expect(error.category).toBe(ErrorCategory.OFFICE_API);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.code).toBe('TEST_CODE');
      expect(error.context).toEqual({ testContext: 'value' });
      expect(error.errorId).toBeDefined();
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should serialize to JSON correctly', () => {
      const error = new ValidationError('Test validation error', 'test_step');
      const json = error.toJSON();

      expect(json.name).toBe('ValidationError');
      expect(json.message).toBe('Test validation error');
      expect(json.category).toBe(ErrorCategory.VALIDATION);
      expect(json.severity).toBe(ErrorSeverity.MEDIUM);
      expect(json.context.validationStep).toBe('test_step');
    });
  });

  describe('DiagnosticLogger', () => {
    it('should log errors with context', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      DiagnosticLogger.error('Test error', new Error('Test'), { context: 'test' });
      
      const logs = DiagnosticLogger.getLogs('error');
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Test error');
      expect(logs[0].level).toBe('error');
      
      consoleSpy.mockRestore();
    });

    it('should filter logs by level', () => {
      DiagnosticLogger.error('Error message');
      DiagnosticLogger.warn('Warning message');
      DiagnosticLogger.info('Info message');

      expect(DiagnosticLogger.getLogs('error')).toHaveLength(1);
      expect(DiagnosticLogger.getLogs('warn')).toHaveLength(1);
      expect(DiagnosticLogger.getLogs('info')).toHaveLength(1);
      expect(DiagnosticLogger.getLogs()).toHaveLength(3);
    });

    it('should export logs as JSON', () => {
      DiagnosticLogger.info('Test message');
      const exported = DiagnosticLogger.exportLogs();
      const parsed = JSON.parse(exported);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].message).toBe('Test message');
    });

    it('should clear logs', () => {
      DiagnosticLogger.info('Test message');
      expect(DiagnosticLogger.getLogs()).toHaveLength(1);
      
      DiagnosticLogger.clearLogs();
      expect(DiagnosticLogger.getLogs()).toHaveLength(0);
    });
  });

  describe('OfficeErrorHandler', () => {
    describe('handleAsyncResult', () => {
      it('should return value on success', () => {
        const result = {
          status: mockOffice.AsyncResultStatus.Succeeded,
          value: 'test value'
        };

        const value = OfficeErrorHandler.handleAsyncResult(result as any, 'test operation');
        expect(value).toBe('test value');
      });

      it('should throw PermissionError for permission denied', () => {
        const result = {
          status: mockOffice.AsyncResultStatus.Failed,
          error: {
            code: mockOffice.ErrorCodes.PermissionDenied,
            message: 'Permission denied'
          }
        };

        expect(() => {
          OfficeErrorHandler.handleAsyncResult(result as any, 'test operation');
        }).toThrow(PermissionError);
      });

      it('should throw ApiUnavailableError for invalid API call', () => {
        const result = {
          status: mockOffice.AsyncResultStatus.Failed,
          error: {
            code: mockOffice.ErrorCodes.InvalidApiCall,
            message: 'Invalid API call'
          }
        };

        expect(() => {
          OfficeErrorHandler.handleAsyncResult(result as any, 'test operation');
        }).toThrow(ApiUnavailableError);
      });

      it('should throw NetworkError for network problems', () => {
        const result = {
          status: mockOffice.AsyncResultStatus.Failed,
          error: {
            code: mockOffice.ErrorCodes.NetworkProblem,
            message: 'Network error'
          }
        };

        expect(() => {
          OfficeErrorHandler.handleAsyncResult(result as any, 'test operation');
        }).toThrow(NetworkError);
      });
    });

    describe('retryOperation', () => {
      it('should succeed on first attempt', async () => {
        const operation = vi.fn().mockResolvedValue('success');
        
        const result = await OfficeErrorHandler.retryOperation(
          operation,
          'test_operation',
          3,
          100
        );
        
        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(1);
      });

      it('should retry on transient failures', async () => {
        const operation = vi.fn()
          .mockRejectedValueOnce(new Error('Transient error'))
          .mockResolvedValue('success');
        
        const result = await OfficeErrorHandler.retryOperation(
          operation,
          'test_operation',
          3,
          10 // Short delay for testing
        );
        
        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(2);
      });

      it('should not retry permission errors', async () => {
        const operation = vi.fn().mockRejectedValue(new PermissionError('No permission'));
        
        await expect(
          OfficeErrorHandler.retryOperation(operation, 'test_operation', 3, 10)
        ).rejects.toThrow(PermissionError);
        
        expect(operation).toHaveBeenCalledTimes(1);
      });

      it('should throw after max attempts', async () => {
        const operation = vi.fn().mockRejectedValue(new Error('Persistent error'));
        
        await expect(
          OfficeErrorHandler.retryOperation(operation, 'test_operation', 2, 10)
        ).rejects.toThrow(OfficeIntegrationError);
        
        expect(operation).toHaveBeenCalledTimes(2);
      });

      it('should respect circuit breaker', async () => {
        // Trigger circuit breaker by failing multiple operations
        const failingOperation = vi.fn().mockRejectedValue(new Error('Failure'));
        
        // Fail enough times to open circuit breaker
        for (let i = 0; i < 5; i++) {
          try {
            await OfficeErrorHandler.retryOperation(failingOperation, 'failing_op', 1, 1);
          } catch (error) {
            // Expected to fail
          }
        }
        
        // Now circuit breaker should be open
        const newOperation = vi.fn().mockResolvedValue('success');
        
        await expect(
          OfficeErrorHandler.retryOperation(newOperation, 'new_operation', 1, 1)
        ).rejects.toThrow('Circuit breaker is open');
        
        expect(newOperation).not.toHaveBeenCalled();
      });
    });

    describe('wrapOfficeOperation', () => {
      it('should wrap successful operation', async () => {
        const operation = vi.fn().mockImplementation((callback) => {
          callback({
            status: mockOffice.AsyncResultStatus.Succeeded,
            value: 'wrapped success'
          });
        });

        const result = await OfficeErrorHandler.wrapOfficeOperation(
          operation,
          'test_wrap'
        );

        expect(result).toBe('wrapped success');
        expect(operation).toHaveBeenCalledTimes(1);
      });

      it('should handle operation failures', async () => {
        const operation = vi.fn().mockImplementation((callback) => {
          callback({
            status: mockOffice.AsyncResultStatus.Failed,
            error: {
              code: mockOffice.ErrorCodes.InternalError,
              message: 'Internal error'
            }
          });
        });

        await expect(
          OfficeErrorHandler.wrapOfficeOperation(operation, 'test_wrap')
        ).rejects.toThrow(OfficeIntegrationError);
      });

      it('should handle operation exceptions', async () => {
        const operation = vi.fn().mockImplementation(() => {
          throw new Error('Operation exception');
        });

        await expect(
          OfficeErrorHandler.wrapOfficeOperation(operation, 'test_wrap')
        ).rejects.toThrow(OfficeIntegrationError);
      });
    });

    describe('validateOfficeContext', () => {
      it('should validate successful context', () => {
        expect(() => {
          OfficeErrorHandler.validateOfficeContext();
        }).not.toThrow();
      });

      it('should throw when Office is undefined', () => {
        // @ts-ignore
        global.Office = undefined;
        
        expect(() => {
          OfficeErrorHandler.validateOfficeContext();
        }).toThrow(ApiUnavailableError);
        
        // Restore Office
        // @ts-ignore
        global.Office = mockOffice;
      });

      it('should throw when context is missing', () => {
        const originalContext = mockOffice.context;
        // @ts-ignore
        mockOffice.context = undefined;
        
        expect(() => {
          OfficeErrorHandler.validateOfficeContext();
        }).toThrow(ApiUnavailableError);
        
        // Restore context
        mockOffice.context = originalContext;
      });
    });

    describe('validatePermissions', () => {
      it('should validate permissions successfully', () => {
        const result = OfficeErrorHandler.validatePermissions();
        
        expect(result.hasFullAccess).toBe(true);
        expect(result.availableFeatures).toContain('basic_properties');
      });

      it('should handle missing mail item', () => {
        const originalItem = mockOffice.context.mailbox.item;
        // @ts-ignore
        mockOffice.context.mailbox.item = null;
        
        expect(() => {
          OfficeErrorHandler.validatePermissions();
        }).toThrow(PermissionError);
        
        // Restore item
        mockOffice.context.mailbox.item = originalItem;
      });
    });

    describe('getUserFriendlyMessage', () => {
      it('should return friendly message for permission error', () => {
        const error = new PermissionError('Permission denied');
        const result = OfficeErrorHandler.getUserFriendlyMessage(error);
        
        expect(result.message).toContain('permission');
        expect(result.suggestions).toContain('Check your Outlook add-in permissions');
      });

      it('should return friendly message for API unavailable error', () => {
        const error = new ApiUnavailableError('API not available');
        const result = OfficeErrorHandler.getUserFriendlyMessage(error);
        
        expect(result.message).toContain('not available');
        expect(result.suggestions).toContain('Update to the latest version of Outlook');
      });

      it('should return friendly message for network error', () => {
        const error = new NetworkError('Network failed');
        const result = OfficeErrorHandler.getUserFriendlyMessage(error);
        
        expect(result.message).toContain('Network');
        expect(result.suggestions).toContain('Check your internet connection');
      });

      it('should return friendly message for validation error', () => {
        const error = new ValidationError('Validation failed', 'test_step');
        const result = OfficeErrorHandler.getUserFriendlyMessage(error);
        
        expect(result.message).toContain('Validation');
        expect(result.suggestions).toContain('Check your email content and recipients');
      });

      it('should return friendly message for parsing error', () => {
        const error = new ParsingError('Parsing failed', 'test_parsing');
        const result = OfficeErrorHandler.getUserFriendlyMessage(error);
        
        expect(result.message).toContain('analyze email content');
        expect(result.suggestions).toContain('Check if your email contains a greeting');
      });

      it('should return generic message for unknown errors', () => {
        const error = new Error('Unknown error');
        const result = OfficeErrorHandler.getUserFriendlyMessage(error);
        
        expect(result.message).toContain('unexpected error');
        expect(result.suggestions).toContain('Try again');
      });
    });

    describe('getSystemDiagnostics', () => {
      it('should return system diagnostic information', () => {
        const diagnostics = OfficeErrorHandler.getSystemDiagnostics();
        
        expect(diagnostics.timestamp).toBeDefined();
        expect(diagnostics.userAgent).toBeDefined();
        expect(diagnostics.office).toBeDefined();
        expect(diagnostics.office.platform).toBe('PC');
        expect(diagnostics.office.host).toBe('Outlook');
      });

      it('should handle missing Office context gracefully', () => {
        const originalOffice = global.Office;
        // @ts-ignore
        global.Office = undefined;
        
        const diagnostics = OfficeErrorHandler.getSystemDiagnostics();
        
        expect(diagnostics.officeContextError).toBeDefined();
        
        // Restore Office
        // @ts-ignore
        global.Office = originalOffice;
      });
    });

    describe('resetErrorState', () => {
      it('should reset circuit breaker state', () => {
        // This is tested indirectly through circuit breaker behavior
        OfficeErrorHandler.resetErrorState();
        
        // Should be able to perform operations after reset
        const operation = vi.fn().mockResolvedValue('success');
        expect(
          OfficeErrorHandler.retryOperation(operation, 'test_after_reset', 1, 1)
        ).resolves.toBe('success');
      });
    });
  });

  describe('Recovery Strategy Registration', () => {
    it('should register recovery strategies', () => {
      const mockStrategy = {
        canRecover: vi.fn().mockReturnValue(true),
        recover: vi.fn().mockResolvedValue(undefined),
        getRecoveryMessage: vi.fn().mockReturnValue('Mock recovery')
      };

      OfficeErrorHandler.registerRecoveryStrategy('TestError', mockStrategy);
      
      // This is tested indirectly through retry operations
      expect(mockStrategy.canRecover).not.toHaveBeenCalled(); // Not called until needed
    });
  });
});