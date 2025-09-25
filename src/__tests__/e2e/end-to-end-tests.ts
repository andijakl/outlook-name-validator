/**
 * End-to-End Tests for Outlook Name Validator
 * 
 * Tests complete user workflows from email composition to validation results
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3
 */

import { TestRunner, TestFunction, TestResult } from '../test-runner';
import { ValidationOrchestrator } from '../../integration/validation-orchestrator';
import { EmailContentParser } from '../../models/email-content-parser';
import { RecipientParser } from '../../models/recipient-parser';
import { NameMatchingEngine } from '../../models/name-matching-engine';
import { NotificationSystem } from '../../models/notification-system';

export class EndToEndTests {
  private testRunner: TestRunner;
  private validationOrchestrator: ValidationOrchestrator;

  constructor() {
    this.testRunner = new TestRunner();
  }

  async runAllTests(): Promise<TestResult> {
    const tests: TestFunction[] = [
      // Requirement 1.1: Extract names from greetings
      {
        name: 'Complete workflow: Single recipient with matching name',
        execute: () => this.testSingleRecipientMatchingName()
      },
      {
        name: 'Complete workflow: Single recipient with mismatched name',
        execute: () => this.testSingleRecipientMismatchedName()
      },
      
      // Requirement 1.2: Extract names from email addresses
      {
        name: 'Complete workflow: Multiple recipients with partial matches',
        execute: () => this.testMultipleRecipientsPartialMatches()
      },
      
      // Requirement 1.3: Case insensitive matching
      {
        name: 'Complete workflow: Case insensitive name matching',
        execute: () => this.testCaseInsensitiveMatching()
      },
      
      // Requirement 1.4: Warning notifications
      {
        name: 'Complete workflow: Warning display and user interaction',
        execute: () => this.testWarningDisplayAndInteraction()
      },
      
      // Requirement 1.5: Highlight mismatches
      {
        name: 'Complete workflow: Mismatch highlighting',
        execute: () => this.testMismatchHighlighting()
      },
      
      // Requirement 2.1: First and last name components
      {
        name: 'Complete workflow: First and last name flexibility',
        execute: () => this.testFirstLastNameFlexibility()
      },
      
      // Requirement 2.2: Multiple name parts
      {
        name: 'Complete workflow: Multiple name parts in email',
        execute: () => this.testMultipleNameParts()
      },
      
      // Requirement 2.3: Common separators
      {
        name: 'Complete workflow: Email separators parsing',
        execute: () => this.testEmailSeparatorsParsing()
      },
      
      // Requirement 2.4: Multiple names in greeting
      {
        name: 'Complete workflow: Multiple names in greeting',
        execute: () => this.testMultipleNamesInGreeting()
      },
      
      // Requirement 3.1: Outlook integration
      {
        name: 'Complete workflow: Outlook compose window integration',
        execute: () => this.testOutlookIntegration()
      },
      
      // Requirement 3.2: Recipient changes
      {
        name: 'Complete workflow: Dynamic recipient validation',
        execute: () => this.testDynamicRecipientValidation()
      },
      
      // Requirement 3.3: Content changes
      {
        name: 'Complete workflow: Dynamic content validation',
        execute: () => this.testDynamicContentValidation()
      }
    ];

    return await this.testRunner.runTestSuite('End-to-End Tests', tests);
  }

  private async testSingleRecipientMatchingName() {
    // Setup test scenario
    const emailContent = 'Hi John,\n\nHow are you doing?\n\nBest regards,\nSender';
    const recipients = [{ emailAddress: 'john.doe@company.com', displayName: 'John Doe' }];
    
    // Initialize orchestrator
    this.validationOrchestrator = new ValidationOrchestrator();
    await this.validationOrchestrator.initialize();
    
    // Mock Office.js item
    global.Office.context.mailbox.item.body.getAsync = (callback) => {
      callback({ status: 'succeeded', value: emailContent });
    };
    
    global.Office.context.mailbox.item.to.getAsync = (callback) => {
      callback({ status: 'succeeded', value: recipients });
    };
    
    // Run validation
    const results = await this.validationOrchestrator.validateCurrentEmail();
    
    // Verify results
    if (!results || results.length === 0) {
      throw new Error('No validation results returned');
    }
    
    const result = results[0];
    if (!result.isValid) {
      throw new Error('Expected valid match but got invalid');
    }
    
    if (result.confidence < 0.8) {
      throw new Error(`Expected high confidence but got ${result.confidence}`);
    }
    
    return { status: 'passed' as const };
  }

