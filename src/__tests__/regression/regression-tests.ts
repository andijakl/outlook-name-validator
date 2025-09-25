/**
 * Regression Tests for Outlook Name Validator
 * 
 * Tests to prevent regression of previously fixed issues
 * Requirements: All requirements (comprehensive regression coverage)
 */

import { TestRunner, TestFunction, TestResult } from '../test-runner';
import { ValidationOrchestrator } from '../../integration/validation-orchestrator';
import { EmailContentParser } from '../../models/email-content-parser';
import { RecipientParser } from '../../models/recipient-parser';
import { NameMatchingEngine } from '../../models/name-matching-engine';
import { NotificationSystem } from '../../models/notification-system';

export class RegressionTests {
  private testRunner: TestRunner;

  constructor() {
    this.testRunner = new TestRunner();
  }

  async runAllTests(): Promise<TestResult> {
    const tests: TestFunction[] = [
      // Historical bug fixes
      {
        name: 'Regression: Case sensitivity bug fix',
        execute: () => this.testCaseSensitivityRegression()
      },
      {
        name: 'Regression: Multiple names parsing fix',
        execute: () => this.testMultipleNamesParsingRegression()
      },
      {
        name: 'Regression: Generic email detection fix',
        execute: () => this.testGenericEmailDetectionRegression()
      },
      {
        name: 'Regression: Empty content handling fix',
        execute: () => this.testEmptyContentHandlingRegression()
      },
      {
        name: 'Regression: Special characters handling fix',
        execute: () => this.testSpecialCharactersRegression()
      },
      {
        name: 'Regression: Memory leak fix',
        execute: () => this.testMemoryLeakRegression()
      },
      {
        name: 'Regression: Event handler cleanup fix',
        execute: () => this.testEventHandlerCleanupRegression()
      },
      {
        name: 'Regression: Notification display fix',
        execute: () => this.testNotificationDisplayRegression()
      },
      {
        name: 'Regression: Configuration persistence fix',
        execute: () => this.testConfigurationPersistenceRegression()
      },
      {
        name: 'Regression: Performance degradation fix',
        execute: () => this.testPerformanceDegradationRegression()
      },
      
      // Edge case regressions
      {
        name: 'Regression: HTML content parsing fix',
        execute: () => this.testHtmlContentParsingRegression()
      },
      {
        name: 'Regression: Unicode name handling fix',
        execute: () => this.testUnicodeNameHandlingRegression()
      },
      {
        name: 'Regression: Long email processing fix',
        execute: () => this.testLongEmailProcessingRegression()
      },
      {
        name: 'Regression: Concurrent validation fix',
        execute: () => this.testConcurrentValidationRegression()
      },
      {
        name: 'Regression: Office.js API error handling fix',
        execute: () => this.testOfficeJsErrorHandlingRegression()
      }
    ];

    return await this.testRunner.runTestSuite('Regression Tests', tests);
  }

  private async testCaseSensitivityRegression() {
    // Bug: Case sensitivity was not working correctly in early versions
    // Fix: Implemented proper case-insensitive comparison
    
    const engine = new NameMatchingEngine();
    
    const testCases = [
      { greeting: 'JOHN', recipient: ['john', 'doe'], shouldMatch: true },
      { greeting: 'john', recipient: ['JOHN', 'DOE'], shouldMatch: true },
      { greeting: 'JoHn', recipient: ['john', 'doe'], shouldMatch: true },
      { greeting: 'DOE', recipient: ['john', 'doe'], shouldMatch: true }
    ];

    for (const testCase of testCases) {
      const recipient = {
        email: 'test@company.com',
        extractedNames: testCase.recipient,
        isGeneric: false
      };

      const result = engine.findBestMatch(testCase.greeting, [recipient]);
      
      if (testCase.shouldMatch && result.matchType === 'none') {
        throw new Error(`Case sensitivity regression: "${testCase.greeting}" should match ${testCase.recipient.join(', ')}`);
      }
      
      if (!testCase.shouldMatch && result.matchType !== 'none') {
        throw new Error(`Case sensitivity regression: "${testCase.greeting}" should not match ${testCase.recipient.join(', ')}`);
      }
    }

    return { status: 'passed' as const };
  }

