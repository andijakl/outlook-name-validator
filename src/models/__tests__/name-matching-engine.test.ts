/**
 * Unit tests for NameMatchingEngine functionality
 */

import { GreetingMatch } from "../interfaces";

import { ParsedRecipient } from "../interfaces";

// Import statements for Node.js environment
import { NameMatchingEngine } from '../name-matching-engine';
// Note: interfaces are TypeScript compile-time only, so we don't need to import them for runtime

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
      toHaveLength: (expected: number) => {
        if (!Array.isArray(actual) || actual.length !== expected) {
          throw new Error(`Expected array of length ${expected}, but got ${actual?.length || 'not an array'}`);
        }
      },
      toContain: (expected: any) => {
        if (!Array.isArray(actual) || !actual.includes(expected)) {
          throw new Error(`Expected array to contain ${expected}, but got ${JSON.stringify(actual)}`);
        }
      },
      toBeGreaterThan: (expected: number) => {
        if (typeof actual !== 'number' || actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      },
      toBeLessThanOrEqual: (expected: number) => {
        if (typeof actual !== 'number' || actual > expected) {
          throw new Error(`Expected ${actual} to be less than or equal to ${expected}`);
        }
      },
      toBeGreaterThanOrEqual: (expected: number) => {
        if (typeof actual !== 'number' || actual < expected) {
          throw new Error(`Expected ${actual} to be greater than or equal to ${expected}`);
        }
      },
      toBeCloseTo: (expected: number, precision: number = 2) => {
        if (typeof actual !== 'number' || Math.abs(actual - expected) > Math.pow(10, -precision)) {
          throw new Error(`Expected ${actual} to be close to ${expected} (precision: ${precision})`);
        }
      }
    };
  }

  run() {
    console.log('Running NameMatchingEngine tests...\n');
    
    for (const test of this.tests) {
      try {
        test.fn();
        console.log(`✓ ${test.name}`);
        this.passed++;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`✗ ${test.name}: ${errorMessage}`);
        this.failed++;
      }
    }
    
    console.log(`\nTest Results: ${this.passed} passed, ${this.failed} failed`);
    
    if (this.failed > 0) {
      throw new Error(`${this.failed} test(s) failed`);
    }
  }
}

// Test data
const createMockRecipient = (email: string, extractedNames: string[], displayName?: string): ParsedRecipient => ({
  email,
  extractedNames,
  displayName,
  isGeneric: false
});

const createMockGreeting = (extractedName: string): GreetingMatch => ({
  fullMatch: `Hi ${extractedName}`,
  extractedName,
  position: 0,
  confidence: 1.0
});

// Initialize test runner
const runner = new TestRunner();

// Test exact matching
runner.test('should perform exact matching correctly', () => {
  const engine = new NameMatchingEngine();
  const recipients = [
    createMockRecipient('john.doe@example.com', ['john', 'doe'], 'John Doe'),
    createMockRecipient('jane.smith@example.com', ['jane', 'smith'], 'Jane Smith')
  ];
  
  const result = engine.findBestMatch('john', recipients);
  
  runner.expect(result.matchType).toBe('exact');
  runner.expect(result.confidence).toBe(1.0);
  runner.expect(result.recipient.email).toBe('john.doe@example.com');
});

// Test partial matching
runner.test('should perform partial matching correctly', () => {
  const engine = new NameMatchingEngine();
  const recipients = [
    createMockRecipient('jonathan.doe@example.com', ['jonathan', 'doe'], 'Jonathan Doe')
  ];
  
  const result = engine.findBestMatch('john', recipients);
  
  runner.expect(result.matchType).toBe('partial');
  runner.expect(result.confidence).toBeGreaterThan(0);
  runner.expect(result.confidence).toBeLessThanOrEqual(0.8);
});

// Test fuzzy matching
runner.test('should perform fuzzy matching for misspellings', () => {
  const engine = new NameMatchingEngine();
  const recipients = [
    createMockRecipient('john.doe@example.com', ['john', 'doe'], 'John Doe')
  ];
  
  const result = engine.findBestMatch('jhon', recipients); // Misspelled 'john'
  
  runner.expect(result.matchType).toBe('fuzzy');
  runner.expect(result.confidence).toBeGreaterThan(0);
  runner.expect(result.confidence).toBeLessThanOrEqual(0.6);
});

