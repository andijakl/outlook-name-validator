/**
 * Unit tests for RecipientParser functionality
 */

import { RecipientParser } from '../recipient-parser';

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
      toBeUndefined: () => {
        if (actual !== undefined) {
          throw new Error(`Expected undefined, but got ${actual}`);
        }
      },
      toThrow: (expectedMessage?: string) => {
        let threw = false;
        let actualMessage = '';
        try {
          if (typeof actual === 'function') {
            actual();
          }
        } catch (error) {
          threw = true;
          actualMessage = error instanceof Error ? error.message : String(error);
        }
        if (!threw) {
          throw new Error('Expected function to throw an error');
        }
        if (expectedMessage && !actualMessage.includes(expectedMessage)) {
          throw new Error(`Expected error message to contain "${expectedMessage}", but got "${actualMessage}"`);
        }
      }
    };
  }

  run(): boolean {
    console.log('Running RecipientParser tests...\n');
    
    for (const test of this.tests) {
      try {
        test.fn();
        console.log(`✓ ${test.name}`);
        this.passed++;
      } catch (error) {
        console.log(`✗ ${test.name}`);
        console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
        this.failed++;
      }
    }

    console.log(`\nTest Results: ${this.passed} passed, ${this.failed} failed`);
    return this.failed === 0;
  }
}

