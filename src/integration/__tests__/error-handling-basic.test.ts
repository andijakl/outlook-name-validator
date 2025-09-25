/**
 * Basic tests for error handling functionality
 * Tests the core error handling classes and diagnostic logging
 */

import {
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

// Simple test runner
class TestRunner {
  private tests: Array<{ name: string; fn: () => void }> = [];
  private passed = 0;
  private failed = 0;

  test(name: string, fn: () => void) {
    this.tests.push({ name, fn });
  }

  expect(actual: any) {
    return {
      toBe: (expected: any) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, but got ${actual}`);
        }
      },
      toEqual: (expected: any) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
        }
      },
      toBeTruthy: () => {
        if (!actual) {
          throw new Error(`Expected truthy value, but got ${actual}`);
        }
      },
      toBeFalsy: () => {
        if (actual) {
          throw new Error(`Expected falsy value, but got ${actual}`);
        }
      },
      toHaveLength: (expected: number) => {
        if (!Array.isArray(actual) || actual.length !== expected) {
          throw new Error(`Expected array of length ${expected}, but got ${actual?.length || 'not an array'}`);
        }
      },
      toContain: (expected: any) => {
        if (typeof actual === 'string') {
          if (!actual.includes(expected)) {
            throw new Error(`Expected string to contain "${expected}", but got "${actual}"`);
          }
        } else if (Array.isArray(actual)) {
          if (!actual.includes(expected)) {
            throw new Error(`Expected array to contain ${expected}, but got ${JSON.stringify(actual)}`);
          }
        } else {
          throw new Error(`Expected string or array, but got ${typeof actual}`);
        }
      },
      toBeInstanceOf: (expected: any) => {
        if (!(actual instanceof expected)) {
          throw new Error(`Expected instance of ${expected.name}, but got ${actual?.constructor?.name || typeof actual}`);
        }
      },
      toBeDefined: () => {
        if (actual === undefined) {
          throw new Error('Expected value to be defined, but got undefined');
        }
      },
      toBeGreaterThan: (expected: number) => {
        if (typeof actual !== 'number' || actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      },
      toBeLessThan: (expected: number) => {
        if (typeof actual !== 'number' || actual >= expected) {
          throw new Error(`Expected ${actual} to be less than ${expected}`);
        }
      },
      not: {
        toBe: (expected: any) => {
          if (actual === expected) {
            throw new Error(`Expected ${actual} not to be ${expected}`);
          }
        }
      }
    };
  }

  run() {
    console.log('Running Error Handling Basic tests...\n');
    
    for (const test of this.tests) {
      try {
        test.fn();
        console.log(`✓ ${test.name}`);
        this.passed++;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`✗ ${test.name}: ${errorMessage}`);
        this.failed++;
      }
    }
    
    console.log(`\nTest Results: ${this.passed} passed, ${this.failed} failed`);
    
    if (this.failed > 0) {
      throw new Error(`${this.failed} test(s) failed`);
    }
  }
}

const runner = new TestRunner();

// Test BaseValidationError
runner.test('BaseValidationError should create error with all properties', () => {
  const error = new OfficeIntegrationError(
    'Test error',
    ErrorCategory.OFFICE_API,
    ErrorSeverity.HIGH,
    'TEST_CODE',
    new Error('Original error'),
    { testContext: 'value' }
  );

  runner.expect(error.message).toBe('Test error');
  runner.expect(error.category).toBe(ErrorCategory.OFFICE_API);
  runner.expect(error.severity).toBe(ErrorSeverity.HIGH);
  runner.expect(error.code).toBe('TEST_CODE');
  runner.expect(error.context).toEqual({ testContext: 'value' });
  runner.expect(error.errorId).toBeDefined();
  runner.expect(error.timestamp).toBeInstanceOf(Date);
});

runner.test('BaseValidationError should serialize to JSON correctly', () => {
  const error = new ValidationError('Test validation error', 'test_step');
  const json = error.toJSON();

  runner.expect(json.name).toBe('ValidationError');
  runner.expect(json.message).toBe('Test validation error');
  runner.expect(json.category).toBe(ErrorCategory.VALIDATION);
  runner.expect(json.severity).toBe(ErrorSeverity.MEDIUM);
  runner.expect(json.context.validationStep).toBe('test_step');
});

// Test specific error types
runner.test('OfficeIntegrationError should be created correctly', () => {
  const error = new OfficeIntegrationError('Office error', ErrorCategory.OFFICE_API, ErrorSeverity.HIGH);
  
  runner.expect(error).toBeInstanceOf(OfficeIntegrationError);
  runner.expect(error).toBeInstanceOf(BaseValidationError);
  runner.expect(error.category).toBe(ErrorCategory.OFFICE_API);
  runner.expect(error.severity).toBe(ErrorSeverity.HIGH);
});

runner.test('ValidationError should be created correctly', () => {
  const error = new ValidationError('Validation error', 'test_step');
  
  runner.expect(error).toBeInstanceOf(ValidationError);
  runner.expect(error).toBeInstanceOf(BaseValidationError);
  runner.expect(error.category).toBe(ErrorCategory.VALIDATION);
  runner.expect(error.severity).toBe(ErrorSeverity.MEDIUM);
  runner.expect(error.validationStep).toBe('test_step');
});

runner.test('ParsingError should be created correctly', () => {
  const error = new ParsingError('Parsing error', 'test_parsing');
  
  runner.expect(error).toBeInstanceOf(ParsingError);
  runner.expect(error).toBeInstanceOf(BaseValidationError);
  runner.expect(error.category).toBe(ErrorCategory.PARSING);
  runner.expect(error.severity).toBe(ErrorSeverity.MEDIUM);
  runner.expect(error.parsingStep).toBe('test_parsing');
});

runner.test('PermissionError should be created correctly', () => {
  const error = new PermissionError('Permission error');
  
  runner.expect(error).toBeInstanceOf(PermissionError);
  runner.expect(error).toBeInstanceOf(OfficeIntegrationError);
  runner.expect(error.category).toBe(ErrorCategory.PERMISSION);
  runner.expect(error.severity).toBe(ErrorSeverity.CRITICAL);
  runner.expect(error.code).toBe('PERMISSION_DENIED');
});

runner.test('ApiUnavailableError should be created correctly', () => {
  const error = new ApiUnavailableError('API unavailable');
  
  runner.expect(error).toBeInstanceOf(ApiUnavailableError);
  runner.expect(error).toBeInstanceOf(OfficeIntegrationError);
  runner.expect(error.category).toBe(ErrorCategory.OFFICE_API);
  runner.expect(error.severity).toBe(ErrorSeverity.HIGH);
  runner.expect(error.code).toBe('API_UNAVAILABLE');
});

runner.test('NetworkError should be created correctly', () => {
  const error = new NetworkError('Network error');
  
  runner.expect(error).toBeInstanceOf(NetworkError);
  runner.expect(error).toBeInstanceOf(BaseValidationError);
  runner.expect(error.category).toBe(ErrorCategory.NETWORK);
  runner.expect(error.severity).toBe(ErrorSeverity.MEDIUM);
  runner.expect(error.code).toBe('NETWORK_ERROR');
});

runner.test('ConfigurationError should be created correctly', () => {
  const error = new ConfigurationError('Config error');
  
  runner.expect(error).toBeInstanceOf(ConfigurationError);
  runner.expect(error).toBeInstanceOf(BaseValidationError);
  runner.expect(error.category).toBe(ErrorCategory.CONFIGURATION);
  runner.expect(error.severity).toBe(ErrorSeverity.HIGH);
  runner.expect(error.code).toBe('CONFIG_ERROR');
});

// Test DiagnosticLogger
runner.test('DiagnosticLogger should log errors with context', () => {
  DiagnosticLogger.clearLogs();
  
  DiagnosticLogger.error('Test error', new Error('Test'), { context: 'test' });
  
  const logs = DiagnosticLogger.getLogs('error');
  runner.expect(logs).toHaveLength(1);
  runner.expect(logs[0].message).toBe('Test error');
  runner.expect(logs[0].level).toBe('error');
});

runner.test('DiagnosticLogger should filter logs by level', () => {
  DiagnosticLogger.clearLogs();
  
  DiagnosticLogger.error('Error message');
  DiagnosticLogger.warn('Warning message');
  DiagnosticLogger.info('Info message');

  runner.expect(DiagnosticLogger.getLogs('error')).toHaveLength(1);
  runner.expect(DiagnosticLogger.getLogs('warn')).toHaveLength(1);
  runner.expect(DiagnosticLogger.getLogs('info')).toHaveLength(1);
  runner.expect(DiagnosticLogger.getLogs()).toHaveLength(3);
});

runner.test('DiagnosticLogger should export logs as JSON', () => {
  DiagnosticLogger.clearLogs();
  DiagnosticLogger.info('Test message');
  
  const exported = DiagnosticLogger.exportLogs();
  const parsed = JSON.parse(exported);
  
  runner.expect(Array.isArray(parsed)).toBeTruthy();
  runner.expect(parsed[0].message).toBe('Test message');
});

runner.test('DiagnosticLogger should clear logs', () => {
  DiagnosticLogger.clearLogs(); // Clear any existing logs first
  DiagnosticLogger.info('Test message');
  runner.expect(DiagnosticLogger.getLogs()).toHaveLength(1);
  
  DiagnosticLogger.clearLogs();
  runner.expect(DiagnosticLogger.getLogs()).toHaveLength(0);
});

// Test error ID generation
runner.test('Error IDs should be unique', () => {
  const error1 = new ValidationError('Error 1', 'step1');
  const error2 = new ValidationError('Error 2', 'step2');
  
  runner.expect(error1.errorId).toBeDefined();
  runner.expect(error2.errorId).toBeDefined();
  runner.expect(error1.errorId).not.toBe(error2.errorId);
});

// Test error context
runner.test('Error context should be preserved', () => {
  const context = { 
    operation: 'test_operation',
    attempt: 1,
    data: { key: 'value' }
  };
  
  const error = new ValidationError('Test error', 'test_step', undefined, context);
  
  runner.expect(error.context.operation).toBe('test_operation');
  runner.expect(error.context.attempt).toBe(1);
  runner.expect(error.context.data.key).toBe('value');
  runner.expect(error.context.validationStep).toBe('test_step');
});

// Test error chaining
runner.test('Error chaining should preserve original error', () => {
  const originalError = new Error('Original error message');
  const wrappedError = new ValidationError('Wrapped error', 'test_step', originalError);
  
  runner.expect(wrappedError.originalError).toBe(originalError);
  runner.expect(wrappedError.originalError?.message).toBe('Original error message');
});

// Test timestamp
runner.test('Error timestamp should be recent', () => {
  const beforeTime = Date.now();
  const error = new ValidationError('Test error', 'test_step');
  const afterTime = Date.now();
  
  const errorTime = error.timestamp.getTime();
  runner.expect(errorTime).toBeGreaterThan(beforeTime - 1000); // Allow 1 second tolerance
  runner.expect(errorTime).toBeLessThan(afterTime + 1000);
});

// Run all tests
try {
  runner.run();
  console.log('\n✅ All Error Handling Basic tests passed!');
} catch (error) {
  console.error('\n❌ Some tests failed:', error);
  throw error;
}