/**
 * Unit tests for default configurations and constants
 */

import {
  DEFAULT_VALIDATION_CONFIG,
  DEFAULT_USER_PREFERENCES,
  INITIAL_VALIDATION_STATE,
  GENERIC_EMAIL_PREFIXES,
  EMAIL_SEPARATORS,
  COMMON_TITLES
} from '../defaults';

import {
  isValidValidationConfig,
  isValidUserPreferences,
  isValidValidationState
} from '../validators';

// Simple test runner
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
      toContain: (expected: any) => {
        if (!actual.includes(expected)) {
          throw new Error(`Expected array to contain ${expected}`);
        }
      },
      toBeGreaterThan: (expected: number) => {
        if (actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      }
    };
  }

  run() {
    console.log('Running defaults tests...\n');
    
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

// Default validation config tests
runner.test('DEFAULT_VALIDATION_CONFIG should be valid', () => {
  runner.expect(isValidValidationConfig(DEFAULT_VALIDATION_CONFIG)).toBeTruthy();
});

runner.test('DEFAULT_VALIDATION_CONFIG should have reasonable threshold', () => {
  runner.expect(DEFAULT_VALIDATION_CONFIG.minimumConfidenceThreshold).toBe(0.7);
});

runner.test('DEFAULT_VALIDATION_CONFIG should enable fuzzy matching', () => {
  runner.expect(DEFAULT_VALIDATION_CONFIG.enableFuzzyMatching).toBe(true);
});

runner.test('DEFAULT_VALIDATION_CONFIG should exclude generic emails', () => {
  runner.expect(DEFAULT_VALIDATION_CONFIG.excludeGenericEmails).toBe(true);
});

runner.test('DEFAULT_VALIDATION_CONFIG should have common greeting patterns', () => {
  const patterns = DEFAULT_VALIDATION_CONFIG.enabledGreetingPatterns;
  runner.expect(patterns.some(p => p.includes('hi'))).toBeTruthy();
  runner.expect(patterns.some(p => p.includes('hello'))).toBeTruthy();
  runner.expect(patterns.some(p => p.includes('dear'))).toBeTruthy();
});

// Default user preferences tests
runner.test('DEFAULT_USER_PREFERENCES should be valid', () => {
  runner.expect(isValidUserPreferences(DEFAULT_USER_PREFERENCES)).toBeTruthy();
});

runner.test('DEFAULT_USER_PREFERENCES should have reasonable warning duration', () => {
  runner.expect(DEFAULT_USER_PREFERENCES.warningDisplayDuration).toBe(5000);
});

runner.test('DEFAULT_USER_PREFERENCES should enable auto-correct suggestions', () => {
  runner.expect(DEFAULT_USER_PREFERENCES.autoCorrectSuggestions).toBe(true);
});

runner.test('DEFAULT_USER_PREFERENCES should disable success notifications by default', () => {
  runner.expect(DEFAULT_USER_PREFERENCES.showSuccessNotifications).toBe(false);
});

// Initial validation state tests
runner.test('INITIAL_VALIDATION_STATE should be valid', () => {
  runner.expect(isValidValidationState(INITIAL_VALIDATION_STATE)).toBeTruthy();
});

runner.test('INITIAL_VALIDATION_STATE should be enabled by default', () => {
  runner.expect(INITIAL_VALIDATION_STATE.isEnabled).toBe(true);
});

runner.test('INITIAL_VALIDATION_STATE should have no current validation', () => {
  runner.expect(INITIAL_VALIDATION_STATE.currentValidation).toBe(undefined);
});

// Generic email prefixes tests
runner.test('GENERIC_EMAIL_PREFIXES should contain common prefixes', () => {
  runner.expect(GENERIC_EMAIL_PREFIXES).toContain('info');
  runner.expect(GENERIC_EMAIL_PREFIXES).toContain('support');
  runner.expect(GENERIC_EMAIL_PREFIXES).toContain('noreply');
  runner.expect(GENERIC_EMAIL_PREFIXES).toContain('admin');
});

runner.test('GENERIC_EMAIL_PREFIXES should have reasonable length', () => {
  runner.expect(GENERIC_EMAIL_PREFIXES.length).toBeGreaterThan(5);
});

// Email separators tests
runner.test('EMAIL_SEPARATORS should contain common separators', () => {
  runner.expect(EMAIL_SEPARATORS).toContain('.');
  runner.expect(EMAIL_SEPARATORS).toContain('_');
  runner.expect(EMAIL_SEPARATORS).toContain('-');
});

// Common titles tests
runner.test('COMMON_TITLES should contain common titles', () => {
  runner.expect(COMMON_TITLES).toContain('mr');
  runner.expect(COMMON_TITLES).toContain('dr');
  runner.expect(COMMON_TITLES).toContain('prof');
});

runner.test('COMMON_TITLES should be lowercase for consistency', () => {
  const allLowercase = COMMON_TITLES.every(title => title === title.toLowerCase());
  runner.expect(allLowercase).toBeTruthy();
});

// Export the test runner
export { runner };

// Auto-run tests if this file is executed directly
if (typeof window === 'undefined') {
  runner.run();
}