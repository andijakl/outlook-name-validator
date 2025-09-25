/**
 * Unit tests for EmailContentParser functionality
 */

import { EmailContentParserImpl } from '../email-content-parser';
import { GreetingMatch, ParsedContent } from '../interfaces';

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
      }
    };
  }

  run() {
    console.log('Running EmailContentParser tests...\n');
    
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
    return this.failed === 0;
  }
}

const runner = new TestRunner();
const parser = new EmailContentParserImpl();

// Basic greeting extraction tests
runner.test('should extract simple Hi greeting', () => {
  const content = 'Hi John,\n\nHow are you?';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(1);
  runner.expect(matches[0].extractedName).toBe('john');
  runner.expect(matches[0].fullMatch).toBe('Hi John');
  runner.expect(matches[0].position).toBe(0);
});

runner.test('should extract Hello greeting', () => {
  const content = 'Hello Jane, hope you are well.';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(1);
  runner.expect(matches[0].extractedName).toBe('jane');
  runner.expect(matches[0].fullMatch).toBe('Hello Jane');
});

runner.test('should extract Hey greeting', () => {
  const content = 'Hey Bob! What\'s up?';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(1);
  runner.expect(matches[0].extractedName).toBe('bob');
  runner.expect(matches[0].fullMatch).toBe('Hey Bob');
});

// Dear greeting tests
runner.test('should extract Dear greeting', () => {
  const content = 'Dear Sarah,\n\nI hope this email finds you well.';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(1);
  runner.expect(matches[0].extractedName).toBe('sarah');
  runner.expect(matches[0].fullMatch).toBe('Dear Sarah');
});

runner.test('should extract Dear with title', () => {
  const content = 'Dear Mr. Smith,\n\nThank you for your inquiry.';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(1);
  runner.expect(matches[0].extractedName).toBe('smith');
  runner.expect(matches[0].fullMatch).toBe('Dear Mr. Smith');
});

runner.test('should extract Dear with Dr. title', () => {
  const content = 'Dear Dr. Johnson,\n\nRegarding your research...';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(1);
  runner.expect(matches[0].extractedName).toBe('johnson');
});

runner.test('should extract Dear with Mrs. title', () => {
  const content = 'Dear Mrs. Williams,\n\nI wanted to follow up...';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(1);
  runner.expect(matches[0].extractedName).toBe('williams');
});

runner.test('should extract Dear with Ms. title', () => {
  const content = 'Dear Ms. Davis,\n\nThank you for your time.';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(1);
  runner.expect(matches[0].extractedName).toBe('davis');
});

// Good morning/afternoon/evening tests
runner.test('should extract Good morning greeting', () => {
  const content = 'Good morning Alice,\n\nI hope you had a great weekend.';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(1);
  runner.expect(matches[0].extractedName).toBe('alice');
  runner.expect(matches[0].fullMatch).toBe('Good morning Alice');
});

runner.test('should extract Good afternoon greeting', () => {
  const content = 'Good afternoon Michael,\n\nJust wanted to check in.';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(1);
  runner.expect(matches[0].extractedName).toBe('michael');
});

runner.test('should extract Good evening greeting', () => {
  const content = 'Good evening Lisa,\n\nHope your day went well.';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(1);
  runner.expect(matches[0].extractedName).toBe('lisa');
});

// Multiple names tests
runner.test('should extract multiple names with "and"', () => {
  const content = 'Hi John and Jane,\n\nThanks for the meeting.';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(2);
  const names = matches.map(m => m.extractedName).sort();
  runner.expect(names).toEqual(['jane', 'john']);
});

runner.test('should extract multiple names with comma', () => {
  const content = 'Hello Tom, Jerry\n\nLet\'s schedule a call.';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(2);
  const names = matches.map(m => m.extractedName).sort();
  runner.expect(names).toEqual(['jerry', 'tom']);
});

// Full name tests
runner.test('should extract first and last names separately', () => {
  const content = 'Hi John Smith,\n\nNice to meet you.';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(2);
  const names = matches.map(m => m.extractedName).sort();
  runner.expect(names).toEqual(['john', 'smith']);
});

runner.test('should extract three-part names', () => {
  const content = 'Dear Mary Jane Watson,\n\nThank you for your application.';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(3);
  const names = matches.map(m => m.extractedName).sort();
  runner.expect(names).toEqual(['jane', 'mary', 'watson']);
});

// Edge cases and special characters
runner.test('should handle names with hyphens', () => {
  const content = 'Hi Anne-Marie,\n\nHow are you doing?';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(1);
  runner.expect(matches[0].extractedName).toBe('anne-marie');
});