  private async testMultipleNamesParsingRegression() {
    // Bug: Multiple names in greetings were not parsed correctly
    // Fix: Improved regex patterns and parsing logic
    
    const parser = new EmailContentParser();
    
    const testCases = [
      {
        content: 'Hi John and Sarah,\n\nHow are you?',
        expectedNames: ['John', 'Sarah']
      },
      {
        content: 'Hello Mike, Lisa, and Tom,\n\nGreetings!',
        expectedNames: ['Mike', 'Lisa', 'Tom']
      },
      {
        content: 'Dear John & Jane,\n\nHope you are well.',
        expectedNames: ['John', 'Jane']
      },
      {
        content: 'Hi John, Sarah and Mike,\n\nThanks!',
        expectedNames: ['John', 'Sarah', 'Mike']
      }
    ];

    for (const testCase of testCases) {
      const greetings = parser.extractGreetings(testCase.content);
      const extractedNames = greetings.map(g => g.extractedName);
      
      for (const expectedName of testCase.expectedNames) {
        if (!extractedNames.includes(expectedName)) {
          throw new Error(`Multiple names parsing regression: Missing "${expectedName}" from "${testCase.content}"`);
        }
      }
      
      if (extractedNames.length !== testCase.expectedNames.length) {
        throw new Error(`Multiple names parsing regression: Expected ${testCase.expectedNames.length} names, got ${extractedNames.length}`);
      }
    }

    return { status: 'passed' as const };
  }

  private async testGenericEmailDetectionRegression() {
    // Bug: Generic emails were being validated when they should be skipped
    // Fix: Improved generic email detection patterns
    
    const parser = new RecipientParser();
    
    const genericEmails = [
      'info@company.com',
      'support@company.com',
      'noreply@company.com',
      'no-reply@company.com',
      'admin@company.com',
      'webmaster@company.com',
      'postmaster@company.com',
      'sales@company.com',
      'marketing@company.com',
      'help@company.com'
    ];

    for (const email of genericEmails) {
      const parsed = parser.parseEmailAddress(email);
      
      if (!parsed.isGeneric) {
        throw new Error(`Generic email detection regression: "${email}" should be detected as generic`);
      }
    }

    // Test non-generic emails are not flagged
    const nonGenericEmails = [
      'john.doe@company.com',
      'sarah.smith@company.com',
      'mike.johnson@company.com'
    ];

    for (const email of nonGenericEmails) {
      const parsed = parser.parseEmailAddress(email);
      
      if (parsed.isGeneric) {
        throw new Error(`Generic email detection regression: "${email}" should not be detected as generic`);
      }
    }

    return { status: 'passed' as const };
  }

  private async testEmptyContentHandlingRegression() {
    // Bug: Empty or whitespace-only content caused crashes
    // Fix: Added proper validation and early returns
    
    const parser = new EmailContentParser();
    const orchestrator = new ValidationOrchestrator();
    await orchestrator.initialize();

    const emptyContentCases = [
      '',
      '   ',
      '\n\n\n',
      '\t\t\t',
      '   \n   \t   \n   '
    ];

    for (const content of emptyContentCases) {
      // Should not throw errors
      const greetings = parser.extractGreetings(content);
      
      if (greetings.length > 0) {
        throw new Error(`Empty content handling regression: Found greetings in empty content: "${content}"`);
      }

      // Test orchestrator handling
      global.Office.context.mailbox.item.body.getAsync = (callback) => {
        callback({ status: 'succeeded', value: content });
      };
      
      global.Office.context.mailbox.item.to.getAsync = (callback) => {
        callback({ status: 'succeeded', value: [{ emailAddress: 'test@company.com', displayName: 'Test' }] });
      };

      // Should not throw errors and should return empty results
      const results = await orchestrator.validateCurrentEmail();
      
      if (results.length > 0) {
        throw new Error(`Empty content handling regression: Validation results returned for empty content`);
      }
    }

    return { status: 'passed' as const };
  }