  private async testSingleRecipientMismatchedName() {
    const emailContent = 'Hi Jane,\n\nHow are you doing?\n\nBest regards,\nSender';
    const recipients = [{ emailAddress: 'john.doe@company.com', displayName: 'John Doe' }];
    
    this.validationOrchestrator = new ValidationOrchestrator();
    await this.validationOrchestrator.initialize();
    
    global.Office.context.mailbox.item.body.getAsync = (callback) => {
      callback({ status: 'succeeded', value: emailContent });
    };
    
    global.Office.context.mailbox.item.to.getAsync = (callback) => {
      callback({ status: 'succeeded', value: recipients });
    };
    
    const results = await this.validationOrchestrator.validateCurrentEmail();
    
    if (!results || results.length === 0) {
      throw new Error('No validation results returned');
    }
    
    const result = results[0];
    if (result.isValid) {
      throw new Error('Expected invalid match but got valid');
    }
    
    if (!result.suggestedRecipient) {
      throw new Error('Expected suggested recipient for mismatch');
    }
    
    return { status: 'passed' as const };
  }

  private async testMultipleRecipientsPartialMatches() {
    const emailContent = 'Hi John and Sarah,\n\nHope you are both well.\n\nBest,\nSender';
    const recipients = [
      { emailAddress: 'john.smith@company.com', displayName: 'John Smith' },
      { emailAddress: 'sarah.jones@company.com', displayName: 'Sarah Jones' }
    ];
    
    this.validationOrchestrator = new ValidationOrchestrator();
    await this.validationOrchestrator.initialize();
    
    global.Office.context.mailbox.item.body.getAsync = (callback) => {
      callback({ status: 'succeeded', value: emailContent });
    };
    
    global.Office.context.mailbox.item.to.getAsync = (callback) => {
      callback({ status: 'succeeded', value: recipients });
    };
    
    const results = await this.validationOrchestrator.validateCurrentEmail();
    
    if (!results || results.length !== 2) {
      throw new Error(`Expected 2 validation results but got ${results?.length || 0}`);
    }
    
    const johnResult = results.find(r => r.greetingName.toLowerCase() === 'john');
    const sarahResult = results.find(r => r.greetingName.toLowerCase() === 'sarah');
    
    if (!johnResult || !sarahResult) {
      throw new Error('Missing validation results for John or Sarah');
    }
    
    if (!johnResult.isValid || !sarahResult.isValid) {
      throw new Error('Expected both names to be valid matches');
    }
    
    return { status: 'passed' as const };
  }

  private async testCaseInsensitiveMatching() {
    const emailContent = 'Hi JOHN,\n\nHow are you?\n\nBest,\nSender';
    const recipients = [{ emailAddress: 'john.doe@company.com', displayName: 'john doe' }];
    
    this.validationOrchestrator = new ValidationOrchestrator();
    await this.validationOrchestrator.initialize();
    
    global.Office.context.mailbox.item.body.getAsync = (callback) => {
      callback({ status: 'succeeded', value: emailContent });
    };
    
    global.Office.context.mailbox.item.to.getAsync = (callback) => {
      callback({ status: 'succeeded', value: recipients });
    };
    
    const results = await this.validationOrchestrator.validateCurrentEmail();
    
    if (!results || results.length === 0) {
      throw new Error('No validation results returned');
    }
    
    const result = results[0];
    if (!result.isValid) {
      throw new Error('Case insensitive matching failed');
    }
    
    return { status: 'passed' as const };
  }

  private async testWarningDisplayAndInteraction() {
    const emailContent = 'Hi Jane,\n\nHow are you?\n\nBest,\nSender';
    const recipients = [{ emailAddress: 'john.doe@company.com', displayName: 'John Doe' }];
    
    this.validationOrchestrator = new ValidationOrchestrator();
    await this.validationOrchestrator.initialize();
    
    // Mock notification system
    let warningDisplayed = false;
    let warningMessage = '';
    
    const originalShowWarning = NotificationSystem.prototype.showWarning;
    NotificationSystem.prototype.showWarning = function(validation) {
      warningDisplayed = true;
      warningMessage = `Name mismatch: "${validation.greetingName}" vs "${validation.suggestedRecipient?.extractedNames[0]}"`;
      return Promise.resolve();
    };
    
    global.Office.context.mailbox.item.body.getAsync = (callback) => {
      callback({ status: 'succeeded', value: emailContent });
    };
    
    global.Office.context.mailbox.item.to.getAsync = (callback) => {
      callback({ status: 'succeeded', value: recipients });
    };
    
    const results = await this.validationOrchestrator.validateCurrentEmail();
    
    // Restore original method
    NotificationSystem.prototype.showWarning = originalShowWarning;
    
    if (!warningDisplayed) {
      throw new Error('Warning was not displayed for name mismatch');
    }
    
    if (!warningMessage.includes('Jane') || !warningMessage.includes('John')) {
      throw new Error('Warning message does not contain expected names');
    }
    
    return { status: 'passed' as const };
  }

