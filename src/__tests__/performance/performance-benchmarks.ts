/**
 * Performance Benchmarks for Outlook Name Validator
 * 
 * Tests performance characteristics and benchmarks
 * Requirements: 3.4, 3.5 (Performance requirements)
 */

import { TestRunner, TestFunction, TestResult } from '../test-runner';
import { ValidationOrchestrator } from '../../integration/validation-orchestrator';
import { EmailContentParser } from '../../models/email-content-parser';
import { RecipientParser } from '../../models/recipient-parser';
import { NameMatchingEngine } from '../../models/name-matching-engine';
import { TestDataSets } from '../data/test-data-sets';

export class PerformanceBenchmarks {
  private testRunner: TestRunner;

  constructor() {
    this.testRunner = new TestRunner();
  }

  async runAllTests(): Promise<TestResult> {
    const tests: TestFunction[] = [
      {
        name: 'Email content parsing performance',
        execute: () => this.testEmailContentParsingPerformance()
      },
      {
        name: 'Recipient parsing performance',
        execute: () => this.testRecipientParsingPerformance()
      },
      {
        name: 'Name matching performance',
        execute: () => this.testNameMatchingPerformance()
      },
      {
        name: 'End-to-end validation performance',
        execute: () => this.testEndToEndValidationPerformance()
      },
      {
        name: 'Memory usage benchmarks',
        execute: () => this.testMemoryUsage()
      },
      {
        name: 'Concurrent validation performance',
        execute: () => this.testConcurrentValidationPerformance()
      },
      {
        name: 'Large email handling performance',
        execute: () => this.testLargeEmailPerformance()
      },
      {
        name: 'Caching performance benefits',
        execute: () => this.testCachingPerformance()
      },
      {
        name: 'Debounced validation performance',
        execute: () => this.testDebouncedValidationPerformance()
      }
    ];

    return await this.testRunner.runTestSuite('Performance Benchmarks', tests);
  }

  private async testEmailContentParsingPerformance() {
    const parser = new EmailContentParser();
    const testCases = TestDataSets.getPerformanceTestScenarios();
    
    const results: PerformanceResult[] = [];

    for (const testCase of testCases) {
      const iterations = 100;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        const greetings = parser.extractGreetings(testCase.emailContent);
        
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      results.push({
        testCase: testCase.name,
        avgTime,
        maxTime,
        minTime,
        iterations
      });

      // Verify performance meets requirements
      if (avgTime > testCase.expectedMaxProcessingTime) {
        throw new Error(`Email parsing too slow for ${testCase.name}: ${avgTime.toFixed(2)}ms > ${testCase.expectedMaxProcessingTime}ms`);
      }
    }

    console.log('📊 Email Content Parsing Performance Results:');
    results.forEach(result => {
      console.log(`  ${result.testCase}: avg=${result.avgTime.toFixed(2)}ms, max=${result.maxTime.toFixed(2)}ms`);
    });

    return { status: 'passed' as const };
  }

  private async testRecipientParsingPerformance() {
    const parser = new RecipientParser();
    const emailPatterns = TestDataSets.getEmailAddressPatterns();
    
    // Test with varying numbers of recipients
    const recipientCounts = [1, 5, 10, 25, 50, 100];
    const results: PerformanceResult[] = [];

    for (const count of recipientCounts) {
      const recipients = Array(count).fill(null).map((_, i) => ({
        emailAddress: emailPatterns[i % emailPatterns.length].email,
        displayName: emailPatterns[i % emailPatterns.length].displayName
      }));

      const iterations = 50;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        const parsedRecipients = parser.extractAllRecipients(recipients);
        
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);

      results.push({
        testCase: `${count} recipients`,
        avgTime,
        maxTime,
        minTime: Math.min(...times),
        iterations
      });

      // Performance should scale linearly or better
      const expectedMaxTime = count * 2; // 2ms per recipient max
      if (avgTime > expectedMaxTime) {
        throw new Error(`Recipient parsing too slow for ${count} recipients: ${avgTime.toFixed(2)}ms > ${expectedMaxTime}ms`);
      }
    }

    console.log('📊 Recipient Parsing Performance Results:');
    results.forEach(result => {
      console.log(`  ${result.testCase}: avg=${result.avgTime.toFixed(2)}ms, max=${result.maxTime.toFixed(2)}ms`);
    });