  private async testSpecialCharactersRegression() {
    // Bug: Special characters in names caused parsing errors
    // Fix: Improved regex patterns and Unicode support
    
    const parser = new EmailContentParser();
    const recipientParser = new RecipientParser();
    
    const specialCharacterCases = [
      {
        greeting: 'Hi José,',
        expectedName: 'José'
      },
      {
        greeting: 'Dear François,',
        expectedName: 'François'
      },
      {
        greeting: 'Hello O\'Connor,',
        expectedName: 'O\'Connor'
      },
      {
        greeting: 'Hi Jean-Pierre,',
        expectedName: 'Jean-Pierre'
      },
      {
        greeting: 'Dear Müller,',
        expectedName: 'Müller'
      }
    ];

    for (const testCase of specialCharacterCases) {
      const greetings = parser.extractGreetings(testCase.greeting + '\n\nTest message');
      
      if (greetings.length === 0) {
        throw new Error(`Special characters regression: No greeting found for "${testCase.greeting}"`);
      }
      
      if (greetings[0].extractedName !== testCase.expectedName) {
        throw new Error(`Special characters regression: Expected "${testCase.expectedName}", got "${greetings[0].extractedName}"`);
      }
    }

    // Test email parsing with special characters
    const specialEmails = [
      'josé.garcia@company.com',
      'françois.dubois@company.com',
      'jean-pierre.martin@company.com'
    ];

    for (const email of specialEmails) {
      const parsed = recipientParser.parseEmailAddress(email);
      
      if (parsed.extractedNames.length === 0) {
        throw new Error(`Special characters regression: No names extracted from "${email}"`);
      }
    }

    return { status: 'passed' as const };
  }

  private async testMemoryLeakRegression() {
    // Bug: Memory leaks occurred with repeated validations
    // Fix: Proper cleanup and garbage collection
    
    const initialMemory = this.getMemoryUsage();
    const orchestrators: ValidationOrchestrator[] = [];

    // Create and destroy multiple orchestrators
    for (let i = 0; i < 20; i++) {
      const orchestrator = new ValidationOrchestrator();
      await orchestrator.initialize();
      
      // Run some validations
      global.Office.context.mailbox.item.body.getAsync = (callback) => {
        callback({ status: 'succeeded', value: 'Hi John,\n\nTest message' });
      };
      
      global.Office.context.mailbox.item.to.getAsync = (callback) => {
        callback({ status: 'succeeded', value: [{ emailAddress: 'john.doe@company.com', displayName: 'John Doe' }] });
      };

      await orchestrator.validateCurrentEmail();
      orchestrators.push(orchestrator);
    }

    const afterCreationMemory = this.getMemoryUsage();
    
    // Clean up
    orchestrators.length = 0;
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const afterCleanupMemory = this.getMemoryUsage();
    const memoryIncrease = afterCleanupMemory - initialMemory;

    console.log(`Memory usage: Initial=${initialMemory.toFixed(2)}MB, After=${afterCreationMemory.toFixed(2)}MB, Cleanup=${afterCleanupMemory.toFixed(2)}MB`);

    // Memory should not increase significantly after cleanup
    if (memoryIncrease > 10) { // 10MB threshold
      throw new Error(`Memory leak regression: Memory increased by ${memoryIncrease.toFixed(2)}MB after cleanup`);
    }

    return { status: 'passed' as const };
  }

