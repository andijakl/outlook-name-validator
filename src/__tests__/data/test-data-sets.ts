/**
 * Test Data Sets for Outlook Name Validator
 * 
 * Comprehensive test data covering various email patterns and edge cases
 * Requirements: All requirements (1.1-5.5) through diverse test scenarios
 */

export class TestDataSets {
  
  /**
   * Email greeting patterns for testing name extraction
   */
  static getGreetingPatterns(): GreetingTestCase[] {
    return [
      // Basic greetings (Requirement 5.1)
      { greeting: 'Hi John,', expectedNames: ['John'], confidence: 0.9 },
      { greeting: 'Hello Sarah,', expectedNames: ['Sarah'], confidence: 0.9 },
      { greeting: 'Dear Michael,', expectedNames: ['Michael'], confidence: 0.9 },
      { greeting: 'Hey Lisa,', expectedNames: ['Lisa'], confidence: 0.8 },
      
      // Greetings with titles/honorifics (Requirement 5.2)
      { greeting: 'Dear Mr. Johnson,', expectedNames: ['Johnson'], confidence: 0.9 },
      { greeting: 'Hello Dr. Smith,', expectedNames: ['Smith'], confidence: 0.9 },
      { greeting: 'Hi Ms. Williams,', expectedNames: ['Williams'], confidence: 0.9 },
      { greeting: 'Dear Prof. Anderson,', expectedNames: ['Anderson'], confidence: 0.8 },
      
      // Multiple names in greeting (Requirement 2.5, 5.3)
      { greeting: 'Hi John and Sarah,', expectedNames: ['John', 'Sarah'], confidence: 0.9 },
      { greeting: 'Hello Mike, Lisa, and Tom,', expectedNames: ['Mike', 'Lisa', 'Tom'], confidence: 0.8 },
      { greeting: 'Dear John & Jane,', expectedNames: ['John', 'Jane'], confidence: 0.9 },
      
      // Case variations (Requirement 1.3)
      { greeting: 'HI JOHN,', expectedNames: ['JOHN'], confidence: 0.9 },
      { greeting: 'hello sarah,', expectedNames: ['sarah'], confidence: 0.9 },
      { greeting: 'Dear MiChAeL,', expectedNames: ['MiChAeL'], confidence: 0.9 },
      
      // Edge cases
      { greeting: 'Hi John-Paul,', expectedNames: ['John-Paul'], confidence: 0.8 },
      { greeting: 'Hello Mary Jane,', expectedNames: ['Mary Jane'], confidence: 0.7 },
      { greeting: 'Dear O\'Connor,', expectedNames: ['O\'Connor'], confidence: 0.8 },
      
      // No greeting cases (Requirement 5.5)
      { greeting: 'Thank you for your email.', expectedNames: [], confidence: 0.0 },
      { greeting: 'Please find attached...', expectedNames: [], confidence: 0.0 },
      
      // Multiple greetings in one email (Requirement 5.3)
      { greeting: 'Hi John,\n\nHello Sarah,', expectedNames: ['John', 'Sarah'], confidence: 0.8 }
    ];
  }

