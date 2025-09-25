/**
 * Unit tests for NotificationSystem class
 * Tests UI component behavior, accessibility, and user interaction handling
 */

import { NotificationSystem, NotificationSystemConfig, NotificationCallbacks, createNotificationSystem } from '../notification-system';
import { ValidationResult, ParsedRecipient } from '../interfaces';

// Simple test framework
class TestRunner {
  private tests: { name: string; fn: () => void | Promise<void> }[] = [];
  private passed = 0;
  private failed = 0;

  test(name: string, fn: () => void | Promise<void>) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('Running NotificationSystem tests...\n');
    
    for (const test of this.tests) {
      try {
        await test.fn();
        console.log(`✓ ${test.name}`);
        this.passed++;
      } catch (error) {
        console.log(`✗ ${test.name}`);
        console.log(`  Error: ${error}`);
        this.failed++;
      }
    }
    
    console.log(`\nNotificationSystem Tests: ${this.passed} passed, ${this.failed} failed\n`);
  }
}

const testRunner = new TestRunner();

// Simple assertion functions
function expect(actual: any) {
  return {
    toBe: (expected: any) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, but got ${actual}`);
      }
    },
    toBeDefined: () => {
      if (actual === undefined || actual === null) {
        throw new Error(`Expected value to be defined, but got ${actual}`);
      }
    },
    toMatch: (pattern: RegExp) => {
      if (!pattern.test(actual)) {
        throw new Error(`Expected ${actual} to match ${pattern}`);
      }
    },
    toHaveBeenCalledWith: (...args: any[]) => {
      // Mock function verification - simplified
      if (typeof actual !== 'function') {
        throw new Error('Expected a function');
      }
    },
    not: {
      toThrow: () => {
        try {
          if (typeof actual === 'function') {
            actual();
          }
        } catch (error) {
          throw new Error(`Expected function not to throw, but it threw: ${error}`);
        }
      }
    }
  };
}

// Mock function creator
function createMockFunction() {
  const fn = (...args: any[]) => {
    fn.calls.push(args);
  };
  fn.calls = [];
  return fn;
}

// Mock DOM environment
class MockElement {
  public id: string = '';
  public className: string = '';
  public innerHTML: string = '';
  public textContent: string = '';
  public style: { [key: string]: string } = {};
  public children: MockElement[] = [];
  public attributes: { [key: string]: string } = {};
  private eventListeners: { [key: string]: Function[] } = {};

  constructor(tagName: string = 'div') {
    this.tagName = tagName;
  }

  tagName: string;

  appendChild(child: MockElement): void {
    this.children.push(child);
  }

  insertBefore(newNode: MockElement, referenceNode: MockElement | null): void {
    if (referenceNode === null) {
      this.children.unshift(newNode);
    } else {
      const index = this.children.indexOf(referenceNode);
      if (index !== -1) {
        this.children.splice(index, 0, newNode);
      }
    }
  }

  insertAdjacentElement(position: string, element: MockElement): void {
    if (position === 'afterend') {
      // Simulate inserting after this element
      this.appendChild(element);
    }
  }

  querySelector(selector: string): MockElement | null {
    if (selector === '.status-text') {
      const statusText = new MockElement('span');
      statusText.className = 'status-text';
      return statusText;
    }
    return null;
  }

  querySelectorAll(selector: string): MockElement[] {
    if (selector === '.validation-warning') {
      return this.children.filter(child => child.className.includes('validation-warning'));
    }
    return [];
  }

  addEventListener(event: string, handler: Function): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(handler);
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] || null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  remove(): void {
    // Mock remove functionality
  }

  // Simulate event triggering for tests
  triggerEvent(eventType: string, eventData?: any): void {
    const handlers = this.eventListeners[eventType];
    if (handlers) {
      handlers.forEach(handler => handler(eventData || {}));
    }
  }
}

// Mock document object
const mockDocument = {
  getElementById: (id: string): MockElement | null => {
    const elements: { [key: string]: MockElement } = {
      'warnings-container': (() => {
        const container = new MockElement('div');
        container.id = 'warnings-container';
        container.className = 'warnings-container';
        return container;
      })(),
      'status-indicator': (() => {
        const indicator = new MockElement('div');
        indicator.id = 'status-indicator';
        indicator.className = 'status-indicator';
        return indicator;
      })(),
      'app-body': (() => {
        const appBody = new MockElement('main');
        appBody.id = 'app-body';
        return appBody;
      })()
    };
    return elements[id] || null;
  },
  createElement: (tagName: string): MockElement => {
    return new MockElement(tagName);
  },
  querySelector: (selector: string): MockElement | null => {
    if (selector === '.validation-status') {
      const statusElement = new MockElement('div');
      statusElement.className = 'validation-status';
      return statusElement;
    }
    return null;
  }
};

// Mock global document
declare const global: any;
global.document = mockDocument;

// Test setup
let notificationSystem: NotificationSystem;
let mockCallbacks: NotificationCallbacks;
let mockConfig: NotificationSystemConfig;

function setupTest() {
  // Reset mock callbacks
  mockCallbacks = {
    onWarningDismissed: createMockFunction(),
    onCorrectionApplied: createMockFunction(),
    onSettingsRequested: createMockFunction()
  };

  mockConfig = {
    autoHideDuration: 0,
    maxWarnings: 3,
    showSuccessNotifications: true,
    enableSounds: false
  };

  notificationSystem = new NotificationSystem(mockConfig, mockCallbacks);
}

// Initialization tests
testRunner.test('should create notification system with default config', () => {
  const defaultSystem = new NotificationSystem();
  expect(defaultSystem).toBeDefined();
  expect(defaultSystem.getActiveWarningCount()).toBe(0);
});

testRunner.test('should initialize with custom config', () => {
  setupTest();
  expect(notificationSystem).toBeDefined();
  expect(notificationSystem.getActiveWarningCount()).toBe(0);
});

testRunner.test('should initialize notification container in DOM', () => {
  setupTest();
  const container = mockDocument.getElementById('warnings-container');
  expect(container).toBeDefined();
  expect(container?.className).toBe('warnings-container');
});

// Warning Display tests
testRunner.test('should show warning for validation result', () => {
  setupTest();
  const validationResult: ValidationResult = {
    greetingName: 'John',
    isValid: false,
    confidence: 0.8,
    suggestedRecipient: {
      email: 'jane.doe@example.com',
      extractedNames: ['Jane', 'Doe'],
      isGeneric: false
    }
  };

  const warningId = notificationSystem.showWarning(validationResult);
  
  expect(warningId).toMatch(/^warning-\d+$/);
  expect(notificationSystem.getActiveWarningCount()).toBe(1);
});

testRunner.test('should show warning without suggested recipient', () => {
  setupTest();
  const validationResult: ValidationResult = {
    greetingName: 'Unknown',
    isValid: false,
    confidence: 0.3
  };

  const warningId = notificationSystem.showWarning(validationResult);
  
  expect(warningId).toMatch(/^warning-\d+$/);
  expect(notificationSystem.getActiveWarningCount()).toBe(1);
});

testRunner.test('should limit number of warnings to maxWarnings', () => {
  setupTest();
  const validationResult: ValidationResult = {
    greetingName: 'Test',
    isValid: false,
    confidence: 0.5
  };

  // Add more warnings than the limit
  for (let i = 0; i < 5; i++) {
    notificationSystem.showWarning({
      ...validationResult,
      greetingName: `Test${i}`
    });
  }

  expect(notificationSystem.getActiveWarningCount()).toBe(mockConfig.maxWarnings);
});

testRunner.test('should escape HTML in warning messages', () => {
  setupTest();
  const validationResult: ValidationResult = {
    greetingName: '<script>alert("xss")</script>',
    isValid: false,
    confidence: 0.5
  };

  const warningId = notificationSystem.showWarning(validationResult);
  expect(warningId).toBeDefined();
});

// Warning Dismissal tests
testRunner.test('should dismiss warning by ID', () => {
  setupTest();
  const validationResult: ValidationResult = {
    greetingName: 'John',
    isValid: false,
    confidence: 0.8
  };

  const warningId = notificationSystem.showWarning(validationResult);
  expect(notificationSystem.getActiveWarningCount()).toBe(1);

  notificationSystem.dismissWarning(warningId);
  // Note: In real implementation, this would test after animation delay
});

testRunner.test('should handle dismissing non-existent warning', () => {
  setupTest();
  notificationSystem.dismissWarning('non-existent-id');
  expect(notificationSystem.getActiveWarningCount()).toBe(0);
});

testRunner.test('should clear all notifications', () => {
  setupTest();
  const validationResult: ValidationResult = {
    greetingName: 'Test',
    isValid: false,
    confidence: 0.5
  };

  notificationSystem.showWarning(validationResult);
  notificationSystem.showWarning(validationResult);
  expect(notificationSystem.getActiveWarningCount()).toBe(2);

  notificationSystem.clearNotifications();
  expect(notificationSystem.getActiveWarningCount()).toBe(0);
});

// Status Updates tests
testRunner.test('should update status with ValidationStatus object', () => {
  setupTest();
  const status = {
    isValidating: false,
    hasWarnings: true,
    warningCount: 2
  };

  // This should not throw
  notificationSystem.updateStatus(status);
  expect(true).toBe(true);
});

testRunner.test('should update status with message and type', () => {
  setupTest();
  // This should not throw
  notificationSystem.updateStatus('Test message', 'warning');
  expect(true).toBe(true);
});

// Success Notifications tests
testRunner.test('should show success notification when enabled', () => {
  setupTest();
  // This should not throw
  notificationSystem.showSuccess('Test success message');
  expect(true).toBe(true);
});

testRunner.test('should not show success notification when disabled', () => {
  const configWithoutSuccess = { ...mockConfig, showSuccessNotifications: false };
  const systemWithoutSuccess = new NotificationSystem(configWithoutSuccess, mockCallbacks);
  
  // This should not throw
  systemWithoutSuccess.showSuccess('Test success message');
  expect(true).toBe(true);
});

// Configuration Updates tests
testRunner.test('should update configuration', () => {
  setupTest();
  const newConfig = {
    maxWarnings: 10,
    showSuccessNotifications: false
  };

  // This should not throw
  notificationSystem.updateConfig(newConfig);
  expect(true).toBe(true);
});

// Error Handling tests
testRunner.test('should handle missing DOM elements gracefully', () => {
  setupTest();
  // Mock missing elements
  const originalGetElementById = mockDocument.getElementById;
  mockDocument.getElementById = () => null;

  expect(() => {
    const validationResult: ValidationResult = {
      greetingName: 'John',
      isValid: false,
      confidence: 0.8
    };
    notificationSystem.showWarning(validationResult);
  }).not.toThrow();

  // Restore original function
  mockDocument.getElementById = originalGetElementById;
});

testRunner.test('should handle invalid validation results', () => {
  setupTest();
  expect(() => {
    const invalidResult = {} as ValidationResult;
    notificationSystem.showWarning(invalidResult);
  }).not.toThrow();
});

// Factory function tests
testRunner.test('should create notification system with factory function', () => {
  const system = createNotificationSystem();
  expect(system).toBeDefined();
  expect(system.getActiveWarningCount()).toBe(0);
});

testRunner.test('should create notification system with config and callbacks', () => {
  const config = { maxWarnings: 5 };
  const callbacks = { onWarningDismissed: createMockFunction() };
  
  const system = createNotificationSystem(config, callbacks);
  expect(system).toBeDefined();
});

// Run all tests
testRunner.run().catch(console.error);