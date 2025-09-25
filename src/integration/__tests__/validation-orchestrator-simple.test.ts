/**
 * Simple tests for ValidationOrchestrator without Office.js dependencies
 */

import { ValidationOrchestratorImpl, OrchestratorEventHandler } from '../validation-orchestrator';
import { ValidationResult, ParsedRecipient } from '../../models/interfaces';

/**
 * Simple test framework
 */
class SimpleTest {
  private tests: Array<{ name: string; fn: () => Promise<void> | void }> = [];
  private passed = 0;
  private failed = 0;

  test(name: string, fn: () => Promise<void> | void) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('Running ValidationOrchestrator tests...\n');

    for (const test of this.tests) {
      try {
        await test.fn();
        console.log(`✓ ${test.name}`);
        this.passed++;
      } catch (error) {
        console.log(`✗ ${test.name}`);
        console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
        this.failed++;
      }
    }

    console.log(`\nResults: ${this.passed} passed, ${this.failed} failed`);
    
    if (this.failed > 0) {
      throw new Error(`${this.failed} test(s) failed`);
    }
  }

  assert(condition: boolean, message: string) {
    if (!condition) {
      throw new Error(message);
    }
  }

  assertEqual(actual: any, expected: any, message?: string) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  assertNotNull(value: any, message?: string) {
    if (value == null) {
      throw new Error(message || 'Expected value to not be null/undefined');
    }
  }
}

const test = new SimpleTest();

// Mock event handler
let lastValidationResults: ValidationResult[] = [];
let lastError: Error | null = null;
let validationStartedCount = 0;

const mockEventHandler: OrchestratorEventHandler = {
  onValidationComplete: (results: ValidationResult[]) => {
    lastValidationResults = results;
  },
  onValidationError: (error: Error) => {
    lastError = error;
  },
  onValidationStarted: () => {
    validationStartedCount++;
  }
};

// Test basic orchestrator functionality
test.test('ValidationOrchestrator - should create instance', () => {
  const orchestrator = new ValidationOrchestratorImpl(mockEventHandler);
  
  test.assertNotNull(orchestrator, 'Orchestrator should be created');
  test.assert(!orchestrator.isValidationInProgress(), 'Should not be validating initially');
  
  orchestrator.dispose();
});

test.test('ValidationOrchestrator - should handle caching', () => {
  const orchestrator = new ValidationOrchestratorImpl(mockEventHandler);
  
  const recipients: ParsedRecipient[] = [
    { email: 'test@example.com', extractedNames: ['test'], isGeneric: false }
  ];
  const content = 'Hi test!';
  
  // Test caching through ValidationEventHandler interface
  orchestrator.onRecipientsChanged(recipients);
  orchestrator.onContentChanged(content);
  
  test.assertEqual(orchestrator.getCachedRecipients(), recipients, 'Should cache recipients');
  test.assertEqual(orchestrator.getCachedContent(), content, 'Should cache content');
  
  orchestrator.dispose();
});

test.test('ValidationOrchestrator - should invalidate cache on changes', () => {
  const orchestrator = new ValidationOrchestratorImpl(mockEventHandler);
  
  const recipients: ParsedRecipient[] = [
    { email: 'test@example.com', extractedNames: ['test'], isGeneric: false }
  ];
  const content = 'Hi test!';
  
  // Set cache
  orchestrator.onRecipientsChanged(recipients);
  orchestrator.onContentChanged(content);
  
  test.assertEqual(orchestrator.getCachedRecipients(), recipients, 'Should cache recipients');
  test.assertEqual(orchestrator.getCachedContent(), content, 'Should cache content');
  
  // Trigger changes (these would normally be called by Office.js events)
  orchestrator.handleRecipientsChanged();
  orchestrator.handleContentChanged();
  
  // Cache should be cleared
  test.assertEqual(orchestrator.getCachedRecipients(), undefined, 'Recipients cache should be cleared');
  test.assertEqual(orchestrator.getCachedContent(), undefined, 'Content cache should be cleared');
  
  orchestrator.dispose();
});

test.test('ValidationOrchestrator - should track validation state', () => {
  const orchestrator = new ValidationOrchestratorImpl(mockEventHandler);
  
  test.assert(!orchestrator.isValidationInProgress(), 'Should not be validating initially');
  
  const state = orchestrator.getValidationState();
  test.assertNotNull(state, 'Should have validation state');
  test.assert(typeof state.isEnabled === 'boolean', 'isEnabled should be boolean');
  test.assert(state.lastValidationTime instanceof Date, 'lastValidationTime should be Date');
  
  orchestrator.dispose();
});

test.test('ValidationOrchestrator - should handle enable/disable', () => {
  const orchestrator = new ValidationOrchestratorImpl(mockEventHandler);
  
  // Test enabling/disabling (this would normally interact with Office integration)
  orchestrator.setValidationEnabled(false);
  orchestrator.setValidationEnabled(true);
  
  // Should not throw errors
  test.assert(true, 'Should handle enable/disable without errors');
  
  orchestrator.dispose();
});

test.test('ValidationOrchestrator - should clean up on dispose', () => {
  const orchestrator = new ValidationOrchestratorImpl(mockEventHandler);
  
  const recipients: ParsedRecipient[] = [
    { email: 'test@example.com', extractedNames: ['test'], isGeneric: false }
  ];
  
  orchestrator.onRecipientsChanged(recipients);
  test.assertEqual(orchestrator.getCachedRecipients(), recipients, 'Should cache recipients');
  
  orchestrator.dispose();
  
  test.assertEqual(orchestrator.getCachedRecipients(), undefined, 'Cache should be cleared after dispose');
  test.assertEqual(orchestrator.getCachedContent(), undefined, 'Content cache should be cleared after dispose');
  test.assert(!orchestrator.isValidationInProgress(), 'Should not be validating after dispose');
});

// Run all tests
test.run().catch(error => {
  console.error('Test runner failed:', error);
  throw error;
});