// Test no match scenario
runner.test('should return no match when no suitable match found', () => {
  const engine = new NameMatchingEngine();
  const recipients = [
    createMockRecipient('john.doe@example.com', ['john', 'doe'], 'John Doe')
  ];
  
  const result = engine.findBestMatch('completely-different-name', recipients);
  
  runner.expect(result.matchType).toBe('none');
  runner.expect(result.confidence).toBe(0);
});

// Test validation with multiple greetings and recipients
runner.test('should validate multiple greetings against multiple recipients', () => {
  const engine = new NameMatchingEngine();
  const greetings = [
    createMockGreeting('john'),
    createMockGreeting('jane'),
    createMockGreeting('unknown')
  ];
  const recipients = [
    createMockRecipient('john.doe@example.com', ['john', 'doe'], 'John Doe'),
    createMockRecipient('jane.smith@example.com', ['jane', 'smith'], 'Jane Smith')
  ];
  
  const results = engine.validateNames(greetings, recipients);
  
  runner.expect(results).toHaveLength(3);
  runner.expect(results[0].isValid).toBeTruthy(); // john should match
  runner.expect(results[1].isValid).toBeTruthy(); // jane should match
  runner.expect(results[2].isValid).toBeFalsy(); // unknown should not match
});

// Test confidence threshold
runner.test('should respect minimum confidence threshold', () => {
  const engine = new NameMatchingEngine(true, 0.9); // High threshold
  const recipients = [
    createMockRecipient('john.doe@example.com', ['john', 'doe'], 'John Doe')
  ];
  
  const greetings = [createMockGreeting('jhon')]; // Misspelled, low confidence
  const results = engine.validateNames(greetings, recipients);
  
  runner.expect(results[0].isValid).toBeFalsy(); // Should fail due to low confidence
});

// Test generic recipient filtering
runner.test('should filter out generic recipients', () => {
  const engine = new NameMatchingEngine();
  const greetings = [createMockGreeting('support')];
  const recipients = [
    { email: 'support@example.com', extractedNames: ['support'], isGeneric: true },
    createMockRecipient('john.doe@example.com', ['john', 'doe'], 'John Doe')
  ];
  
  const results = engine.validateNames(greetings, recipients);
  
  // Should not match against generic recipient
  runner.expect(results[0].isValid).toBeFalsy();
});

// Test display name parsing
runner.test('should extract names from display names', () => {
  const engine = new NameMatchingEngine();
  const recipients = [
    createMockRecipient('j.doe@example.com', ['j'], 'John Michael Doe')
  ];
  
  const result = engine.findBestMatch('michael', recipients);
  
  runner.expect(result.matchType).toBe('exact');
  runner.expect(result.confidence).toBe(1.0);
});

// Test case insensitive matching
runner.test('should perform case insensitive matching', () => {
  const engine = new NameMatchingEngine();
  const recipients = [
    createMockRecipient('john.doe@example.com', ['JOHN', 'DOE'], 'JOHN DOE')
  ];
  
  const result = engine.findBestMatch('john', recipients);
  
  runner.expect(result.matchType).toBe('exact');
  runner.expect(result.confidence).toBe(1.0);
});

// Test Levenshtein distance calculation
runner.test('should calculate Levenshtein distance correctly', () => {
  const engine = new NameMatchingEngine();
  
  // Access private method through any cast for testing
  const engineAny = engine as any;
  
  const distance1 = engineAny.levenshteinDistance('cat', 'bat');
  const distance2 = engineAny.levenshteinDistance('john', 'jhon');
  
  runner.expect(distance1).toBe(1);
  runner.expect(distance2).toBe(2);
});

// Test name normalization
runner.test('should normalize names correctly', () => {
  const engine = new NameMatchingEngine();
  
  // Access private method through any cast for testing
  const engineAny = engine as any;
  
  const normalized1 = engineAny.normalizeName('  John-Michael  ');
  const normalized2 = engineAny.normalizeName('O\'Connor');
  
  runner.expect(normalized1).toBe('johnmichael');
  runner.expect(normalized2).toBe('oconnor');
});

// Run all tests
try {
  runner.run();
  console.log('\n✅ All NameMatchingEngine tests passed!');
} catch (error) {
  console.error('\n❌ Some tests failed:', error);
  throw error;
}