  private async testMismatchHighlighting() {
    // This test verifies that mismatches are properly highlighted in the UI
    const emailContent = 'Hi Jane,\n\nHow are you?\n\nBest,\nSender';
    const recipients = [{ emailAddress: 'john.doe@company.com', displayName: 'John Doe' }];
    
    this.validationOrchestrator = new ValidationOrchestrator();
    await this.validationOrchestrator.initialize();
    
    let highlightCalled = false;
    let highlightedName = '';
    let suggestedName = '';
    
    // Mock highlighting functionality
    const originalShowWarning = NotificationSystem.prototype.showWarning;
    NotificationSystem.prototype.showWarning = function(validation) {
      highlightCalled = true;
      highlightedName = validation.greetingName;
      suggestedName = validation.suggestedRecipient?.extractedNames[0] || '';
      return Promise.resolve();
    };
    
    global.Office.context.mailbox.item.body.getAsync = (callback) => {
      callback({ status: 'succeeded', value: emailContent });
    };
    
    global.Office.context.mailbox.item.to.getAsync = (callback) => {
      callback({ status: 'succeeded', value: recipients });
    };
    
    await this.validationOrchestrator.validateCurrentEmail();
    
    // Restore original method
    NotificationSystem.prototype.showWarning = originalShowWarning;
    
    if (!highlightCalled) {
      throw new Error('Highlighting was not called for mismatch');
    }
    
    if (highlightedName !== 'Jane') {
      throw new Error(`Expected to highlight "Jane" but highlighted "${highlightedName}"`);
    }
    
    if (suggestedName !== 'John') {
      throw new Error(`Expected suggestion "John" but got "${suggestedName}"`);
    }
    
    return { status: 'passed' as const };
  }

  private async testFirstLastNameFlexibility() {
    const testCases = [
      {
        greeting: 'Hi John,',
        email: 'john.doe@company.com',
        shouldMatch: true
      },
      {
        greeting: 'Hi Doe,',
        email: 'john.doe@company.com',
        shouldMatch: true
      },
      {
        greeting: 'Hi Smith,',
        email: 'john.doe@company.com',
        shouldMatch: false
      }
    ];
    
    for (const testCase of testCases) {
      this.validationOrchestrator = new ValidationOrchestrator();
      await this.validationOrchestrator.initialize();
      
      global.Office.context.mailbox.item.body.getAsync = (callback) => {
        callback({ status: 'succeeded', value: testCase.greeting + '\n\nTest message' });
      };
      
      global.Office.context.mailbox.item.to.getAsync = (callback) => {
        callback({ status: 'succeeded', value: [{ emailAddress: testCase.email, displayName: '' }] });
      };
      
      const results = await this.validationOrchestrator.validateCurrentEmail();
      
      if (!results || results.length === 0) {
        throw new Error(`No results for test case: ${testCase.greeting}`);
      }
      
      const result = results[0];
      if (result.isValid !== testCase.shouldMatch) {
        throw new Error(`Expected ${testCase.shouldMatch} for "${testCase.greeting}" vs "${testCase.email}"`);
      }
    }
    
    return { status: 'passed' as const };
  }

  private async testMultipleNameParts() {
    const emailContent = 'Hi John,\n\nHow are you?\n\nBest,\nSender';
    const recipients = [{ emailAddress: 'john.doe.smith@company.com', displayName: 'John Doe Smith' }];
    
    this.validationOrchestrator = new ValidationOrchestrator();
    await this.validationOrchestrator.initialize();
    
    global.Office.context.mailbox.item.body.getAsync = (callback) => {
      callback({ status: 'succeeded', value: emailContent });
    };
    
    global.Office.context.mailbox.item.to.getAsync = (callback) => {
      callback({ status: 'succeeded', value: recipients });
    };
    
    const results = await this.validationOrchestrator.validateCurrentEmail();
    
    if (!results || results.length === 0) {
      throw new Error('No validation results returned');
    }
    
    const result = results[0];
    if (!result.isValid) {
      throw new Error('Expected valid match for multiple name parts');
    }
    
    return { status: 'passed' as const };
  }