// Test suite
function runRecipientParserTests(): boolean {
  const runner = new TestRunner();
  const parser = new RecipientParser();

  // Basic email parsing tests
  runner.test('should parse simple firstname.lastname email format', () => {
    const result = parser.parseEmailAddress('john.doe@company.com');
    
    runner.expect(result.email).toBe('john.doe@company.com');
    runner.expect(result.extractedNames).toEqual(['john', 'doe']);
    runner.expect(result.isGeneric).toBe(false);
    runner.expect(result.displayName).toBeUndefined();
  });

  runner.test('should parse email with display name', () => {
    const result = parser.parseEmailAddress('john.doe@company.com', 'John Doe');
    
    runner.expect(result.email).toBe('john.doe@company.com');
    runner.expect(result.extractedNames).toEqual(['john', 'doe']);
    runner.expect(result.isGeneric).toBe(false);
    runner.expect(result.displayName).toBe('John Doe');
  });

  runner.test('should parse email with underscores', () => {
    const result = parser.parseEmailAddress('jane_smith@company.com');
    runner.expect(result.extractedNames).toEqual(['jane', 'smith']);
  });

  runner.test('should parse email with hyphens', () => {
    const result = parser.parseEmailAddress('mary-jane@company.com');
    runner.expect(result.extractedNames).toEqual(['mary', 'jane']);
  });

  runner.test('should parse camelCase email addresses', () => {
    const result = parser.parseEmailAddress('johnDoe@company.com');
    runner.expect(result.extractedNames).toEqual(['john', 'doe']);
  });

  runner.test('should parse email with multiple name parts', () => {
    const result = parser.parseEmailAddress('john.doe.smith@company.com');
    runner.expect(result.extractedNames).toEqual(['john', 'doe', 'smith']);
  });

  runner.test('should normalize case differences', () => {
    const result = parser.parseEmailAddress('JOHN.DOE@COMPANY.COM');
    runner.expect(result.email).toBe('john.doe@company.com');
    runner.expect(result.extractedNames).toEqual(['john', 'doe']);
  });

  runner.test('should filter out single character parts', () => {
    const result = parser.parseEmailAddress('j.doe@company.com');
    runner.expect(result.extractedNames).toEqual(['doe']);
  });

  runner.test('should handle display names with titles', () => {
    const result = parser.parseEmailAddress('john.doe@company.com', 'Dr. John Doe');
    runner.expect(result.extractedNames).toEqual(['john', 'doe']);
  });

  runner.test('should throw error for invalid email input', () => {
    runner.expect(() => parser.parseEmailAddress('')).toThrow('Email address is required');
    runner.expect(() => parser.parseEmailAddress(null as any)).toThrow('Email address is required');
  });

  // Generic email detection tests
  runner.test('should detect info@ as generic email', () => {
    const result = parser.parseEmailAddress('info@company.com');
    runner.expect(result.isGeneric).toBe(true);
  });

  runner.test('should detect support@ as generic email', () => {
    const result = parser.parseEmailAddress('support@company.com');
    runner.expect(result.isGeneric).toBe(true);
  });

  runner.test('should detect noreply@ as generic email', () => {
    const result = parser.parseEmailAddress('noreply@company.com');
    runner.expect(result.isGeneric).toBe(true);
  });

  runner.test('should detect generic emails case-insensitively', () => {
    const result1 = parser.parseEmailAddress('INFO@COMPANY.COM');
    const result2 = parser.parseEmailAddress('Support@Company.Com');
    
    runner.expect(result1.isGeneric).toBe(true);
    runner.expect(result2.isGeneric).toBe(true);
  });

  runner.test('should not detect personal emails as generic', () => {
    const result = parser.parseEmailAddress('john.doe@company.com');
    runner.expect(result.isGeneric).toBe(false);
  });

  // Multiple recipients tests
  runner.test('should extract multiple recipients', () => {
    const recipients: { emailAddress: string; displayName?: string }[] = [
      { emailAddress: 'john.doe@company.com', displayName: 'John Doe' },
      { emailAddress: 'jane.smith@company.com', displayName: 'Jane Smith' }
    ];

    const results = parser.extractAllRecipients(recipients);

    runner.expect(results).toHaveLength(2);
    runner.expect(results[0].extractedNames).toEqual(['john', 'doe']);
    runner.expect(results[1].extractedNames).toEqual(['jane', 'smith']);
  });

  runner.test('should handle empty recipient array', () => {
    const results = parser.extractAllRecipients([]);
    runner.expect(results).toEqual([]);
  });

  runner.test('should filter out invalid recipients', () => {
    const recipients: { emailAddress: string; displayName?: string }[] = [
      { emailAddress: 'john.doe@company.com', displayName: 'John Doe' },
      { emailAddress: '', displayName: 'Empty Email' },
      null as any,
      { emailAddress: 'jane.smith@company.com', displayName: 'Jane Smith' }
    ];

    const results = parser.extractAllRecipients(recipients);

    runner.expect(results).toHaveLength(2);
    runner.expect(results[0].extractedNames).toEqual(['john', 'doe']);
    runner.expect(results[1].extractedNames).toEqual(['jane', 'smith']);
  });

  // Name normalization tests
  runner.test('should normalize case', () => {
    runner.expect(parser.normalizeName('JOHN')).toBe('john');
    runner.expect(parser.normalizeName('John')).toBe('john');
  });

  runner.test('should trim whitespace', () => {
    runner.expect(parser.normalizeName('  john  ')).toBe('john');
  });

  runner.test('should handle empty input', () => {
    runner.expect(parser.normalizeName('')).toBe('');
    runner.expect(parser.normalizeName(null as any)).toBe('');
  });

  runner.test('should preserve hyphens and apostrophes', () => {
    runner.expect(parser.normalizeName("o'connor")).toBe("o'connor");
    runner.expect(parser.normalizeName('mary-jane')).toBe('mary-jane');
  });

  // Test camelCase splitting directly
  runner.test('should split camelCase correctly', () => {
    // Access the private method for testing
    const splitResult = (parser as any).splitCamelCase('johnDoe');
    runner.expect(splitResult).toEqual(['john', 'Doe']);
  });

  // Edge cases
  runner.test('should handle emails without @ symbol', () => {
    const result = parser.parseEmailAddress('invalidemail');
    runner.expect(result.extractedNames).toEqual([]);
  });

  runner.test('should handle consecutive separators', () => {
    const result = parser.parseEmailAddress('john..doe@company.com');
    runner.expect(result.extractedNames).toEqual(['john', 'doe']);
  });

  runner.test('should handle display names with commas', () => {
    const result = parser.parseEmailAddress('john.doe@company.com', 'Doe, John');
    runner.expect(result.extractedNames).toEqual(['doe', 'john']);
  });

  return runner.run();
}

// Export the test runner
export const runner = {
  run: runRecipientParserTests
};