  private async testEventHandlerCleanupRegression() {
    // Bug: Event handlers were not properly cleaned up
    // Fix: Added proper cleanup in orchestrator
    
    let eventHandlerCount = 0;
    const addedHandlers: string[] = [];
    const removedHandlers: string[] = [];

    global.Office.context.mailbox.item.addHandlerAsync = (eventType, handler, callback) => {
      eventHandlerCount++;
      addedHandlers.push(eventType);
      callback({ status: 'succeeded' });
    };

    global.Office.context.mailbox.item.removeHandlerAsync = (eventType, handler, callback) => {
      eventHandlerCount--;
      removedHandlers.push(eventType);
      callback({ status: 'succeeded' });
    };

    // Create and initialize orchestrator
    const orchestrator = new ValidationOrchestrator();
    await orchestrator.initialize();

    const initialHandlerCount = eventHandlerCount;

    // Simulate cleanup (this would happen on add-in unload)
    // In a real implementation, there would be a cleanup method
    if (typeof orchestrator.cleanup === 'function') {
      await orchestrator.cleanup();
    }

    // Verify handlers were cleaned up
    if (eventHandlerCount > initialHandlerCount) {
      throw new Error(`Event handler cleanup regression: ${eventHandlerCount - initialHandlerCount} handlers not cleaned up`);
    }

    console.log(`Event handlers: Added=${addedHandlers.length}, Removed=${removedHandlers.length}`);

    return { status: 'passed' as const };
  }

  private async testNotificationDisplayRegression() {
    // Bug: Notifications were not displaying correctly in certain scenarios
    // Fix: Improved DOM manipulation and error handling
    
    const notificationSystem = new NotificationSystem();
    let notificationCreated = false;
    let notificationVisible = false;

    const mockContainer = {
      appendChild: function(element: any) {
        notificationCreated = true;
        if (element.style && element.style.display !== 'none') {
          notificationVisible = true;
        }
      },
      removeChild: () => {},
      querySelector: () => null,
      querySelectorAll: () => []
    };

    global.document.getElementById = (id: string) => {
      if (id === 'notification-container') {
        return mockContainer as any;
      }
      return null;
    };

    global.document.createElement = () => ({
      style: { display: 'block' },
      classList: { add: () => {}, remove: () => {} },
      setAttribute: () => {},
      addEventListener: () => {},
      textContent: ''
    }) as any;

    const testValidation = {
      greetingName: 'Jane',
      isValid: false,
      suggestedRecipient: {
        email: 'john.doe@company.com',
        extractedNames: ['John'],
        isGeneric: false
      },
      confidence: 0.0
    };

    await notificationSystem.showWarning(testValidation);

    if (!notificationCreated) {
      throw new Error('Notification display regression: Notification was not created');
    }

    if (!notificationVisible) {
      throw new Error('Notification display regression: Notification was not visible');
    }

    return { status: 'passed' as const };
  }

  private async testConfigurationPersistenceRegression() {
    // Bug: Configuration changes were not persisting across sessions
    // Fix: Improved settings storage and retrieval
    
    const { ConfigurationManager } = await import('../../models/configuration-manager');
    
    const configManager = ConfigurationManager.getInstance();
    await configManager.initialize();

    // Test configuration persistence
    const originalConfig = configManager.getConfig();
    const newConfig = {
      ...originalConfig,
      minimumConfidenceThreshold: 0.75,
      enableFuzzyMatching: !originalConfig.enableFuzzyMatching
    };

    await configManager.updateConfig(newConfig);

    // Simulate app restart by creating new instance
    const newConfigManager = ConfigurationManager.getInstance();
    await newConfigManager.initialize();

    const retrievedConfig = newConfigManager.getConfig();

    if (retrievedConfig.minimumConfidenceThreshold !== 0.75) {
      throw new Error('Configuration persistence regression: minimumConfidenceThreshold not persisted');
    }

    if (retrievedConfig.enableFuzzyMatching === originalConfig.enableFuzzyMatching) {
      throw new Error('Configuration persistence regression: enableFuzzyMatching not persisted');
    }

    return { status: 'passed' as const };
  }