  private async testEmailSeparatorsParsing() {
    const testCases = [
      'john.doe@company.com',
      'john_doe@company.com',
      'john-doe@company.com',
      'johndoe@company.com'
    ];
    
    for (const email of testCases) {
      this.validationOrchestrator = new ValidationOrchestrator();
      await this.validationOrchestrator.initialize();
      
      global.Office.context.mailbox.item.body.getAsync = (callback) => {
        callback({ status: 'succeeded', value: 'Hi John,\n\nTest message' });
      };
      
      global.Office.context.mailbox.item.to.getAsync = (callback) => {
        callback({ status: 'succeeded', value: [{ emailAddress: email, displayName: '' }] });
      };
      
      const results = await this.validationOrchestrator.validateCurrentEmail();
      
      if (!results || results.length === 0) {
        throw new Error(`No results for email: ${email}`);
      }
      
      const result = results[0];
      if (!result.isValid) {
        throw new Error(`Expected valid match for email format: ${email}`);
      }
    }
    
    return { status: 'passed' as const };
  }

  private async testMultipleNamesInGreeting() {
    const emailContent = 'Hi John and Jane,\n\nHope you are both well.\n\nBest,\nSender';
    const recipients = [
      { emailAddress: 'john.doe@company.com', displayName: 'John Doe' },
      { emailAddress: 'jane.smith@company.com', displayName: 'Jane Smith' }
    ];
    
    this.validationOrchestrator = new ValidationOrchestrator();
    await this.validationOrchestrator.initialize();
    
    global.Office.context.mailbox.item.body.getAsync = (callback) => {
      callback({ status: 'succeeded', value: emailContent });
    };
    
    global.Office.context.mailbox.item.to.getAsync = (callback) => {
      callback({ status: 'succeeded', value: recipients });
    };
    
    const results = await this.validationOrchestrator.validateCurrentEmail();
    
    if (!results || results.length !== 2) {
      throw new Error(`Expected 2 validation results but got ${results?.length || 0}`);
    }
    
    const allValid = results.every(r => r.isValid);
    if (!allValid) {
      throw new Error('Not all names in greeting were validated correctly');
    }
    
    return { status: 'passed' as const };
  }

  private async testOutlookIntegration() {
    // Test that the orchestrator properly integrates with Office.js APIs
    this.validationOrchestrator = new ValidationOrchestrator();
    
    let initializeCalled = false;
    let eventHandlersAdded = false;
    
    // Mock Office.js initialization
    const originalAddHandler = global.Office.context.mailbox.item.addHandlerAsync;
    global.Office.context.mailbox.item.addHandlerAsync = (eventType, handler, callback) => {
      eventHandlersAdded = true;
      callback({ status: 'succeeded' });
    };
    
    await this.validationOrchestrator.initialize();
    initializeCalled = true;
    
    // Restore original method
    global.Office.context.mailbox.item.addHandlerAsync = originalAddHandler;
    
    if (!initializeCalled) {
      throw new Error('Orchestrator initialization failed');
    }
    
    if (!eventHandlersAdded) {
      throw new Error('Event handlers were not added during initialization');
    }
    
    return { status: 'passed' as const };
  }

  private async testDynamicRecipientValidation() {
    this.validationOrchestrator = new ValidationOrchestrator();
    await this.validationOrchestrator.initialize();
    
    let validationTriggered = false;
    
    // Mock validation method
    const originalValidate = this.validationOrchestrator.validateCurrentEmail;
    this.validationOrchestrator.validateCurrentEmail = async () => {
      validationTriggered = true;
      return [];
    };
    
    // Simulate recipient change
    this.validationOrchestrator.onRecipientsChanged();
    
    // Allow async processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (!validationTriggered) {
      throw new Error('Validation was not triggered on recipient change');
    }
    
    return { status: 'passed' as const };
  }

  private async testDynamicContentValidation() {
    this.validationOrchestrator = new ValidationOrchestrator();
    await this.validationOrchestrator.initialize();
    
    let validationTriggered = false;
    
    // Mock validation method
    const originalValidate = this.validationOrchestrator.validateCurrentEmail;
    this.validationOrchestrator.validateCurrentEmail = async () => {
      validationTriggered = true;
      return [];
    };
    
    // Simulate content change
    this.validationOrchestrator.onContentChanged();
    
    // Allow async processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (!validationTriggered) {
      throw new Error('Validation was not triggered on content change');
    }
    
    return { status: 'passed' as const };
  }
}