runner.test('should handle names with apostrophes', () => {
  const content = 'Hello O\'Connor,\n\nThanks for reaching out.';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(1);
  runner.expect(matches[0].extractedName).toBe('o\'connor');
});

runner.test('should ignore common words', () => {
  const content = 'Hi everyone and all,\n\nWelcome to the team.';
  const matches = parser.extractGreetings(content);
  
  // Should not extract "everyone", "and", or "all" as names
  runner.expect(matches).toHaveLength(0);
});

runner.test('should handle case insensitive matching', () => {
  const content = 'HI JOHN,\n\nHOW ARE YOU?';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(1);
  runner.expect(matches[0].extractedName).toBe('john');
});

// Position tracking tests
runner.test('should track correct position of matches', () => {
  const content = 'Some text before.\n\nHi Jennifer,\n\nHow are you?';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(1);
  runner.expect(matches[0].position).toBe(19); // Position after "Some text before.\n\n"
});

runner.test('should handle multiple greetings in same email', () => {
  const content = 'Hi Sarah,\n\nI hope you are well. Please say hello to Mike for me.';
  const matches = parser.extractGreetings(content);
  
  // Should find both "Sarah" from "Hi Sarah" and "Mike" from "hello to Mike"
  // Note: might find more matches depending on parsing, so check that both names are present
  const names = matches.map(m => m.extractedName);
  runner.expect(names).toContain('sarah');
  runner.expect(names).toContain('mike');
});

// Confidence scoring tests
runner.test('should assign higher confidence to Dear greetings', () => {
  const content1 = 'Hi John,';
  const content2 = 'Dear John,';
  
  const matches1 = parser.extractGreetings(content1);
  const matches2 = parser.extractGreetings(content2);
  
  runner.expect(matches1).toHaveLength(1);
  runner.expect(matches2).toHaveLength(1);
  runner.expect(matches2[0].confidence).toBeGreaterThan(matches1[0].confidence);
});

runner.test('should assign lower confidence to very short names', () => {
  const content = 'Hi Al,\n\nHow are you?';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(1);
  runner.expect(matches[0].confidence).toBeLessThanOrEqual(0.6); // Should be reduced for short name
});

runner.test('should assign confidence between 0 and 1', () => {
  const content = 'Hi John Smith,\n\nNice to meet you.';
  const matches = parser.extractGreetings(content);
  
  for (const match of matches) {
    runner.expect(match.confidence).toBeGreaterThan(0);
    runner.expect(match.confidence).toBeLessThanOrEqual(1);
  }
});

// Deduplication tests
runner.test('should deduplicate identical matches', () => {
  const content = 'Hi John, Hi John again.';
  const matches = parser.extractGreetings(content);
  
  // Should only have one match for John despite appearing twice
  const johnMatches = matches.filter(m => m.extractedName === 'john');
  runner.expect(johnMatches).toHaveLength(1);
});

// parseEmailContent tests
runner.test('should parse email content and return structured result', () => {
  const content = 'Hi Alice,\n\nHow are you doing today?';
  const result = parser.parseEmailContent(content);
  
  runner.expect(result.hasValidContent).toBeTruthy();
  runner.expect(result.greetings).toHaveLength(1);
  runner.expect(result.greetings[0].extractedName).toBe('alice');
});

runner.test('should handle empty content', () => {
  const result = parser.parseEmailContent('');
  
  runner.expect(result.hasValidContent).toBeFalsy();
  runner.expect(result.greetings).toHaveLength(0);
});

runner.test('should handle null content', () => {
  const result = parser.parseEmailContent(null as any);
  
  runner.expect(result.hasValidContent).toBeFalsy();
  runner.expect(result.greetings).toHaveLength(0);
});

runner.test('should handle undefined content', () => {
  const result = parser.parseEmailContent(undefined as any);
  
  runner.expect(result.hasValidContent).toBeFalsy();
  runner.expect(result.greetings).toHaveLength(0);
});

runner.test('should handle content with no greetings', () => {
  const content = 'This is just some regular text without any greetings.';
  const result = parser.parseEmailContent(content);
  
  runner.expect(result.hasValidContent).toBeTruthy();
  runner.expect(result.greetings).toHaveLength(0);
});

// Complex real-world scenarios
runner.test('should handle complex email with signature', () => {
  const content = `Hi Jennifer,

I hope this email finds you well. I wanted to follow up on our conversation yesterday about the project timeline.

Please let me know if you have any questions.

Best regards,
John Smith
Senior Developer
Company Name`;

  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(1);
  runner.expect(matches[0].extractedName).toBe('jennifer');
});

