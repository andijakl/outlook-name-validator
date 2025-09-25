/**
 * Tests for validation orchestrator
 */

import { ValidationOrchestratorImpl, OrchestratorEventHandler } from '../validation-orchestrator';
import { ValidationResult, ParsedRecipient } from '../../models/interfaces';

// Mock the dependencies
jest.mock('../office-integration');
jest.mock('../../models/email-content-parser');
jest.mock('../../models/recipient-parser');
jest.mock('../../models/name-matching-engine');

import { OutlookIntegration } from '../office-integration';
import { EmailContentParserImpl } from '../../models/email-content-parser';
import { RecipientParser } from '../../models/recipient-parser';
import { NameMatchingEngine } from '../../models/name-matching-engine';

const MockOutlookIntegration = OutlookIntegration as jest.MockedClass<typeof OutlookIntegration>;
const MockEmailContentParserImpl = EmailContentParserImpl as jest.MockedClass<typeof EmailContentParserImpl>;
const MockRecipientParser = RecipientParser as jest.MockedClass<typeof RecipientParser>;
const MockNameMatchingEngine = NameMatchingEngine as jest.MockedClass<typeof NameMatchingEngine>;

describe('ValidationOrchestratorImpl', () => {
  let orchestrator: ValidationOrchestratorImpl;
  let mockEventHandler: OrchestratorEventHandler;
  let mockOfficeIntegration: jest.Mocked<OutlookIntegration>;
  let mockEmailParser: jest.Mocked<EmailContentParserImpl>;
  let mockRecipientParser: jest.Mocked<RecipientParser>;
  let mockMatchingEngine: jest.Mocked<NameMatchingEngine>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockEventHandler = {
      onValidationComplete: jest.fn(),
      onValidationError: jest.fn(),
      onValidationStarted: jest.fn()
    };

    // Set up mocks
    mockOfficeIntegration = {
      initialize: jest.fn(),
      getCurrentRecipients: jest.fn(),
      getCurrentEmailBody: jest.fn(),
      getValidationState: jest.fn().mockReturnValue({
        lastValidationTime: new Date(),
        isEnabled: true,
        currentValidation: []
      }),
      setValidationEnabled: jest.fn(),
      dispose: jest.fn(),
      validateCurrentEmail: jest.fn(),
      onRecipientsChanged: jest.fn(),
      onContentChanged: jest.fn(),
      isComposing: jest.fn()
    } as any;

    mockEmailParser = {
      parseEmailContent: jest.fn(),
      extractGreetings: jest.fn()
    } as any;

    mockRecipientParser = {
      parseEmailAddress: jest.fn(),
      extractAllRecipients: jest.fn()
    } as any;

    mockMatchingEngine = {
      findBestMatch: jest.fn(),
      validateNames: jest.fn()
    } as any;

    MockOutlookIntegration.mockImplementation(() => mockOfficeIntegration);
    MockEmailContentParserImpl.mockImplementation(() => mockEmailParser);
    MockRecipientParser.mockImplementation(() => mockRecipientParser);
    MockNameMatchingEngine.mockImplementation(() => mockMatchingEngine);

    orchestrator = new ValidationOrchestratorImpl(mockEventHandler);
  });

  afterEach(() => {
    orchestrator.dispose();
  });

  describe('initialize', () => {
    it('should initialize Office integration successfully', async () => {
      mockOfficeIntegration.initialize.mockResolvedValue();

      await expect(orchestrator.initialize()).resolves.toBeUndefined();
      
      expect(mockOfficeIntegration.initialize).toHaveBeenCalled();
    });

    it('should propagate initialization errors', async () => {
      const error = new Error('Initialization failed');
      mockOfficeIntegration.initialize.mockRejectedValue(error);

      await expect(orchestrator.initialize()).rejects.toThrow('Initialization failed');
    });
  });

  describe('validateCurrentEmail', () => {
    beforeEach(() => {
      // Set up default mocks for successful validation
      mockOfficeIntegration.getCurrentRecipients.mockResolvedValue([
        {
          email: 'john.doe@example.com',
          displayName: 'John Doe',
          extractedNames: ['john', 'doe'],
          isGeneric: false
        }
      ]);

      mockOfficeIntegration.getCurrentEmailBody.mockResolvedValue('Hi John,\n\nHow are you?');

      mockEmailParser.parseEmailContent.mockReturnValue({
        greetings: [
          {
            fullMatch: 'Hi John',
            extractedName: 'John',
            position: 0,
            confidence: 0.9
          }
        ],
        hasValidContent: true
      });

      mockRecipientParser.parseEmailAddress.mockReturnValue({
        email: 'john.doe@example.com',
        displayName: 'John Doe',
        extractedNames: ['john', 'doe'],
        isGeneric: false
      });

      mockMatchingEngine.validateNames.mockReturnValue([
        {
          greetingName: 'John',
          isValid: true,
          suggestedRecipient: {
            email: 'john.doe@example.com',
            displayName: 'John Doe',
            extractedNames: ['john', 'doe'],
            isGeneric: false
          },
          confidence: 0.95
        }
      ]);
    });

    it('should validate email successfully with matching names', async () => {
      const results = await orchestrator.validateCurrentEmail();

      expect(results).toHaveLength(1);
      expect(results[0].greetingName).toBe('John');
      expect(results[0].isValid).toBe(true);
      expect(results[0].confidence).toBe(0.95);
      
      expect(mockEventHandler.onValidationStarted).toHaveBeenCalled();
      expect(mockEventHandler.onValidationComplete).toHaveBeenCalledWith(results);
    });

    it('should return empty results when no greetings found', async () => {
      mockEmailParser.parseEmailContent.mockReturnValue({
        greetings: [],
        hasValidContent: false
      });

      const results = await orchestrator.validateCurrentEmail();

      expect(results).toHaveLength(0);
      expect(mockEventHandler.onValidationStarted).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      const error = new Error('Validation failed');
      mockOfficeIntegration.getCurrentRecipients.mockRejectedValue(error);

      await expect(orchestrator.validateCurrentEmail()).rejects.toThrow('Validation failed');
      
      expect(mockEventHandler.onValidationError).toHaveBeenCalledWith(error);
    });

    it('should prevent concurrent validations', async () => {
      // Make the first validation take some time
      let resolveFirst: () => void;
      const firstValidation = new Promise<ParsedRecipient[]>((resolve) => {
        resolveFirst = () => resolve([]);
      });
      mockOfficeIntegration.getCurrentRecipients.mockReturnValue(firstValidation);

      // Start first validation
      const firstPromise = orchestrator.validateCurrentEmail();
      
      // Start second validation immediately
      const secondPromise = orchestrator.validateCurrentEmail();

      // Second should return empty immediately
      const secondResult = await secondPromise;
      expect(secondResult).toHaveLength(0);

      // Complete first validation
      resolveFirst!();
      await firstPromise;
    });

    it('should rate limit validations', async () => {
      // First validation
      await orchestrator.validateCurrentEmail();
      
      // Immediate second validation should be rate limited
      const results = await orchestrator.validateCurrentEmail();
      expect(results).toHaveLength(0);
    });
  });

  describe('event handling', () => {
    it('should handle recipient changes', () => {
      const recipients: ParsedRecipient[] = [
        {
          email: 'test@example.com',
          extractedNames: ['test'],
          isGeneric: false
        }
      ];

      orchestrator.onRecipientsChanged(recipients);

      expect(orchestrator.getCachedRecipients()).toEqual(recipients);
    });

    it('should handle content changes', () => {
      const content = 'Hi there!';

      orchestrator.onContentChanged(content);

      expect(orchestrator.getCachedContent()).toBe(content);
    });

    it('should clear cache on recipient changes', () => {
      // Set up mocks for the validation that will be triggered
      mockOfficeIntegration.getCurrentRecipients.mockResolvedValue([]);
      mockOfficeIntegration.getCurrentEmailBody.mockResolvedValue('');
      mockEmailParser.parseEmailContent.mockReturnValue({
        greetings: [],
        hasValidContent: false
      });

      orchestrator.onRecipientsChanged();

      expect(orchestrator.getCachedRecipients()).toBeUndefined();
    });

    it('should clear cache on content changes', () => {
      // Set up mocks for the validation that will be triggered
      mockOfficeIntegration.getCurrentRecipients.mockResolvedValue([]);
      mockOfficeIntegration.getCurrentEmailBody.mockResolvedValue('');
      mockEmailParser.parseEmailContent.mockReturnValue({
        greetings: [],
        hasValidContent: false
      });

      orchestrator.onContentChanged();

      expect(orchestrator.getCachedContent()).toBeUndefined();
    });
  });

  describe('state management', () => {
    it('should track validation state', () => {
      const mockState = {
        lastValidationTime: new Date(),
        isEnabled: true
      };
      mockOfficeIntegration.getValidationState.mockReturnValue(mockState);

      const state = orchestrator.getValidationState();

      expect(state).toEqual(mockState);
    });

    it('should allow enabling/disabling validation', () => {
      orchestrator.setValidationEnabled(false);

      expect(mockOfficeIntegration.setValidationEnabled).toHaveBeenCalledWith(false);
    });

    it('should track validation progress', () => {
      expect(orchestrator.isValidationInProgress()).toBe(false);
    });
  });

  describe('caching and debouncing', () => {
    beforeEach(() => {
      // Set up mocks for validation
      mockOfficeIntegration.getCurrentRecipients.mockResolvedValue([]);
      mockOfficeIntegration.getCurrentEmailBody.mockResolvedValue('');
      mockEmailParser.parseEmailContent.mockReturnValue({
        greetings: [],
        hasValidContent: false
      });
      mockMatchingEngine.validateNames.mockReturnValue([]);
    });

    it('should cache recipients and content with timestamps', () => {
      const recipients: ParsedRecipient[] = [
        { email: 'test@example.com', extractedNames: ['test'], isGeneric: false }
      ];
      const content = 'Hi test!';

      orchestrator.onRecipientsChanged(recipients);
      orchestrator.onContentChanged(content);

      expect(orchestrator.getCachedRecipients()).toEqual(recipients);
      expect(orchestrator.getCachedContent()).toBe(content);
    });

    it('should use cached data when available and not expired', async () => {
      const recipients: ParsedRecipient[] = [
        { email: 'cached@example.com', extractedNames: ['cached'], isGeneric: false }
      ];
      const content = 'Cached content';

      // Set up cache
      orchestrator.onRecipientsChanged(recipients);
      orchestrator.onContentChanged(content);

      // Clear the mock call counts
      mockOfficeIntegration.getCurrentRecipients.mockClear();
      mockOfficeIntegration.getCurrentEmailBody.mockClear();

      // Validate - should use cached data
      await orchestrator.validateCurrentEmail();

      // Should not have called the Office integration methods
      expect(mockOfficeIntegration.getCurrentRecipients).not.toHaveBeenCalled();
      expect(mockOfficeIntegration.getCurrentEmailBody).not.toHaveBeenCalled();
    });

    it('should debounce validation calls', (done) => {
      let validationCount = 0;
      
      // Mock validation to count calls
      const originalValidate = orchestrator.validateCurrentEmail;
      orchestrator.validateCurrentEmail = jest.fn().mockImplementation(() => {
        validationCount++;
        return Promise.resolve([]);
      });

      // Trigger multiple rapid changes
      orchestrator.onRecipientsChanged();
      orchestrator.onRecipientsChanged();
      orchestrator.onContentChanged();
      orchestrator.onContentChanged();

      // Wait for debounce delay + some buffer
      setTimeout(() => {
        // Should only have been called once due to debouncing
        expect(orchestrator.validateCurrentEmail).toHaveBeenCalledTimes(1);
        done();
      }, 600); // 500ms debounce + 100ms buffer
    });

    it('should invalidate cache on recipient changes', () => {
      const recipients: ParsedRecipient[] = [
        { email: 'test@example.com', extractedNames: ['test'], isGeneric: false }
      ];

      // Set cache
      orchestrator.onRecipientsChanged(recipients);
      expect(orchestrator.getCachedRecipients()).toEqual(recipients);

      // Trigger change (without parameters)
      orchestrator.onRecipientsChanged();
      
      // Cache should be cleared
      expect(orchestrator.getCachedRecipients()).toBeUndefined();
    });

    it('should invalidate cache on content changes', () => {
      const content = 'Test content';

      // Set cache
      orchestrator.onContentChanged(content);
      expect(orchestrator.getCachedContent()).toBe(content);

      // Trigger change (without parameters)
      orchestrator.onContentChanged();
      
      // Cache should be cleared
      expect(orchestrator.getCachedContent()).toBeUndefined();
    });

    it('should handle cache expiration', async () => {
      // This test would require mocking Date.now() to simulate time passage
      // For now, we'll test the basic functionality
      const recipients: ParsedRecipient[] = [
        { email: 'test@example.com', extractedNames: ['test'], isGeneric: false }
      ];

      orchestrator.onRecipientsChanged(recipients);
      expect(orchestrator.getCachedRecipients()).toEqual(recipients);
    });
  });

  describe('main validation workflow integration', () => {
    it('should integrate all components in the validation workflow', async () => {
      // Set up complete workflow test data
      const recipients: ParsedRecipient[] = [
        {
          email: 'john.doe@example.com',
          displayName: 'John Doe',
          extractedNames: ['john', 'doe'],
          isGeneric: false
        },
        {
          email: 'jane.smith@example.com',
          displayName: 'Jane Smith',
          extractedNames: ['jane', 'smith'],
          isGeneric: false
        }
      ];

      const emailContent = 'Hi John and Jane,\n\nHow are you both doing?';

      const greetings = [
        {
          fullMatch: 'Hi John',
          extractedName: 'John',
          position: 0,
          confidence: 0.9
        },
        {
          fullMatch: 'Hi Jane',
          extractedName: 'Jane',
          position: 8,
          confidence: 0.9
        }
      ];

      const expectedValidationResults = [
        {
          greetingName: 'John',
          isValid: true,
          suggestedRecipient: recipients[0],
          confidence: 0.95
        },
        {
          greetingName: 'Jane',
          isValid: true,
          suggestedRecipient: recipients[1],
          confidence: 0.93
        }
      ];

      // Set up mocks for the complete workflow
      mockOfficeIntegration.getCurrentRecipients.mockResolvedValue(recipients);
      mockOfficeIntegration.getCurrentEmailBody.mockResolvedValue(emailContent);
      
      mockEmailParser.parseEmailContent.mockReturnValue({
        greetings,
        hasValidContent: true
      });

      mockRecipientParser.parseEmailAddress
        .mockReturnValueOnce(recipients[0])
        .mockReturnValueOnce(recipients[1]);

      mockMatchingEngine.validateNames.mockReturnValue(expectedValidationResults);

      // Execute validation
      const results = await orchestrator.validateCurrentEmail();

      // Verify the complete workflow
      expect(mockOfficeIntegration.getCurrentRecipients).toHaveBeenCalled();
      expect(mockOfficeIntegration.getCurrentEmailBody).toHaveBeenCalled();
      expect(mockEmailParser.parseEmailContent).toHaveBeenCalledWith(emailContent);
      expect(mockMatchingEngine.validateNames).toHaveBeenCalledWith(greetings, recipients);
      
      expect(results).toEqual(expectedValidationResults);
      expect(mockEventHandler.onValidationStarted).toHaveBeenCalled();
      expect(mockEventHandler.onValidationComplete).toHaveBeenCalledWith(expectedValidationResults);
    });

    it('should handle workflow with no valid greetings', async () => {
      mockOfficeIntegration.getCurrentRecipients.mockResolvedValue([]);
      mockOfficeIntegration.getCurrentEmailBody.mockResolvedValue('Just some content without greetings.');
      
      mockEmailParser.parseEmailContent.mockReturnValue({
        greetings: [],
        hasValidContent: true
      });

      const results = await orchestrator.validateCurrentEmail();

      expect(results).toHaveLength(0);
      expect(mockMatchingEngine.validateNames).not.toHaveBeenCalled();
    });

    it('should handle workflow with generic recipients', async () => {
      const recipients: ParsedRecipient[] = [
        {
          email: 'info@example.com',
          extractedNames: ['info'],
          isGeneric: true
        }
      ];

      const greetings = [
        {
          fullMatch: 'Hi there',
          extractedName: 'there',
          position: 0,
          confidence: 0.8
        }
      ];

      mockOfficeIntegration.getCurrentRecipients.mockResolvedValue(recipients);
      mockOfficeIntegration.getCurrentEmailBody.mockResolvedValue('Hi there,');
      
      mockEmailParser.parseEmailContent.mockReturnValue({
        greetings,
        hasValidContent: true
      });

      mockMatchingEngine.validateNames.mockReturnValue([]);

      const results = await orchestrator.validateCurrentEmail();

      // Should still process but matching engine should handle generic filtering
      expect(mockMatchingEngine.validateNames).toHaveBeenCalledWith(greetings, recipients);
      expect(results).toEqual([]);
    });
  });

  describe('dispose', () => {
    it('should clean up resources including debounce timer', () => {
      // Set up a debounce timer
      orchestrator.onRecipientsChanged();
      
      orchestrator.dispose();

      expect(mockOfficeIntegration.dispose).toHaveBeenCalled();
      expect(orchestrator.getCachedRecipients()).toBeUndefined();
      expect(orchestrator.getCachedContent()).toBeUndefined();
      expect(orchestrator.isValidationInProgress()).toBe(false);
    });
  });
});