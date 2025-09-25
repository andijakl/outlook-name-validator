/**
 * Simple recovery strategies tests
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
  }
};

console.log('🚀 Running Recovery Strategies Tests\n');

try {
  // Compile and load the modules
  const { execSync } = require('child_process');
  execSync('npx tsc src/integration/recovery-strategies.ts --outDir temp --target es2020 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck', { stdio: 'inherit' });
  
  const { createRecoveryStrategies } = require('../../../temp/recovery-strategies.js');
  const { OfficeIntegrationError, ValidationError, ParsingError, NetworkError } = require('../../../temp/error-handler.js');
  
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
  
  // Test 1: Create all recovery strategies
  test('Should create all recovery strategies', () => {
    const strategies = createRecoveryStrategies();
    if (strategies.size === 0) throw new Error('No strategies created');
    if (!strategies.has('OfficeIntegrationError')) throw new Error('Missing OfficeIntegrationError strategy');
    if (!strategies.has('ValidationError')) throw new Error('Missing ValidationError strategy');
    if (!strategies.has('ParsingError')) throw new Error('Missing ParsingError strategy');
    if (!strategies.has('NetworkError')) throw new Error('Missing NetworkError strategy');
    if (!strategies.has('graceful_degradation')) throw new Error('Missing graceful_degradation strategy');
  });
  
  // Test 2: Office API recovery strategy
  test('Should identify recoverable Office API errors', () => {
    const strategies = createRecoveryStrategies();
    const strategy = strategies.get('OfficeIntegrationError');
    
    const recoverableError = new OfficeIntegrationError('Test error', 'office_api', 'high', 'INTERNAL_ERROR');
    const nonRecoverableError = new OfficeIntegrationError('Test error', 'office_api', 'high', 'PERMISSION_DENIED');
    
    if (!strategy.canRecover(recoverableError)) throw new Error('Should be able to recover from INTERNAL_ERROR');
    if (strategy.canRecover(nonRecoverableError)) throw new Error('Should not recover from PERMISSION_DENIED');
  });
  
  // Test 3: Validation recovery strategy
  test('Should identify recoverable validation errors', () => {
    const strategies = createRecoveryStrategies();
    const strategy = strategies.get('ValidationError');
    
    const recoverableError = new ValidationError('Test error', 'content_parsing');
    const nonRecoverableError = new ValidationError('Test error', 'unsupported_step');
    
    if (!strategy.canRecover(recoverableError)) throw new Error('Should be able to recover from content_parsing');
    if (strategy.canRecover(nonRecoverableError)) throw new Error('Should not recover from unsupported_step');
  });
  
  // Test 4: Parsing recovery strategy
  test('Should identify recoverable parsing errors', () => {
    const strategies = createRecoveryStrategies();
    const strategy = strategies.get('ParsingError');
    
    const recoverableError = new ParsingError('Test error', 'greeting_extraction');
    const nonRecoverableError = new Error('Regular error');
    
    if (!strategy.canRecover(recoverableError)) throw new Error('Should be able to recover from ParsingError');
    if (strategy.canRecover(nonRecoverableError)) throw new Error('Should not recover from regular Error');
  });
  
  // Test 5: Network recovery strategy
  test('Should identify recoverable network errors', () => {
    const strategies = createRecoveryStrategies();
    const strategy = strategies.get('NetworkError');
    
    const recoverableError = new NetworkError('Network failed');
    const nonRecoverableError = new Error('Regular error');
    
    if (!strategy.canRecover(recoverableError)) throw new Error('Should be able to recover from NetworkError');
    if (strategy.canRecover(nonRecoverableError)) throw new Error('Should not recover from regular Error');
  });
  
  // Test 6: Graceful degradation strategy
  test('Should always be able to recover with graceful degradation', () => {
    const strategies = createRecoveryStrategies();
    const strategy = strategies.get('graceful_degradation');
    
    const anyError = new Error('Any error');
    const officeError = new OfficeIntegrationError('Office error');
    
    if (!strategy.canRecover(anyError)) throw new Error('Should be able to recover from any error');
    if (!strategy.canRecover(officeError)) throw new Error('Should be able to recover from office error');
  });
  
  // Test 7: Recovery messages
  test('Should provide recovery messages', () => {
    const strategies = createRecoveryStrategies();
    
    strategies.forEach((strategy, errorType) => {
      const message = strategy.getRecoveryMessage();
      if (typeof message !== 'string') throw new Error(`Invalid message type for ${errorType}`);
      if (message.length === 0) throw new Error(`Empty message for ${errorType}`);
    });
  });
  
  // Test 8: Office API recovery execution
  asyncTest('Should execute Office API recovery', async () => {
    const strategies = createRecoveryStrategies();
    const strategy = strategies.get('OfficeIntegrationError');
    
    const error = new OfficeIntegrationError('Test error', 'office_api', 'high', 'INTERNAL_ERROR');
    
    // Should not throw
    await strategy.recover(error);
  });
  
  // Test 9: Graceful degradation execution
  asyncTest('Should execute graceful degradation', async () => {
    const strategies = createRecoveryStrategies();
    const strategy = strategies.get('graceful_degradation');
    
    const error = new Error('Any error');
    const result = await strategy.recover(error);
    
    if (!result.degradedMode) throw new Error('Should return degraded mode');
    if (!Array.isArray(result.availableFeatures)) throw new Error('Should return available features array');
  });
  
  // Test 10: Configuration recovery strategy
  test('Should have configuration recovery strategy', () => {
    const strategies = createRecoveryStrategies();
    if (!strategies.has('ConfigurationError')) throw new Error('Missing ConfigurationError strategy');
    
    const strategy = strategies.get('ConfigurationError');
    const message = strategy.getRecoveryMessage();
    if (!message.includes('configuration')) throw new Error('Recovery message should mention configuration');
  });
  
  // Run async tests
  Promise.all([
    asyncTest('Should execute Office API recovery', async () => {
      const strategies = createRecoveryStrategies();
      const strategy = strategies.get('OfficeIntegrationError');
      
      const error = new OfficeIntegrationError('Test error', 'office_api', 'high', 'INTERNAL_ERROR');
      await strategy.recover(error);
    }),
    
    asyncTest('Should execute graceful degradation', async () => {
      const strategies = createRecoveryStrategies();
      const strategy = strategies.get('graceful_degradation');
      
      const error = new Error('Any error');
      const result = await strategy.recover(error);
      
      if (!result.degradedMode) throw new Error('Should return degraded mode');
      if (!Array.isArray(result.availableFeatures)) throw new Error('Should return available features array');
    })
  ]).then(() => {
    console.log(`\n📊 Test Results:`);
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Total: ${passed + failed}`);
    
    if (failed === 0) {
      console.log('\n✅ All recovery strategy tests passed!');
    } else {
      console.log('\n❌ Some tests failed');
      process.exit(1);
    }
  }).catch(error => {
    console.error('❌ Async test execution failed:', error.message);
    process.exit(1);
  });
  
} catch (error) {
  console.error('❌ Test execution failed:', error.message);
  process.exit(1);
}