runner.test('should handle email with quoted text', () => {
  const content = `Hi Robert,

Thanks for your message.

> Hi John,
> 
> Can you please review the document?

I'll take a look at it today.

Best,
John`;

  const matches = parser.extractGreetings(content);
  
  // Should find both "Robert" and "John" from the greetings
  runner.expect(matches).toHaveLength(2);
  const names = matches.map(m => m.extractedName).sort();
  runner.expect(names).toEqual(['john', 'robert']);
});

runner.test('should handle greetings with punctuation variations', () => {
  const testCases = [
    'Hi John!',
    'Hello Jane.',
    'Hey Bob?',
    'Dear Sarah;',
    'Hi Mike:'
  ];

  for (const content of testCases) {
    const matches = parser.extractGreetings(content);
    runner.expect(matches).toHaveLength(1);
  }
});

// German language support tests
runner.test('should extract German greeting "Hallo"', () => {
  const parser = new EmailContentParserImpl('de');
  const content = 'Hallo Hans,\n\nwie geht es dir?';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(1);
  runner.expect(matches[0].extractedName).toBe('hans');
});

runner.test('should extract German formal greeting "Lieber"', () => {
  const parser = new EmailContentParserImpl('de');
  const content = 'Lieber Herr Schmidt,\n\nvielen Dank für Ihre Nachricht.';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(1);
  runner.expect(matches[0].extractedName).toBe('schmidt');
});

runner.test('should extract German formal greeting "Sehr geehrte"', () => {
  const parser = new EmailContentParserImpl('de');
  const content = 'Sehr geehrte Frau Müller,\n\nwir freuen uns über Ihr Interesse.';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(1);
  runner.expect(matches[0].extractedName).toBe('müller');
});

runner.test('should extract German time-based greeting "Guten Morgen"', () => {
  const parser = new EmailContentParserImpl('de');
  const content = 'Guten Morgen Maria,\n\nich hoffe, Sie hatten ein schönes Wochenende.';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(1);
  runner.expect(matches[0].extractedName).toBe('maria');
});

runner.test('should extract Northern German greeting "Moin"', () => {
  const parser = new EmailContentParserImpl('de');
  const content = 'Moin Klaus,\n\nwie läuft das Projekt?';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(1);
  runner.expect(matches[0].extractedName).toBe('klaus');
});

runner.test('should handle German names with umlauts', () => {
  const parser = new EmailContentParserImpl('de');
  const content = 'Hallo Björn,\n\nkönnten Sie mir bitte helfen?';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(1);
  runner.expect(matches[0].extractedName).toBe('björn');
});

runner.test('should handle German "und" separator', () => {
  const parser = new EmailContentParserImpl('de');
  const content = 'Hallo Anna und Peter,\n\nschöne Grüße!';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(2);
  const names = matches.map(m => m.extractedName).sort();
  runner.expect(names).toEqual(['anna', 'peter']);
});

runner.test('should ignore German common words', () => {
  const parser = new EmailContentParserImpl('de');
  const content = 'Hallo alle und jeder,\n\nwillkommen im Team.';
  const matches = parser.extractGreetings(content);
  
  // Should not extract "alle", "und", or "jeder" as names
  runner.expect(matches).toHaveLength(0);
});

runner.test('should auto-detect German language', () => {
  const parser = new EmailContentParserImpl('auto');
  const content = 'Hallo Thomas,\n\nvielen Dank für Ihre Nachricht. Mit freundlichen Grüßen.';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(1);
  runner.expect(matches[0].extractedName).toBe('thomas');
});

runner.test('should auto-detect English language', () => {
  const parser = new EmailContentParserImpl('auto');
  const content = 'Hi Thomas,\n\nthank you for your message. Best regards.';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(1);
  runner.expect(matches[0].extractedName).toBe('thomas');
});

runner.test('should handle mixed German and English content', () => {
  const parser = new EmailContentParserImpl('auto');
  const content = 'Hallo John,\n\nthank you for the meeting. Mit freundlichen Grüßen.';
  const matches = parser.extractGreetings(content);
  
  runner.expect(matches).toHaveLength(1);
  runner.expect(matches[0].extractedName).toBe('john');
});

// Export the test runner for manual execution
export { runner };

// Auto-run tests if this file is executed directly
if (typeof window === 'undefined') {
  runner.run();
}