  /**
   * Email address patterns for testing recipient parsing
   */
  static getEmailAddressPatterns(): EmailTestCase[] {
    return [
      // Standard formats (Requirement 2.1)
      { 
        email: 'john.doe@company.com', 
        displayName: 'John Doe',
        expectedNames: ['john', 'doe'],
        isGeneric: false
      },
      { 
        email: 'sarah.smith@company.com', 
        displayName: '',
        expectedNames: ['sarah', 'smith'],
        isGeneric: false
      },
      
      // Underscore separators (Requirement 2.4)
      { 
        email: 'mike_johnson@company.com', 
        displayName: 'Mike Johnson',
        expectedNames: ['mike', 'johnson'],
        isGeneric: false
      },
      
      // Hyphen separators (Requirement 2.4)
      { 
        email: 'mary-jane@company.com', 
        displayName: 'Mary-Jane Wilson',
        expectedNames: ['mary', 'jane'],
        isGeneric: false
      },
      
      // No separators
      { 
        email: 'johndoe@company.com', 
        displayName: 'John Doe',
        expectedNames: ['johndoe'],
        isGeneric: false
      },
      
      // Multiple name parts (Requirement 2.3)
      { 
        email: 'john.doe.smith@company.com', 
        displayName: 'John Doe Smith',
        expectedNames: ['john', 'doe', 'smith'],
        isGeneric: false
      },
      
      // Numbers in email
      { 
        email: 'john.doe2@company.com', 
        displayName: 'John Doe',
        expectedNames: ['john', 'doe2'],
        isGeneric: false
      },
      
      // Generic email addresses (Requirement 5.4)
      { 
        email: 'info@company.com', 
        displayName: 'Company Info',
        expectedNames: ['info'],
        isGeneric: true
      },
      { 
        email: 'support@company.com', 
        displayName: 'Support Team',
        expectedNames: ['support'],
        isGeneric: true
      },
      { 
        email: 'noreply@company.com', 
        displayName: 'No Reply',
        expectedNames: ['noreply'],
        isGeneric: true
      },
      
      // Complex display names
      { 
        email: 'j.doe@company.com', 
        displayName: 'John "Johnny" Doe Jr.',
        expectedNames: ['j', 'doe'],
        isGeneric: false
      }
    ];
  }

  /**
   * Name matching scenarios for testing validation logic
   */
  static getNameMatchingScenarios(): MatchingTestCase[] {
    return [
      // Exact matches (Requirement 1.3)
      {
        greetingName: 'John',
        recipientNames: ['john', 'doe'],
        expectedMatch: true,
        expectedConfidence: 1.0,
        matchType: 'exact'
      },
      {
        greetingName: 'Doe',
        recipientNames: ['john', 'doe'],
        expectedMatch: true,
        expectedConfidence: 1.0,
        matchType: 'exact'
      },
      
      // Case insensitive matches (Requirement 1.3)
      {
        greetingName: 'JOHN',
        recipientNames: ['john', 'doe'],
        expectedMatch: true,
        expectedConfidence: 1.0,
        matchType: 'exact'
      },
      {
        greetingName: 'john',
        recipientNames: ['JOHN', 'DOE'],
        expectedMatch: true,
        expectedConfidence: 1.0,
        matchType: 'exact'
      },
      
      // Partial matches (Requirement 2.2)
      {
        greetingName: 'Johnny',
        recipientNames: ['john', 'doe'],
        expectedMatch: true,
        expectedConfidence: 0.8,
        matchType: 'partial'
      },
      {
        greetingName: 'Mike',
        recipientNames: ['michael', 'smith'],
        expectedMatch: true,
        expectedConfidence: 0.7,
        matchType: 'partial'
      },
      
      // Fuzzy matches (common misspellings)
      {
        greetingName: 'Jon',
        recipientNames: ['john', 'doe'],
        expectedMatch: true,
        expectedConfidence: 0.9,
        matchType: 'fuzzy'
      },
      {
        greetingName: 'Sara',
        recipientNames: ['sarah', 'smith'],
        expectedMatch: true,
        expectedConfidence: 0.9,
        matchType: 'fuzzy'
      },
      
      // No matches
      {
        greetingName: 'Alice',
        recipientNames: ['john', 'doe'],
        expectedMatch: false,
        expectedConfidence: 0.0,
        matchType: 'none'
      },
      
      // Multiple name parts matching (Requirement 2.3)
      {
        greetingName: 'Smith',
        recipientNames: ['john', 'doe', 'smith'],
        expectedMatch: true,
        expectedConfidence: 1.0,
        matchType: 'exact'
      }
    ];
  }