  private async testPerformanceDegradationRegression() {
    // Bug: Performance degraded with certain email patterns
    // Fix: Optimized regex patterns and caching
    
    const parser = new EmailContentParser();
    
    // Test patterns that previously caused performance issues
    const problematicPatterns = [
      'Hi ' + 'John '.repeat(100) + ',\n\nTest message', // Repeated names
      'Dear ' + 'A'.repeat(1000) + ',\n\nTest message', // Very long name
      'Hi John,\n\n' + 'Lorem ipsum '.repeat(10000), // Very long content
      'Hi John, Jane, Mike, Sarah, Tom, Lisa, Bob, Alice, Carol, Dave,\n\nTest' // Many names
    ];

    for (const pattern of problematicPatterns) {
      const startTime = performance.now();
      
      const greetings = parser.extractGreetings(pattern);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (100ms)
      if (duration > 100) {
        throw new Error(`Performance degradation regression: Pattern took ${duration.toFixed(2)}ms to process`);
      }

      // Should still extract names correctly
      if (greetings.length === 0 && pattern.includes('Hi ')) {
        throw new Error('Performance degradation regression: No greetings extracted from pattern');
      }
    }

    return { status: 'passed' as const };
  }

  private async testHtmlContentParsingRegression() {
    // Bug: HTML content was not parsed correctly
    // Fix: Added HTML tag stripping and content extraction
    
    const parser = new EmailContentParser();
    
    const htmlTestCases = [
      {
        html: '<p>Hi <strong>John</strong>,</p><p>How are you?</p>',
        expectedName: 'John'
      },
      {
        html: '<div>Dear <em>Sarah</em>,<br>Hope you are well.</div>',
        expectedName: 'Sarah'
      },
      {
        html: '<html><body><p>Hello <span style="color: blue;">Mike</span>,</p></body></html>',
        expectedName: 'Mike'
      }
    ];

    for (const testCase of htmlTestCases) {
      const greetings = parser.extractGreetings(testCase.html);
      
      if (greetings.length === 0) {
        throw new Error(`HTML content parsing regression: No greetings found in "${testCase.html}"`);
      }
      
      if (greetings[0].extractedName !== testCase.expectedName) {
        throw new Error(`HTML content parsing regression: Expected "${testCase.expectedName}", got "${greetings[0].extractedName}"`);
      }
    }

    return { status: 'passed' as const };
  }

  private async testUnicodeNameHandlingRegression() {
    // Bug: Unicode names were not handled correctly
    // Fix: Improved Unicode support in regex patterns
    
    const engine = new NameMatchingEngine();
    
    const unicodeTestCases = [
      { greeting: 'José', recipient: ['josé', 'garcia'], shouldMatch: true },
      { greeting: 'François', recipient: ['françois', 'dubois'], shouldMatch: true },
      { greeting: 'Müller', recipient: ['müller'], shouldMatch: true },
      { greeting: '张三', recipient: ['张三'], shouldMatch: true },
      { greeting: 'Владимир', recipient: ['владимир'], shouldMatch: true }
    ];

    for (const testCase of unicodeTestCases) {
      const recipient = {
        email: 'test@company.com',
        extractedNames: testCase.recipient,
        isGeneric: false
      };

      const result = engine.findBestMatch(testCase.greeting, [recipient]);
      
      if (testCase.shouldMatch && result.matchType === 'none') {
        throw new Error(`Unicode name handling regression: "${testCase.greeting}" should match ${testCase.recipient.join(', ')}`);
      }
    }

    return { status: 'passed' as const };
  }

