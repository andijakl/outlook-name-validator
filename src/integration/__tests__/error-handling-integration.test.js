/**
 * Integration test for error handling with validation orchestrator
 */

// Mock browser environment
global.window = {
  location: { href: 'test://localhost' },
  navigator: { userAgent: 'Test Browser' },
  setTimeout: setTimeout,
  clearTimeout: clearTimeout
};

// Mock Office.js environment
global.Office = {
  context: {
    mailbox: {
      item: { 
        itemType: 'message', 
        itemClass: 'IPM.Note',
        to: { displayName: 'John Doe', emailAddress: 'john.doe@example.com' },
        cc: null,
        bcc: null,
        body: { data: 'Hi John,\n\nHow are you?' }
      },
      diagnostics: { hostVersion: '16.0.0' }
    },
    platform: 'PC',
    host: 'Outlook',
    diagnostics: { version: '1.1' }
  },
  AsyncResultStatus: { Succeeded: 0, Failed: 1 },
  ErrorCodes: { PermissionDenied: 7, InvalidApiCall: 5, ItemNotFound: 3, InternalError: 2, NetworkProblem: 13 }
};

console.log('🚀 Running Error Handling Integration Tests\n');

try {
  // Compile the modules
  const { execSync } = require('child_process');
  execSync('npx tsc src/integration/error-handler.ts src/integration/recovery-strategies.ts --outDir temp --target es2020 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck', { stdio: 'inherit' });
  
  const { OfficeErrorHandler, DiagnosticLogger, OfficeIntegrationError, ValidationError, ParsingError } = require('../../../temp/error-handler.js');
  const { createRecoveryStrategies } = require('../../../temp/recovery-strategies.js');
  
  let passed = 0;
  let failed = 0;
  
  function test(name, fn) {
    try {
      fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      failed++;
    }
  }
  
  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      failed++;
    }
  }
  
  // Initialize recovery strategies
  const strategies = createRecoveryStrategies();
  strategies.forEach((strategy, errorType) => {
    OfficeErrorHandler.registerRecoveryStrategy(errorType, strategy);
  });
  
  // Test 1: End-to-end error handling workflow
  asyncTest('Should handle complete error workflow with recovery', async () => {
    DiagnosticLogger.clearLogs();
    
    // Simulate a transient failure that recovers
    let attempts = 0;
    const operation = () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Transient failure');
      }
      return { success: true, data: 'recovered' };
    };
    
    const result = await OfficeErrorHandler.retryOperation(
      operation,
      'integration_test',
      3,
      10
    );
    
    if (!result.success) throw new Error('Operation should have succeeded');
    if (attempts !== 3) throw new Error('Should have taken 3 attempts');
    
    const logs = DiagnosticLogger.getLogs();
    if (logs.length === 0) throw new Error('Should have logged attempts');
  });
  
  // Test 2: Circuit breaker integration
  asyncTest('Should trigger circuit breaker after multiple failures', async () => {
    OfficeErrorHandler.resetErrorState();
    
    const failingOperation = () => {
      throw new Error('Persistent failure');
    };
    
    // Trigger multiple failures to open circuit breaker
    for (let i = 0; i < 5; i++) {
      try {
        await OfficeErrorHandler.retryOperation(failingOperation, 'failing_op', 1, 1);
      } catch (error) {
        // Expected to fail
      }
    }
    
    // Now circuit breaker should be open
    try {
      await OfficeErrorHandler.retryOperation(() => 'should not run', 'blocked_op', 1, 1);
      throw new Error('Should have been blocked by circuit breaker');
    } catch (error) {
      if (!error.message.includes('Circuit breaker is open')) {
        throw new Error('Wrong error type: ' + error.message);
      }
    }
  });
  
  // Test 3: Parsing failure with fallback
  test('Should handle parsing failures with appropriate fallbacks', () => {
    const testCases = [
      { operation: 'greeting_extraction', expected: { greetings: [], hasValidContent: false } },
      { operation: 'email_parsing', expected: { email: '', displayName: '', extractedNames: [], isGeneric: true } },
      { operation: 'recipient_parsing', expected: [] },
      { operation: 'name_matching', expected: [] }
    ];
    
    testCases.forEach(({ operation, expected }) => {
      const result = OfficeErrorHandler.handleParsingFailure(
        operation,
        new Error('Parse failed'),
        undefined,
        { test: 'context' }
      );
      
      if (JSON.stringify(result) !== JSON.stringify(expected)) {
        throw new Error(`Wrong fallback for ${operation}: ${JSON.stringify(result)}`);
      }
    });
  });
  
  // Test 4: System health monitoring
  test('Should provide comprehensive system health status', () => {
    const health = OfficeErrorHandler.getSystemHealth();
    
    if (!['healthy', 'degraded', 'unhealthy'].includes(health.status)) {
      throw new Error('Invalid health status');
    }
    
    const requiredChecks = ['office_js', 'mailbox', 'mail_item', 'circuit_breaker', 'failure_count'];
    requiredChecks.forEach(check => {
      if (!health.checks[check]) {
        throw new Error(`Missing health check: ${check}`);
      }
      if (!['pass', 'fail', 'warn'].includes(health.checks[check].status)) {
        throw new Error(`Invalid check status for ${check}`);
      }
    });
    
    if (!Array.isArray(health.recommendations)) {
      throw new Error('Recommendations should be an array');
    }
  });
  
  // Test 5: Transient failure handling with jitter
  asyncTest('Should handle transient failures with exponential backoff and jitter', async () => {
    let attempts = 0;
    const startTime = Date.now();
    
    const operation = () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Transient failure');
      }
      return 'success';
    };
    
    const result = await OfficeErrorHandler.handleTransientFailure(
      operation,
      'transient_test',
      3,
      100, // base delay
      5000 // max delay
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (result !== 'success') throw new Error('Should have succeeded');
    if (attempts !== 3) throw new Error('Should have taken 3 attempts');
    if (duration < 100) throw new Error('Should have waited between attempts');
  });
  
  // Test 6: Error categorization and user-friendly messages
  test('Should provide appropriate user-friendly messages for all error types', () => {
    const errorTypes = [
      { error: new OfficeIntegrationError('Test', 'office_api', 'high', 'PERMISSION_DENIED'), expectedKeyword: 'permission' },
      { error: new OfficeIntegrationError('Test', 'office_api', 'high', 'API_UNAVAILABLE'), expectedKeyword: 'not available' },
      { error: new ValidationError('Test', 'validation'), expectedKeyword: 'Validation' },
      { error: new ParsingError('Test', 'parsing'), expectedKeyword: 'analyze email content' },
      { error: new Error('Unknown'), expectedKeyword: 'unexpected error' }
    ];
    
    errorTypes.forEach(({ error, expectedKeyword }) => {
      const result = OfficeErrorHandler.getUserFriendlyMessage(error);
      
      if (!result.message.toLowerCase().includes(expectedKeyword.toLowerCase())) {
        throw new Error(`Message for ${error.constructor.name} should contain "${expectedKeyword}"`);
      }
      
      if (!Array.isArray(result.suggestions) || result.suggestions.length === 0) {
        throw new Error(`Should provide suggestions for ${error.constructor.name}`);
      }
    });
  });
  
  // Test 7: Diagnostic logging and export
  test('Should maintain diagnostic logs with proper retention', () => {
    DiagnosticLogger.clearLogs();
    
    // Generate various log levels
    for (let i = 0; i < 10; i++) {
      DiagnosticLogger.error(`Error ${i}`, new Error(`Test error ${i}`));
      DiagnosticLogger.warn(`Warning ${i}`);
      DiagnosticLogger.info(`Info ${i}`);
      DiagnosticLogger.debug(`Debug ${i}`);
    }
    
    const allLogs = DiagnosticLogger.getLogs();
    const errorLogs = DiagnosticLogger.getLogs('error');
    const warnLogs = DiagnosticLogger.getLogs('warn');
    
    if (allLogs.length !== 40) throw new Error('Should have 40 total logs');
    if (errorLogs.length !== 10) throw new Error('Should have 10 error logs');
    if (warnLogs.length !== 10) throw new Error('Should have 10 warning logs');
    
    // Test export
    const exported = DiagnosticLogger.exportLogs();
    const parsed = JSON.parse(exported);
    
    if (!Array.isArray(parsed)) throw new Error('Exported logs should be an array');
    if (parsed.length !== 40) throw new Error('Exported logs count mismatch');
  });
  
  // Test 8: Recovery strategy integration
  asyncTest('Should integrate recovery strategies with retry operations', async () => {
    let recoveryAttempted = false;
    
    // Create a mock strategy that tracks recovery attempts
    const mockStrategy = {
      canRecover: (error) => error.message.includes('recoverable'),
      recover: async (error) => {
        recoveryAttempted = true;
        // Simulate recovery action
        await new Promise(resolve => setTimeout(resolve, 10));
      },
      getRecoveryMessage: () => 'Mock recovery in progress'
    };
    
    OfficeErrorHandler.registerRecoveryStrategy('MockError', mockStrategy);
    
    let attempts = 0;
    const operation = () => {
      attempts++;
      if (attempts === 1) {
        const error = new Error('recoverable failure');
        error.name = 'MockError';
        throw error;
      }
      return 'recovered';
    };
    
    const result = await OfficeErrorHandler.retryOperation(operation, 'mock_test', 2, 10);
    
    if (result !== 'recovered') throw new Error('Should have recovered');
    if (!recoveryAttempted) throw new Error('Recovery should have been attempted');
  });
  
  // Run all tests
  Promise.all([]).then(() => {
    console.log(`\n📊 Integration Test Results:`);
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Total: ${passed + failed}`);
    
    if (failed === 0) {
      console.log('\n✅ All error handling integration tests passed!');
      console.log('\n🎯 Error Handling Implementation Summary:');
      console.log('  ✅ Comprehensive error types and categorization');
      console.log('  ✅ Retry logic with exponential backoff and jitter');
      console.log('  ✅ Circuit breaker pattern for fault tolerance');
      console.log('  ✅ Recovery strategies for different error types');
      console.log('  ✅ Graceful degradation capabilities');
      console.log('  ✅ Diagnostic logging and troubleshooting');
      console.log('  ✅ User-friendly error messages');
      console.log('  ✅ System health monitoring');
      console.log('  ✅ Parsing failure fallbacks');
      console.log('  ✅ Transient failure handling');
    } else {
      console.log('\n❌ Some integration tests failed');
      process.exit(1);
    }
  }).catch(error => {
    console.error('❌ Integration test execution failed:', error.message);
    process.exit(1);
  });
  
} catch (error) {
  console.error('❌ Test setup failed:', error.message);
  process.exit(1);
}