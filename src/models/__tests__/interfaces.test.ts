/**
 * Unit tests for data model interfaces and validation
 */

import {
  isValidGreetingMatch,
  isValidParsedRecipient,
  isValidValidationResult,
  isValidValidationConfig,
  isValidUserPreferences,
  isValidValidationState,
  isValidParsedContent,
  isValidMatchResult,
  isValidValidationStatus,
  createGreetingMatch,
  createParsedRecipient,
  createValidationResult
} from '../validators';

import {
  DEFAULT_VALIDATION_CONFIG,
  DEFAULT_USER_PREFERENCES,
  INITIAL_VALIDATION_STATE
} from '../defaults';

// Simple test runner for basic validation
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
      toThrow: () => {
        let threw = false;
        try {
          if (typeof actual === 'function') {
            actual();
          }
        } catch (e) {
          threw = true;
        }
        if (!threw) {
          throw new Error('Expected function to throw, but it did not');
        }
      }
    };
  }

  run() {
    console.log('Running data model tests...\n');
    
    for (const test of this.tests) {
      try {
        test.fn();
        console.log(`✓ ${test.name}`);
        this.passed++;
      } catch (error) {
        console.log(`✗ ${test.name}: ${error.message}`);
        this.failed++;
      }
    }
    
    console.log(`\nTest Results: ${this.passed} passed, ${this.failed} failed`);
    return this.failed === 0;
  }
}

const runner = new TestRunner();

// GreetingMatch validation tests
runner.test('isValidGreetingMatch should validate correct GreetingMatch', () => {
  const validMatch = {
    fullMatch: 'Hi John',
    extractedName: 'John',
    position: 0,
    confidence: 0.9
  };
  runner.expect(isValidGreetingMatch(validMatch)).toBeTruthy();
});

runner.test('isValidGreetingMatch should reject invalid confidence', () => {
  const invalidMatch = {
    fullMatch: 'Hi John',
    extractedName: 'John',
    position: 0,
    confidence: 1.5 // Invalid confidence > 1
  };
  runner.expect(isValidGreetingMatch(invalidMatch)).toBeFalsy();
});

runner.test('isValidGreetingMatch should reject negative position', () => {
  const invalidMatch = {
    fullMatch: 'Hi John',
    extractedName: 'John',
    position: -1, // Invalid negative position
    confidence: 0.9
  };
  runner.expect(isValidGreetingMatch(invalidMatch)).toBeFalsy();
});

// ParsedRecipient validation tests
runner.test('isValidParsedRecipient should validate correct ParsedRecipient', () => {
  const validRecipient = {
    email: 'john.doe@example.com',
    displayName: 'John Doe',
    extractedNames: ['john', 'doe'],
    isGeneric: false
  };
  runner.expect(isValidParsedRecipient(validRecipient)).toBeTruthy();
});

runner.test('isValidParsedRecipient should reject invalid email', () => {
  const invalidRecipient = {
    email: 'invalid-email', // Missing @
    extractedNames: ['john'],
    isGeneric: false
  };
  runner.expect(isValidParsedRecipient(invalidRecipient)).toBeFalsy();
});

// ValidationResult validation tests
runner.test('isValidValidationResult should validate correct ValidationResult', () => {
  const validResult = {
    greetingName: 'John',
    isValid: true,
    confidence: 0.95
  };
  runner.expect(isValidValidationResult(validResult)).toBeTruthy();
});

// ValidationConfig validation tests
runner.test('isValidValidationConfig should validate default config', () => {
  runner.expect(isValidValidationConfig(DEFAULT_VALIDATION_CONFIG)).toBeTruthy();
});

runner.test('isValidValidationConfig should reject invalid threshold', () => {
  const invalidConfig = {
    ...DEFAULT_VALIDATION_CONFIG,
    minimumConfidenceThreshold: 1.5 // Invalid threshold > 1
  };
  runner.expect(isValidValidationConfig(invalidConfig)).toBeFalsy();
});

// UserPreferences validation tests
runner.test('isValidUserPreferences should validate default preferences', () => {
  runner.expect(isValidUserPreferences(DEFAULT_USER_PREFERENCES)).toBeTruthy();
});

runner.test('isValidUserPreferences should reject invalid duration', () => {
  const invalidPrefs = {
    ...DEFAULT_USER_PREFERENCES,
    warningDisplayDuration: -1000 // Invalid negative duration
  };
  runner.expect(isValidUserPreferences(invalidPrefs)).toBeFalsy();
});

// ValidationState validation tests
runner.test('isValidValidationState should validate initial state', () => {
  runner.expect(isValidValidationState(INITIAL_VALIDATION_STATE)).toBeTruthy();
});

// Creator function tests
runner.test('createGreetingMatch should create valid GreetingMatch', () => {
  const match = createGreetingMatch('Hi John', 'John', 0, 0.9);
  runner.expect(isValidGreetingMatch(match)).toBeTruthy();
  runner.expect(match.extractedName).toBe('John');
});

runner.test('createGreetingMatch should throw on invalid confidence', () => {
  runner.expect(() => createGreetingMatch('Hi John', 'John', 0, 1.5)).toThrow();
});

runner.test('createParsedRecipient should create valid ParsedRecipient', () => {
  const recipient = createParsedRecipient('john@example.com', ['john'], false);
  runner.expect(isValidParsedRecipient(recipient)).toBeTruthy();
  runner.expect(recipient.email).toBe('john@example.com');
});

runner.test('createParsedRecipient should throw on invalid email', () => {
  runner.expect(() => createParsedRecipient('invalid-email', ['john'], false)).toThrow();
});

runner.test('createValidationResult should create valid ValidationResult', () => {
  const result = createValidationResult('John', true, 0.95);
  runner.expect(isValidValidationResult(result)).toBeTruthy();
  runner.expect(result.isValid).toBe(true);
});

runner.test('createValidationResult should throw on invalid confidence', () => {
  runner.expect(() => createValidationResult('John', true, 1.5)).toThrow();
});

// Export the test runner for manual execution
export { runner };

// Auto-run tests if this file is executed directly
if (typeof window === 'undefined') {
  runner.run();
}