  /**
   * Complete email scenarios for end-to-end testing
   */
  static getCompleteEmailScenarios(): CompleteEmailTestCase[] {
    return [
      // Single recipient, perfect match
      {
        emailContent: 'Hi John,\n\nHow are you doing today?\n\nBest regards,\nSender',
        recipients: [{ emailAddress: 'john.doe@company.com', displayName: 'John Doe' }],
        expectedValidations: [
          { greetingName: 'John', isValid: true, confidence: 1.0 }
        ]
      },
      
      // Single recipient, mismatch
      {
        emailContent: 'Hi Jane,\n\nHow are you doing today?\n\nBest regards,\nSender',
        recipients: [{ emailAddress: 'john.doe@company.com', displayName: 'John Doe' }],
        expectedValidations: [
          { greetingName: 'Jane', isValid: false, confidence: 0.0, suggestedName: 'John' }
        ]
      },
      
      // Multiple recipients, all match
      {
        emailContent: 'Hi John and Sarah,\n\nHope you are both well.\n\nBest,\nSender',
        recipients: [
          { emailAddress: 'john.doe@company.com', displayName: 'John Doe' },
          { emailAddress: 'sarah.smith@company.com', displayName: 'Sarah Smith' }
        ],
        expectedValidations: [
          { greetingName: 'John', isValid: true, confidence: 1.0 },
          { greetingName: 'Sarah', isValid: true, confidence: 1.0 }
        ]
      },
      
      // Multiple recipients, partial match
      {
        emailContent: 'Hi John and Jane,\n\nHope you are both well.\n\nBest,\nSender',
        recipients: [
          { emailAddress: 'john.doe@company.com', displayName: 'John Doe' },
          { emailAddress: 'sarah.smith@company.com', displayName: 'Sarah Smith' }
        ],
        expectedValidations: [
          { greetingName: 'John', isValid: true, confidence: 1.0 },
          { greetingName: 'Jane', isValid: false, confidence: 0.0, suggestedName: 'Sarah' }
        ]
      },
      
      // Generic email addresses (should be skipped)
      {
        emailContent: 'Hi Support,\n\nI need help with my account.\n\nThanks,\nUser',
        recipients: [{ emailAddress: 'support@company.com', displayName: 'Support Team' }],
        expectedValidations: [] // Should skip validation for generic addresses
      },
      
      // No greeting
      {
        emailContent: 'Please find the attached document.\n\nThank you.',
        recipients: [{ emailAddress: 'john.doe@company.com', displayName: 'John Doe' }],
        expectedValidations: [] // Should skip validation when no greeting found
      },
      
      // Complex names with titles
      {
        emailContent: 'Dear Dr. Johnson,\n\nThank you for your time.\n\nBest regards,\nPatient',
        recipients: [{ emailAddress: 'robert.johnson@hospital.com', displayName: 'Dr. Robert Johnson' }],
        expectedValidations: [
          { greetingName: 'Johnson', isValid: true, confidence: 1.0 }
        ]
      },
      
      // Case insensitive matching
      {
        emailContent: 'HI JOHN,\n\nHOW ARE YOU?\n\nBEST,\nSENDER',
        recipients: [{ emailAddress: 'john.doe@company.com', displayName: 'john doe' }],
        expectedValidations: [
          { greetingName: 'JOHN', isValid: true, confidence: 1.0 }
        ]
      }
    ];
  }

  /**
   * Performance test scenarios with varying complexity
   */
  static getPerformanceTestScenarios(): PerformanceTestCase[] {
    return [
      // Small email
      {
        name: 'Small email (1 recipient, short content)',
        emailContent: 'Hi John,\n\nThanks!\n\nBest,\nSender',
        recipientCount: 1,
        expectedMaxProcessingTime: 50 // milliseconds
      },
      
      // Medium email
      {
        name: 'Medium email (5 recipients, medium content)',
        emailContent: 'Hi John, Sarah, Mike, Lisa, and Tom,\n\n' + 'Lorem ipsum '.repeat(100) + '\n\nBest regards,\nSender',
        recipientCount: 5,
        expectedMaxProcessingTime: 200
      },
      
      // Large email
      {
        name: 'Large email (20 recipients, long content)',
        emailContent: 'Hi Team,\n\n' + 'Lorem ipsum dolor sit amet, '.repeat(1000) + '\n\nBest,\nSender',
        recipientCount: 20,
        expectedMaxProcessingTime: 500
      },
      
      // Very large email
      {
        name: 'Very large email (100 recipients, very long content)',
        emailContent: 'Hi Everyone,\n\n' + 'Lorem ipsum dolor sit amet, '.repeat(5000) + '\n\nBest,\nSender',
        recipientCount: 100,
        expectedMaxProcessingTime: 2000
      }
    ];
  }

