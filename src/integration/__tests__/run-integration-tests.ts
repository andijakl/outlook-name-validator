/**
 * Simple test runner for integration tests
 */

// Mock Office.js globally
const mockOffice = {
  context: {
    mailbox: {
      item: {
        itemType: 'Message',
        itemClass: 'IPM.Note',
        to: {
          addHandlerAsync: (eventType: string, handler: Function, callback: Function) => {
            callback({ status: 'Succeeded' });
          },
          removeHandlerAsync: (eventType: string, handler: Function) => {},
          getAsync: (callback: Function) => {
            callback({ 
              status: 'Succeeded', 
              value: [{ emailAddress: 'test@example.com', displayName: 'Test User' }] 
            });
          }
        },
        cc: {
          addHandlerAsync: (eventType: string, handler: Function, callback: Function) => {
            callback({ status: 'Succeeded' });
          },
          removeHandlerAsync: (eventType: string, handler: Function) => {},
          getAsync: (callback: Function) => {
            callback({ status: 'Succeeded', value: [] });
          }
        },
        bcc: {
          addHandlerAsync: (eventType: string, handler: Function, callback: Function) => {
            callback({ status: 'Succeeded' });
          },
          removeHandlerAsync: (eventType: string, handler: Function) => {},
          getAsync: (callback: Function) => {
            callback({ status: 'Succeeded', value: [] });
          }
        },
        body: {
          addHandlerAsync: (eventType: string, handler: Function, callback: Function) => {
            callback({ status: 'Succeeded' });
          },
          removeHandlerAsync: (eventType: string, handler: Function) => {},
          getAsync: (coercionType: string, callback: Function) => {
            callback({ 
              status: 'Succeeded', 
              value: 'Hi Test,\n\nHow are you?\n\nBest regards,\nUser' 
            });
          }
        }
      }
    }
  },
  EventType: {
    RecipientsChanged: 'RecipientsChanged',
    AppointmentTimeChanged: 'AppointmentTimeChanged'
  },
  AsyncResultStatus: {
    Succeeded: 'Succeeded',
    Failed: 'Failed'
  },
  CoercionType: {
    Text: 'Text'
  },
  MailboxEnums: {
    ItemType: {
      Message: 'Message'
    }
  },
  ErrorCodes: {
    PermissionDenied: 9000,
    InvalidApiCall: 5000,
    ItemNotFound: 3000,
    InternalError: 5001
  }
};

(global as any).Office = mockOffice;

// Import the integration classes
import { OutlookIntegration } from '../office-integration';
import { ValidationOrchestratorImpl } from '../validation-orchestrator';
import { OfficeErrorHandler } from '../error-handler';

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
    console.log('Running integration tests...\n');

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
      process.exit(1);
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

// Test OutlookIntegration
test.test('OutlookIntegration - should initialize successfully', async () => {
  const integration = new OutlookIntegration();
  
  await integration.initialize();
  
  test.assert(integration.isComposing(), 'Should be in compose mode');
  
  integration.dispose();
});

test.test('OutlookIntegration - should get current recipients', async () => {
  const integration = new OutlookIntegration();
  
  await integration.initialize();
  
  const recipients = await integration.getCurrentRecipients();
  
  test.assert(Array.isArray(recipients), 'Recipients should be an array');
  test.assert(recipients.length >= 0, 'Recipients array should be valid');
  
  integration.dispose();
});

test.test('OutlookIntegration - should get current email body', async () => {
  const integration = new OutlookIntegration();
  
  await integration.initialize();
  
  const body = await integration.getCurrentEmailBody();
  
  test.assert(typeof body === 'string', 'Body should be a string');
  
  integration.dispose();
});

test.test('OutlookIntegration - should handle validation state', () => {
  const integration = new OutlookIntegration();
  
  const state = integration.getValidationState();
  
  test.assertNotNull(state, 'Validation state should not be null');
  test.assert(typeof state.isEnabled === 'boolean', 'isEnabled should be boolean');
  test.assert(state.lastValidationTime instanceof Date, 'lastValidationTime should be Date');
  
  integration.setValidationEnabled(false);
  test.assertEqual(integration.getValidationState().isEnabled, false, 'Should disable validation');
  
  integration.setValidationEnabled(true);
  test.assertEqual(integration.getValidationState().isEnabled, true, 'Should enable validation');
  
  integration.dispose();
});

// Test ValidationOrchestrator
test.test('ValidationOrchestrator - should initialize successfully', async () => {
  const orchestrator = new ValidationOrchestratorImpl();
  
  await orchestrator.initialize();
  
  test.assert(!orchestrator.isValidationInProgress(), 'Should not be validating initially');
  
  orchestrator.dispose();
});

test.test('ValidationOrchestrator - should handle caching', () => {
  const orchestrator = new ValidationOrchestratorImpl();
  
  const recipients = [
    { email: 'test@example.com', extractedNames: ['test'], isGeneric: false }
  ];
  const content = 'Hi test!';
  
  orchestrator.onRecipientsChanged(recipients);
  orchestrator.onContentChanged(content);
  
  test.assertEqual(orchestrator.getCachedRecipients(), recipients, 'Should cache recipients');
  test.assertEqual(orchestrator.getCachedContent(), content, 'Should cache content');
  
  orchestrator.dispose();
});

// Test OfficeErrorHandler
test.test('OfficeErrorHandler - should handle successful results', () => {
  const result = {
    status: mockOffice.AsyncResultStatus.Succeeded,
    value: 'test value'
  };
  
  const value = OfficeErrorHandler.handleAsyncResult(result as any, 'test operation');
  
  test.assertEqual(value, 'test value', 'Should return successful value');
});

test.test('OfficeErrorHandler - should validate Office context', () => {
  // Should not throw with valid context
  OfficeErrorHandler.validateOfficeContext();
  
  test.assert(true, 'Should validate successfully');
});

test.test('OfficeErrorHandler - should validate permissions', () => {
  // Should not throw with valid permissions
  OfficeErrorHandler.validatePermissions();
  
  test.assert(true, 'Should validate permissions successfully');
});

test.test('OfficeErrorHandler - should provide user-friendly messages', () => {
  const error = new Error('Test error');
  const message = OfficeErrorHandler.getUserFriendlyMessage(error);
  
  test.assert(typeof message === 'string', 'Should return string message');
  test.assert(message.length > 0, 'Message should not be empty');
});

// Run all tests
test.run().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});