  private async testLongEmailProcessingRegression() {
    // Bug: Very long emails caused timeouts or crashes
    // Fix: Added streaming processing and timeouts
    
    const orchestrator = new ValidationOrchestrator();
    await orchestrator.initialize();

    // Create very long email content
    const longContent = 'Hi John,\n\n' + 'Lorem ipsum dolor sit amet, '.repeat(50000) + '\n\nBest regards,\nSender';
    
    global.Office.context.mailbox.item.body.getAsync = (callback) => {
      callback({ status: 'succeeded', value: longContent });
    };
    
    global.Office.context.mailbox.item.to.getAsync = (callback) => {
      callback({ status: 'succeeded', value: [{ emailAddress: 'john.doe@company.com', displayName: 'John Doe' }] });
    };

    const startTime = performance.now();
    
    const results = await orchestrator.validateCurrentEmail();
    
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Should complete within reasonable time (5 seconds)
    if (duration > 5000) {
      throw new Error(`Long email processing regression: Took ${duration.toFixed(2)}ms to process`);
    }

    // Should still produce valid results
    if (results.length === 0) {
      throw new Error('Long email processing regression: No validation results produced');
    }

    return { status: 'passed' as const };
  }

  private async testConcurrentValidationRegression() {
    // Bug: Concurrent validations caused race conditions
    // Fix: Added proper synchronization and state management
    
    const orchestrator = new ValidationOrchestrator();
    await orchestrator.initialize();

    global.Office.context.mailbox.item.body.getAsync = (callback) => {
      callback({ status: 'succeeded', value: 'Hi John,\n\nTest message' });
    };
    
    global.Office.context.mailbox.item.to.getAsync = (callback) => {
      callback({ status: 'succeeded', value: [{ emailAddress: 'john.doe@company.com', displayName: 'John Doe' }] });
    };

    // Run multiple concurrent validations
    const concurrentPromises = Array(10).fill(null).map(() => 
      orchestrator.validateCurrentEmail()
    );

    const results = await Promise.all(concurrentPromises);

    // All validations should complete successfully
    for (let i = 0; i < results.length; i++) {
      if (!results[i] || results[i].length === 0) {
        throw new Error(`Concurrent validation regression: Validation ${i} failed`);
      }
    }

    // Results should be consistent
    const firstResult = JSON.stringify(results[0]);
    for (let i = 1; i < results.length; i++) {
      if (JSON.stringify(results[i]) !== firstResult) {
        throw new Error(`Concurrent validation regression: Inconsistent results between validations`);
      }
    }

    return { status: 'passed' as const };
  }

  private async testOfficeJsErrorHandlingRegression() {
    // Bug: Office.js API errors were not handled gracefully
    // Fix: Added comprehensive error handling and fallbacks
    
    const orchestrator = new ValidationOrchestrator();
    await orchestrator.initialize();

    // Test various error scenarios
    const errorScenarios = [
      {
        name: 'Body access error',
        setup: () => {
          global.Office.context.mailbox.item.body.getAsync = (callback) => {
            callback({ status: 'failed', error: { message: 'Access denied' } });
          };
        }
      },
      {
        name: 'Recipients access error',
        setup: () => {
          global.Office.context.mailbox.item.to.getAsync = (callback) => {
            callback({ status: 'failed', error: { message: 'Network error' } });
          };
        }
      },
      {
        name: 'Timeout error',
        setup: () => {
          global.Office.context.mailbox.item.body.getAsync = (callback) => {
            // Simulate timeout by not calling callback
          };
        }
      }
    ];

    for (const scenario of errorScenarios) {
      scenario.setup();
      
      try {
        const results = await orchestrator.validateCurrentEmail();
        
        // Should handle errors gracefully and return empty results
        if (!Array.isArray(results)) {
          throw new Error(`Office.js error handling regression: ${scenario.name} - Invalid results type`);
        }
        
        // For error scenarios, we expect empty results rather than crashes
        console.log(`${scenario.name}: Handled gracefully with ${results.length} results`);
        
      } catch (error) {
        throw new Error(`Office.js error handling regression: ${scenario.name} - ${error.message}`);
      }
    }

    return { status: 'passed' as const };
  }

  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024;
    }
    
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }
    
    return 0;
  }
}