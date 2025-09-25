/**
 * Comprehensive error handling tests that work with the existing test infrastructure
 * Tests all error scenarios and recovery paths without external dependencies
 */

// Mock Office.js environment
const mockOffice = {
  context: {
    mailbox: {
      item: {
        itemType: 'message',
        itemClass: 'IPM.Note',
        to: {},
        cc: {},
        bcc: {},
        body: {}
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

global.Office = mockOffice;

// Mock console methods to capture logs
const originalConsole = { ...console };
const logs = [];
console.log = (...args) => logs.push({ level: 'log', args });
console.error = (...args) => logs.push({ level: 'error', args });
console.warn = (...args) => logs.push({ level: 'warn', args });
console.info = (...args) => logs.push({ level: 'info', args });

/**
 * Simple test framework
 */
class TestFramework {
  constructor() {
    this.tests = [];
    this.results = { passed: 0, failed: 0, errors: [] };
  }

  describe(name, fn) {
    console.log(`\n📋 ${name}`);
    fn();
  }

  it(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('🚀 Running Comprehensive Error Handling Tests\n');
    
    for (const test of this.tests) {
      try {
        await test.fn();
        console.log(`  ✅ ${test.name}`);
        this.results.passed++;
      } catch (error) {
        console.log(`  ❌ ${test.name}: ${error.message}`);
        this.results.failed++;
        this.results.errors.push({ test: test.name, error: error.message });
      }
    }

    console.log(`\n📊 Test Results:`);
    console.log(`  Passed: ${this.results.passed}`);
    console.log(`  Failed: ${this.results.failed}`);
    console.log(`  Total: ${this.tests.length}`);

    if (this.results.failed > 0) {
      console.log(`\n❌ Failed Tests:`);
      this.results.errors.forEach(({ test, error }) => {
        console.log(`  - ${test}: ${error}`);
      });
    }

    return this.results;
  }

  expect(actual) {
    return {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, got ${actual}`);
        }
      },
      toEqual: (expected) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
      },
      toContain: (expected) => {
        if (!actual.includes(expected)) {
          throw new Error(`Expected ${actual} to contain ${expected}`);
        }
      },
      toThrow: (expectedError) => {
        try {
          actual();
          throw new Error('Expected function to throw');
        } catch (error) {
          if (expectedError && !error.message.includes(expectedError)) {
            throw new Error(`Expected error containing "${expectedError}", got "${error.message}"`);
          }
        }
      },
      toBeInstanceOf: (expectedClass) => {
        if (!(actual instanceof expectedClass)) {
          throw new Error(`Expected instance of ${expectedClass.name}, got ${actual.constructor.name}`);
        }
      },
      toBeDefined: () => {
        if (actual === undefined) {
          throw new Error('Expected value to be defined');
        }
      },
      toBeGreaterThan: (expected) => {
        if (actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      }
    };
  }
}

const test = new TestFramework();

// Load the error handling modules
let OfficeErrorHandler, DiagnosticLogger, OfficeIntegrationError, ValidationError, ParsingError;
let PermissionError, ApiUnavailableError, NetworkError, ConfigurationError;
let createRecoveryStrategies;

try {
  // Compile and load the modules
  const { execSync } = require('child_process');
  const fs = require('fs');
  
  // Compile TypeScript files
  execSync('npx tsc src/integration/error-handler.ts src/integration/recovery-strategies.ts --outDir temp --target es2020 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck', { stdio: 'inherit' });
  
  const errorHandlerModule = require('../../temp/integration/error-handler.js');
  const recoveryStrategiesModule = require('../../temp/integration/recovery-strategies.js');
  
  OfficeErrorHandler = errorHandlerModule.OfficeErrorHandler;
  DiagnosticLogger = errorHandlerModule.DiagnosticLogger;
  OfficeIntegrationError = errorHandlerModule.OfficeIntegrationError;
  ValidationError = errorHandlerModule.ValidationError;
  ParsingError = errorHandlerModule.ParsingError;
  PermissionError = errorHandlerModule.PermissionError;
  ApiUnavailableError = errorHandlerModule.ApiUnavailableError;
  NetworkError = errorHandlerModule.NetworkError;
  ConfigurationError = errorHandlerModule.ConfigurationError;
  
  createRecoveryStrategies = recoveryStrategiesModule.createRecoveryStrategies;
  
} catch (error) {
  console.error('Failed to load error handling modules:', error.message);
  process.exit(1);
}

// Test Suite
test.describe('Error Handler Comprehensive Tests', () => {
  
  test.it('should handle Office.js AsyncResult errors correctly', () => {
    const result = {
      status: mockOffice.AsyncResultStatus.Failed,
      error: {
        code: mockOffice.ErrorCodes.PermissionDenied,
        message: 'Permission denied'
      }
    };

    test.expect(() => {
      OfficeErrorHandler.handleAsyncResult(result, 'test operation');
    }).toThrow('Permission denied');
  });

  test.it('should retry operations with exponential backoff', async () => {
    let attempts = 0;
    const operation = () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Transient error');
      }
      return 'success';
    };

    const result = await OfficeErrorHandler.retryOperation(
      operation,
      'test_operation',
      3,
      10 // Short delay for testing
    );

    test.expect(result).toBe('success');
    test.expect(attempts).toBe(3);
  });

  test.it('should not retry permission errors', async () => {
    let attempts = 0;
    const operation = () => {
      attempts++;
      throw new PermissionError('No permission');
    };

    try {
      await OfficeErrorHandler.retryOperation(operation, 'test_operation', 3, 10);
      throw new Error('Should have thrown');
    } catch (error) {
      test.expect(error).toBeInstanceOf(PermissionError);
      test.expect(attempts).toBe(1);
    }
  });

  test.it('should handle parsing failures with fallback', () => {
    const error = new Error('Parsing failed');
    const result = OfficeErrorHandler.handleParsingFailure(
      'greeting_extraction',
      error,
      undefined,
      { test: 'context' }
    );

    test.expect(result).toEqual({ greetings: [], hasValidContent: false });
  });

  test.it('should handle transient failures with jitter', async () => {
    let attempts = 0;
    const operation = () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('Transient failure');
      }
      return 'recovered';
    };

    const result = await OfficeErrorHandler.handleTransientFailure(
      operation,
      'test_transient',
      3,
      100,
      1000
    );

    test.expect(result).toBe('recovered');
    test.expect(attempts).toBe(2);
  });

  test.it('should provide system health status', () => {
    const health = OfficeErrorHandler.getSystemHealth();
    
    test.expect(health.status).toBeDefined();
    test.expect(health.checks).toBeDefined();
    test.expect(health.recommendations).toBeDefined();
    test.expect(health.checks.office_js).toBeDefined();
  });

  test.it('should log diagnostic information', () => {
    DiagnosticLogger.clearLogs();
    
    DiagnosticLogger.error('Test error', new Error('Test'));
    DiagnosticLogger.warn('Test warning');
    DiagnosticLogger.info('Test info');
    
    const errorLogs = DiagnosticLogger.getLogs('error');
    const warnLogs = DiagnosticLogger.getLogs('warn');
    const infoLogs = DiagnosticLogger.getLogs('info');
    
    test.expect(errorLogs.length).toBe(1);
    test.expect(warnLogs.length).toBe(1);
    test.expect(infoLogs.length).toBe(1);
  });

  test.it('should export and clear logs', () => {
    DiagnosticLogger.info('Test message for export');
    
    const exported = DiagnosticLogger.exportLogs();
    test.expect(exported).toContain('Test message for export');
    
    DiagnosticLogger.clearLogs();
    test.expect(DiagnosticLogger.getLogs().length).toBe(0);
  });

  test.it('should validate Office context', () => {
    test.expect(() => {
      OfficeErrorHandler.validateOfficeContext();
    }).not.toThrow();
  });

  test.it('should validate permissions and return feature availability', () => {
    const result = OfficeErrorHandler.validatePermissions();
    
    test.expect(result.hasFullAccess).toBeDefined();
    test.expect(result.availableFeatures).toBeDefined();
    test.expect(Array.isArray(result.availableFeatures)).toBe(true);
  });

  test.it('should provide user-friendly error messages', () => {
    const permissionError = new PermissionError('Permission denied');
    const result = OfficeErrorHandler.getUserFriendlyMessage(permissionError);
    
    test.expect(result.message).toContain('permission');
    test.expect(Array.isArray(result.suggestions)).toBe(true);
    test.expect(result.suggestions.length).toBeGreaterThan(0);
  });

  test.it('should provide system diagnostics', () => {
    const diagnostics = OfficeErrorHandler.getSystemDiagnostics();
    
    test.expect(diagnostics.timestamp).toBeDefined();
    test.expect(diagnostics.userAgent).toBeDefined();
    test.expect(diagnostics.circuitBreakerOpen).toBeDefined();
  });

  test.it('should reset error state', () => {
    OfficeErrorHandler.resetErrorState();
    
    const diagnostics = OfficeErrorHandler.getSystemDiagnostics();
    test.expect(diagnostics.circuitBreakerOpen).toBe(false);
    test.expect(diagnostics.failureCount).toBe(0);
  });
});

test.describe('Recovery Strategies Tests', () => {
  
  test.it('should create all recovery strategies', () => {
    const strategies = createRecoveryStrategies();
    
    test.expect(strategies.size).toBeGreaterThan(0);
    test.expect(strategies.has('OfficeIntegrationError')).toBe(true);
    test.expect(strategies.has('ValidationError')).toBe(true);
    test.expect(strategies.has('ParsingError')).toBe(true);
    test.expect(strategies.has('NetworkError')).toBe(true);
    test.expect(strategies.has('ConfigurationError')).toBe(true);
    test.expect(strategies.has('graceful_degradation')).toBe(true);
  });

  test.it('should identify recoverable errors correctly', () => {
    const strategies = createRecoveryStrategies();
    
    const officeError = new OfficeIntegrationError('Test error', 'office_api', 'high', 'INTERNAL_ERROR');
    const validationError = new ValidationError('Test error', 'content_parsing');
    const parsingError = new ParsingError('Test error', 'greeting_extraction');
    
    const officeStrategy = strategies.get('OfficeIntegrationError');
    const validationStrategy = strategies.get('ValidationError');
    const parsingStrategy = strategies.get('ParsingError');
    
    test.expect(officeStrategy.canRecover(officeError)).toBe(true);
    test.expect(validationStrategy.canRecover(validationError)).toBe(true);
    test.expect(parsingStrategy.canRecover(parsingError)).toBe(true);
  });

  test.it('should provide recovery messages', () => {
    const strategies = createRecoveryStrategies();
    
    strategies.forEach((strategy, errorType) => {
      const message = strategy.getRecoveryMessage();
      test.expect(typeof message).toBe('string');
      test.expect(message.length).toBeGreaterThan(0);
    });
  });

  test.it('should handle graceful degradation', async () => {
    const strategies = createRecoveryStrategies();
    const gracefulStrategy = strategies.get('graceful_degradation');
    
    const anyError = new Error('Any error');
    test.expect(gracefulStrategy.canRecover(anyError)).toBe(true);
    
    const result = await gracefulStrategy.recover(anyError);
    test.expect(result.degradedMode).toBe(true);
    test.expect(Array.isArray(result.availableFeatures)).toBe(true);
  });
});

test.describe('Error Types Tests', () => {
  
  test.it('should create validation errors with context', () => {
    const error = new ValidationError('Test validation error', 'test_step', new Error('Original'), { test: 'context' });
    
    test.expect(error.message).toBe('Test validation error');
    test.expect(error.validationStep).toBe('test_step');
    test.expect(error.context.validationStep).toBe('test_step');
    test.expect(error.context.test).toBe('context');
  });

  test.it('should create parsing errors with context', () => {
    const error = new ParsingError('Test parsing error', 'test_parsing', new Error('Original'), { test: 'context' });
    
    test.expect(error.message).toBe('Test parsing error');
    test.expect(error.parsingStep).toBe('test_parsing');
    test.expect(error.context.parsingStep).toBe('test_parsing');
  });

  test.it('should serialize errors to JSON', () => {
    const error = new OfficeIntegrationError('Test error', 'office_api', 'high', 'TEST_CODE');
    const json = error.toJSON();
    
    test.expect(json.name).toBe('OfficeIntegrationError');
    test.expect(json.message).toBe('Test error');
    test.expect(json.category).toBe('office_api');
    test.expect(json.severity).toBe('high');
    test.expect(json.code).toBe('TEST_CODE');
    test.expect(json.errorId).toBeDefined();
  });
});

// Run the tests
test.run().then(results => {
  // Restore console
  Object.assign(console, originalConsole);
  
  if (results.failed > 0) {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
  }
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});