/**
 * Simple error handling tests for validation
 */

// Mock browser environment
global.window = {
  location: { href: 'test://localhost' },
  navigator: { userAgent: 'Test Browser' }
};

// Mock Office.js environment
global.Office = {
  context: {
    mailbox: {
      item: { itemType: 'message', itemClass: 'IPM.Note' },
      diagnostics: { hostVersion: '16.0.0' }
    },
    platform: 'PC',
    host: 'Outlook',
    diagnostics: { version: '1.1' }
  },
  AsyncResultStatus: { Succeeded: 0, Failed: 1 },
  ErrorCodes: { PermissionDenied: 7, InvalidApiCall: 5, ItemNotFound: 3, InternalError: 2, NetworkProblem: 13 }
};

console.log('🚀 Running Simple Error Handling Tests\n');

try {
  // Compile and load the error handler
  const { execSync } = require('child_process');
  execSync('npx tsc src/integration/error-handler.ts --outDir temp --target es2020 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck', { stdio: 'inherit' });
  
  const { OfficeErrorHandler, DiagnosticLogger, OfficeIntegrationError, ValidationError, ParsingError } = require('../../../temp/error-handler.js');
  
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
  
  // Test 1: Basic error creation
  test('Should create validation error with context', () => {
    const error = new ValidationError('Test error', 'test_step');
    if (error.message !== 'Test error') throw new Error('Message mismatch');
    if (error.validationStep !== 'test_step') throw new Error('Step mismatch');
  });
  
  // Test 2: Diagnostic logging
  test('Should log and retrieve diagnostic information', () => {
    DiagnosticLogger.clearLogs();
    DiagnosticLogger.error('Test error');
    DiagnosticLogger.warn('Test warning');
    
    const errorLogs = DiagnosticLogger.getLogs('error');
    const warnLogs = DiagnosticLogger.getLogs('warn');
    
    if (errorLogs.length !== 1) throw new Error('Error log count mismatch');
    if (warnLogs.length !== 1) throw new Error('Warning log count mismatch');
  });
  
  // Test 3: Office context validation
  test('Should validate Office context successfully', () => {
    OfficeErrorHandler.validateOfficeContext();
    // If no error thrown, test passes
  });
  
  // Test 4: Permission validation
  test('Should validate permissions and return features', () => {
    const result = OfficeErrorHandler.validatePermissions();
    if (!result.hasFullAccess === undefined) throw new Error('hasFullAccess not defined');
    if (!Array.isArray(result.availableFeatures)) throw new Error('availableFeatures not array');
  });
  
  // Test 5: System health check
  test('Should provide system health status', () => {
    const health = OfficeErrorHandler.getSystemHealth();
    if (!health.status) throw new Error('Status not defined');
    if (!health.checks) throw new Error('Checks not defined');
    if (!health.recommendations) throw new Error('Recommendations not defined');
  });
  
  // Test 6: User-friendly messages
  test('Should provide user-friendly error messages', () => {
    const error = new ValidationError('Test error');
    const result = OfficeErrorHandler.getUserFriendlyMessage(error);
    if (!result.message) throw new Error('Message not defined');
    if (!Array.isArray(result.suggestions)) throw new Error('Suggestions not array');
  });
  
  // Test 7: Parsing failure handling
  test('Should handle parsing failures with fallback', () => {
    const result = OfficeErrorHandler.handleParsingFailure(
      'greeting_extraction',
      new Error('Parse failed')
    );
    if (!result || typeof result !== 'object') throw new Error('Invalid fallback result');
  });
  
  // Test 8: System diagnostics
  test('Should provide system diagnostics', () => {
    const diagnostics = OfficeErrorHandler.getSystemDiagnostics();
    if (!diagnostics.timestamp) throw new Error('Timestamp not defined');
    if (diagnostics.circuitBreakerOpen === undefined) throw new Error('Circuit breaker status not defined');
  });
  
  // Test 9: Error state reset
  test('Should reset error state', () => {
    OfficeErrorHandler.resetErrorState();
    const diagnostics = OfficeErrorHandler.getSystemDiagnostics();
    if (diagnostics.circuitBreakerOpen !== false) throw new Error('Circuit breaker not reset');
  });
  
  // Test 10: AsyncResult error handling
  test('Should handle AsyncResult errors', () => {
    const result = {
      status: global.Office.AsyncResultStatus.Failed,
      error: { code: global.Office.ErrorCodes.InternalError, message: 'Internal error' }
    };
    
    try {
      OfficeErrorHandler.handleAsyncResult(result, 'test operation');
      throw new Error('Should have thrown error');
    } catch (error) {
      if (!(error instanceof OfficeIntegrationError)) throw new Error('Wrong error type');
    }
  });
  
  console.log(`\n📊 Test Results:`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n✅ All error handling tests passed!');
  } else {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Test execution failed:', error.message);
  process.exit(1);
}