  /**
   * Edge case scenarios for robust testing
   */
  static getEdgeCaseScenarios(): EdgeCaseTestCase[] {
    return [
      // Empty content
      {
        name: 'Empty email content',
        emailContent: '',
        recipients: [{ emailAddress: 'john.doe@company.com', displayName: 'John Doe' }],
        expectedBehavior: 'skip_validation'
      },
      
      // Only whitespace
      {
        name: 'Whitespace only content',
        emailContent: '   \n\n   \t   ',
        recipients: [{ emailAddress: 'john.doe@company.com', displayName: 'John Doe' }],
        expectedBehavior: 'skip_validation'
      },
      
      // No recipients
      {
        name: 'No recipients',
        emailContent: 'Hi John,\n\nHow are you?\n\nBest,\nSender',
        recipients: [],
        expectedBehavior: 'skip_validation'
      },
      
      // Special characters in names
      {
        name: 'Special characters in names',
        emailContent: 'Hi José,\n\nHola!\n\nSaludos,\nSender',
        recipients: [{ emailAddress: 'jose.garcia@company.com', displayName: 'José García' }],
        expectedBehavior: 'validate_with_unicode'
      },
      
      // Very long names
      {
        name: 'Very long names',
        emailContent: 'Hi Bartholomew,\n\nGreetings!\n\nBest,\nSender',
        recipients: [{ emailAddress: 'bartholomew.wellington-smythe@company.com', displayName: 'Bartholomew Wellington-Smythe III' }],
        expectedBehavior: 'validate_long_names'
      },
      
      // HTML content
      {
        name: 'HTML email content',
        emailContent: '<p>Hi <strong>John</strong>,</p><p>How are you?</p><p>Best,<br>Sender</p>',
        recipients: [{ emailAddress: 'john.doe@company.com', displayName: 'John Doe' }],
        expectedBehavior: 'parse_html_content'
      },
      
      // Mixed case email addresses
      {
        name: 'Mixed case email addresses',
        emailContent: 'Hi John,\n\nHow are you?\n\nBest,\nSender',
        recipients: [{ emailAddress: 'John.Doe@Company.COM', displayName: 'John Doe' }],
        expectedBehavior: 'normalize_email_case'
      }
    ];
  }
}

// Type definitions for test data
export interface GreetingTestCase {
  greeting: string;
  expectedNames: string[];
  confidence: number;
}

export interface EmailTestCase {
  email: string;
  displayName: string;
  expectedNames: string[];
  isGeneric: boolean;
}

export interface MatchingTestCase {
  greetingName: string;
  recipientNames: string[];
  expectedMatch: boolean;
  expectedConfidence: number;
  matchType: 'exact' | 'partial' | 'fuzzy' | 'none';
}

export interface CompleteEmailTestCase {
  emailContent: string;
  recipients: Array<{ emailAddress: string; displayName: string }>;
  expectedValidations: Array<{
    greetingName: string;
    isValid: boolean;
    confidence: number;
    suggestedName?: string;
  }>;
}

export interface PerformanceTestCase {
  name: string;
  emailContent: string;
  recipientCount: number;
  expectedMaxProcessingTime: number;
}

export interface EdgeCaseTestCase {
  name: string;
  emailContent: string;
  recipients: Array<{ emailAddress: string; displayName: string }>;
  expectedBehavior: string;
}