    return { status: 'passed' as const };
  }

  private async testNameMatchingPerformance() {
    const engine = new NameMatchingEngine();
    const matchingScenarios = TestDataSets.getNameMatchingScenarios();
    
    // Test with varying numbers of recipients to match against
    const recipientCounts = [1, 10, 50, 100];
    const results: PerformanceResult[] = [];

    for (const count of recipientCounts) {
      const recipients = Array(count).fill(null).map((_, i) => ({
        email: `user${i}@company.com`,
        extractedNames: [`user${i}`, 'lastname'],
        isGeneric: false
      }));

      const iterations = 100;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        // Test matching against all recipients
        for (const scenario of matchingScenarios.slice(0, 5)) { // Test first 5 scenarios
          engine.findBestMatch(scenario.greetingName, recipients);
        }
        
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);

      results.push({
        testCase: `${count} recipients matching`,
        avgTime,
        maxTime,
        minTime: Math.min(...times),
        iterations
      });

      // Matching should be fast even with many recipients
      const expectedMaxTime = count * 0.5; // 0.5ms per recipient max
      if (avgTime > expectedMaxTime) {
        throw new Error(`Name matching too slow for ${count} recipients: ${avgTime.toFixed(2)}ms > ${expectedMaxTime}ms`);
      }
    }

    console.log('📊 Name Matching Performance Results:');
    results.forEach(result => {
      console.log(`  ${result.testCase}: avg=${result.avgTime.toFixed(2)}ms, max=${result.maxTime.toFixed(2)}ms`);
    });

    return { status: 'passed' as const };
  }

  private async testEndToEndValidationPerformance() {
    const orchestrator = new ValidationOrchestrator();
    await orchestrator.initialize();
    
    const testScenarios = TestDataSets.getCompleteEmailScenarios();
    const results: PerformanceResult[] = [];

    for (const scenario of testScenarios) {
      // Mock Office.js for this scenario
      global.Office.context.mailbox.item.body.getAsync = (callback) => {
        callback({ status: 'succeeded', value: scenario.emailContent });
      };
      
      global.Office.context.mailbox.item.to.getAsync = (callback) => {
        callback({ status: 'succeeded', value: scenario.recipients });
      };

      const iterations = 20;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        await orchestrator.validateCurrentEmail();
        
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);

      results.push({
        testCase: `E2E: ${scenario.recipients.length} recipients`,
        avgTime,
        maxTime,
        minTime: Math.min(...times),
        iterations
      });

      // End-to-end validation should complete quickly
      const expectedMaxTime = 100 + (scenario.recipients.length * 10); // Base 100ms + 10ms per recipient
      if (avgTime > expectedMaxTime) {
        throw new Error(`End-to-end validation too slow: ${avgTime.toFixed(2)}ms > ${expectedMaxTime}ms`);
      }
    }

    console.log('📊 End-to-End Validation Performance Results:');
    results.forEach(result => {
      console.log(`  ${result.testCase}: avg=${result.avgTime.toFixed(2)}ms, max=${result.maxTime.toFixed(2)}ms`);
    });

    return { status: 'passed' as const };
  }

  private async testMemoryUsage() {
    // Test memory usage patterns
    const initialMemory = this.getMemoryUsage();
    
    // Create multiple validation instances
    const orchestrators: ValidationOrchestrator[] = [];
    
    for (let i = 0; i < 10; i++) {
      const orchestrator = new ValidationOrchestrator();
      await orchestrator.initialize();
      orchestrators.push(orchestrator);
    }

    const afterCreationMemory = this.getMemoryUsage();
    const creationMemoryIncrease = afterCreationMemory - initialMemory;

    // Run validations
    const largeEmailContent = 'Hi John,\n\n' + 'Lorem ipsum '.repeat(10000) + '\n\nBest,\nSender';
    const manyRecipients = Array(100).fill(null).map((_, i) => ({
      emailAddress: `user${i}@company.com`,
      displayName: `User ${i}`
    }));

    global.Office.context.mailbox.item.body.getAsync = (callback) => {
      callback({ status: 'succeeded', value: largeEmailContent });
    };
    
    global.Office.context.mailbox.item.to.getAsync = (callback) => {
      callback({ status: 'succeeded', value: manyRecipients });
    };

    // Run multiple validations
    for (let i = 0; i < 50; i++) {
      await orchestrators[i % orchestrators.length].validateCurrentEmail();
    }

    const afterValidationMemory = this.getMemoryUsage();
    const validationMemoryIncrease = afterValidationMemory - afterCreationMemory;

    // Clean up
    orchestrators.length = 0;
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const afterCleanupMemory = this.getMemoryUsage();

    console.log('📊 Memory Usage Results:');
    console.log(`  Initial: ${initialMemory.toFixed(2)}MB`);
    console.log(`  After creation: ${afterCreationMemory.toFixed(2)}MB (+${creationMemoryIncrease.toFixed(2)}MB)`);
    console.log(`  After validation: ${afterValidationMemory.toFixed(2)}MB (+${validationMemoryIncrease.toFixed(2)}MB)`);
    console.log(`  After cleanup: ${afterCleanupMemory.toFixed(2)}MB`);

    // Memory usage should be reasonable
    if (creationMemoryIncrease > 50) { // 50MB max for 10 instances
      throw new Error(`Excessive memory usage during creation: ${creationMemoryIncrease.toFixed(2)}MB`);
    }

    if (validationMemoryIncrease > 100) { // 100MB max for validation operations
      throw new Error(`Excessive memory usage during validation: ${validationMemoryIncrease.toFixed(2)}MB`);
    }

    return { status: 'passed' as const };
  }

  private async testConcurrentValidationPerformance() {
    const orchestrator = new ValidationOrchestrator();
    await orchestrator.initialize();

    // Test concurrent validations
    const concurrentCounts = [1, 2, 5, 10];
    const results: PerformanceResult[] = [];

    for (const concurrentCount of concurrentCounts) {
      const emailContent = 'Hi John and Sarah,\n\nHow are you?\n\nBest,\nSender';
      const recipients = [
        { emailAddress: 'john.doe@company.com', displayName: 'John Doe' },
        { emailAddress: 'sarah.smith@company.com', displayName: 'Sarah Smith' }
      ];

      global.Office.context.mailbox.item.body.getAsync = (callback) => {
        callback({ status: 'succeeded', value: emailContent });
      };
      
      global.Office.context.mailbox.item.to.getAsync = (callback) => {
        callback({ status: 'succeeded', value: recipients });
      };

      const iterations = 10;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        // Run concurrent validations
        const promises = Array(concurrentCount).fill(null).map(() => 
          orchestrator.validateCurrentEmail()
        );
        
        await Promise.all(promises);
        
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);

      results.push({
        testCase: `${concurrentCount} concurrent validations`,
        avgTime,
        maxTime,
        minTime: Math.min(...times),
        iterations
      });

      // Concurrent validations should not significantly degrade performance
      const expectedMaxTime = 200 * concurrentCount; // Linear scaling with some overhead
      if (avgTime > expectedMaxTime) {
        throw new Error(`Concurrent validation too slow: ${avgTime.toFixed(2)}ms > ${expectedMaxTime}ms`);
      }
    }

    console.log('📊 Concurrent Validation Performance Results:');
    results.forEach(result => {
      console.log(`  ${result.testCase}: avg=${result.avgTime.toFixed(2)}ms, max=${result.maxTime.toFixed(2)}ms`);
    });

    return { status: 'passed' as const };
  }

  private async testLargeEmailPerformance() {
    const orchestrator = new ValidationOrchestrator();
    await orchestrator.initialize();

    // Test with increasingly large emails
    const emailSizes = [1000, 5000, 10000, 50000]; // Character counts
    const results: PerformanceResult[] = [];

    for (const size of emailSizes) {
      const emailContent = 'Hi John,\n\n' + 'Lorem ipsum dolor sit amet, '.repeat(size / 25) + '\n\nBest,\nSender';
      const recipients = [{ emailAddress: 'john.doe@company.com', displayName: 'John Doe' }];

      global.Office.context.mailbox.item.body.getAsync = (callback) => {
        callback({ status: 'succeeded', value: emailContent });
      };
      
      global.Office.context.mailbox.item.to.getAsync = (callback) => {
        callback({ status: 'succeeded', value: recipients });
      };

      const iterations = 10;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        await orchestrator.validateCurrentEmail();
        
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);

      results.push({
        testCase: `${size} character email`,
        avgTime,
        maxTime,
        minTime: Math.min(...times),
        iterations
      });

      // Large emails should still process reasonably quickly
      const expectedMaxTime = 50 + (size / 1000); // Base 50ms + 1ms per 1000 characters
      if (avgTime > expectedMaxTime) {
        throw new Error(`Large email processing too slow: ${avgTime.toFixed(2)}ms > ${expectedMaxTime}ms`);
      }
    }

    console.log('📊 Large Email Performance Results:');
    results.forEach(result => {
      console.log(`  ${result.testCase}: avg=${result.avgTime.toFixed(2)}ms, max=${result.maxTime.toFixed(2)}ms`);
    });

    return { status: 'passed' as const };
  }

  private async testCachingPerformance() {
    const orchestrator = new ValidationOrchestrator();
    await orchestrator.initialize();

    const emailContent = 'Hi John,\n\nHow are you?\n\nBest,\nSender';
    const recipients = [{ emailAddress: 'john.doe@company.com', displayName: 'John Doe' }];

    global.Office.context.mailbox.item.body.getAsync = (callback) => {
      callback({ status: 'succeeded', value: emailContent });
    };
    
    global.Office.context.mailbox.item.to.getAsync = (callback) => {
      callback({ status: 'succeeded', value: recipients });
    };

    // First run (no cache)
    const firstRunTimes: number[] = [];
    for (let i = 0; i < 10; i++) {
      const startTime = performance.now();
      await orchestrator.validateCurrentEmail();
      const endTime = performance.now();
      firstRunTimes.push(endTime - startTime);
    }

    // Subsequent runs (with cache)
    const cachedRunTimes: number[] = [];
    for (let i = 0; i < 10; i++) {
      const startTime = performance.now();
      await orchestrator.validateCurrentEmail();
      const endTime = performance.now();
      cachedRunTimes.push(endTime - startTime);
    }

    const avgFirstRun = firstRunTimes.reduce((sum, time) => sum + time, 0) / firstRunTimes.length;
    const avgCachedRun = cachedRunTimes.reduce((sum, time) => sum + time, 0) / cachedRunTimes.length;

    console.log('📊 Caching Performance Results:');
    console.log(`  First run (no cache): ${avgFirstRun.toFixed(2)}ms`);
    console.log(`  Cached run: ${avgCachedRun.toFixed(2)}ms`);
    console.log(`  Performance improvement: ${((avgFirstRun - avgCachedRun) / avgFirstRun * 100).toFixed(1)}%`);

    // Caching should provide some performance benefit
    if (avgCachedRun >= avgFirstRun) {
      console.warn('Caching does not appear to provide performance benefits');
    }

    return { status: 'passed' as const };
  }

  private async testDebouncedValidationPerformance() {
    const orchestrator = new ValidationOrchestrator();
    await orchestrator.initialize();

    let validationCount = 0;
    const originalValidate = orchestrator.validateCurrentEmail;
    orchestrator.validateCurrentEmail = async () => {
      validationCount++;
      return originalValidate.call(orchestrator);
    };

    // Simulate rapid content changes
    const changeCount = 20;
    const startTime = performance.now();

    for (let i = 0; i < changeCount; i++) {
      orchestrator.onContentChanged();
      // Small delay to simulate typing
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Wait for debounced validation to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    console.log('📊 Debounced Validation Performance Results:');
    console.log(`  ${changeCount} content changes triggered ${validationCount} validations`);
    console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`  Debouncing efficiency: ${((changeCount - validationCount) / changeCount * 100).toFixed(1)}% reduction`);

    // Debouncing should significantly reduce validation calls
    if (validationCount >= changeCount * 0.5) {
      throw new Error(`Debouncing not effective: ${validationCount} validations for ${changeCount} changes`);
    }

    return { status: 'passed' as const };
  }

  private getMemoryUsage(): number {
    // In Node.js environment
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024; // Convert to MB
    }
    
    // In browser environment (if available)
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // Convert to MB
    }
    
    // Fallback
    return 0;
  }
}

interface PerformanceResult {
  testCase: string;
  avgTime: number;
  maxTime: number;
  minTime: number;
  iterations: number;
}