/**
 * Unit tests for validation orchestrator error handling and recovery
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { ValidationOrchestratorImpl, OrchestratorEventHandler } from '../validation-orchestrator';
import { ValidationResult, ParsedRecipient } from '../../models/interfaces';
import {
  OfficeIntegrationError,
  ValidationError,
  ParsingError,
  PermissionError,
  DiagnosticLogger
} from '../error-handler';

// Mock dependencies
vi.mock('../office-integration');
vi.mock('../../models/email-content-parser');
vi.mock('../../models/recipient-parser');
vi.mock('../../models/name-matching-engine');

// Mock Office.js
const mockOffice = {
  context: {
    mailbox: {
      item: {
        itemType: 'message',
        itemClass: 'IPM.Note',
        to: {},
        cc: {},
        bcc: {},
        body: {}
      },
      diagnostics: {
        hostVersion: '16.0.0'
      }
    },
    platform: 'PC',
    host: 'Outlook',
    diagnostics: {
      version: '1.1'
    }
  }
};

// @ts-ignore
global.Office = mockOffice;

describe('ValidationOrchestrator Error Handling', () => {
  let orchestrator: ValidationOrchestratorImpl;
  let mockEventHandler: OrchestratorEventHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    DiagnosticLogger.clearLogs();

    mockEventHandler = {
      onValidationComplete: vi.fn(),
      onValidationError: vi.fn(),
      onValidationStarted: vi.fn()
    };

    orchestrator = new ValidationOrchestratorImpl(mockEventHandler);
  });

  afterEach(() => {
    orchestrator.dispose();
    DiagnosticLogger.clearLogs();
  });

  describe('Initialization Error Handling', () => {
    it('should handle Office context validation errors', async () => {
      // Mock Office context to be invalid
      const originalOffice = global.Office;
      // @ts-ignore
      global.Office = undefined;

      await expect(orchestrator.initialize()).rejects.toThrow();

      // Restore Office
      // @ts-ignore
      global.Office = originalOffice;
    });

    it('should enter degraded mode after consecutive initialization failures', async () => {
      // Mock Office integration to fail
      const mockOfficeIntegration = {
        initialize: vi.fn().mockRejectedValue(new Error('Initialization failed'))
      };

      // Replace the office integration
      (orchestrator as any).officeIntegration = mockOfficeIntegration;

      // Try to initialize multiple times to trigger degraded mode
      for (let i = 0; i < 6; i++) {
        try {
          await orchestrator.initialize();
        } catch (error) {
          // Expected to fail
        }
      }

      expect(orchestrator.isDegradedMode()).toBe(true);
    });

    it('should retry initialization with exponential backoff', async () => {
      let attemptCount = 0;
      const mockOfficeIntegration = {
        initialize: vi.fn().mockImplementation(() => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Temporary failure');
          }
          return Promise.resolve();
        })
      };

      (orchestrator as any).officeIntegration = mockOfficeIntegration;

      await orchestrator.initialize();

      expect(mockOfficeIntegration.initialize).toHaveBeenCalledTimes(3);
      expect(orchestrator.isDegradedMode()).toBe(false);
    });
  });

  describe('Validation Error Handling', () => {
    beforeEach(async () => {
      // Mock successful initialization
      const mockOfficeIntegration = {
        initialize: vi.fn().mockResolvedValue(undefined),
        getCurrentRecipients: vi.fn().mockResolvedValue([]),
        getCurrentEmailBody: vi.fn().mockResolvedValue(''),
        getValidationState: vi.fn().mockReturnValue({
          lastValidationTime: new Date(),
          isEnabled: true
        })
      };

      (orchestrator as any).officeIntegration = mockOfficeIntegration;
      await orchestrator.initialize();
    });

    it('should handle email data retrieval errors', async () => {
      // Mock data retrieval to fail
      const mockOfficeIntegration = (orchestrator as any).officeIntegration;
      mockOfficeIntegration.getCurrentRecipients.mockRejectedValue(
        new OfficeIntegrationError('Failed to get recipients', 'ITEM_NOT_FOUND')
      );

      await expect(orchestrator.validateCurrentEmail()).rejects.toThrow(ValidationError);
      expect(mockEventHandler.onValidationError).toHaveBeenCalled();
    });

    it('should handle content parsing errors with fallback', async () => {
      // Mock email parser to fail
      const mockEmailParser = {
        parseEmailContent: vi.fn().mockImplementation(() => {
          throw new ParsingError('Parsing failed', 'greeting_extraction');
        })
      };

      (orchestrator as any).emailParser = mockEmailParser;

      const result = await orchestrator.validateCurrentEmail();
      
      // Should return empty results due to parsing failure fallback
      expect(result).toEqual([]);
    });

    it('should handle recipient parsing errors with fallback', async () => {
      // Mock successful content parsing but failed recipient parsing
      const mockEmailParser = {
        parseEmailContent: vi.fn().mockReturnValue({
          greetings: [{ extractedName: 'John', fullMatch: 'Hi John', position: 0, confidence: 0.9 }],
          hasValidContent: true
        })
      };

      const mockRecipientParser = {
        parseEmailAddress: vi.fn().mockImplementation(() => {
          throw new ParsingError('Recipient parsing failed', 'email_parsing');
        })
      };

      (orchestrator as any).emailParser = mockEmailParser;
      (orchestrator as any).recipientParser = mockRecipientParser;

      // Mock office integration to return recipients
      const mockOfficeIntegration = (orchestrator as any).officeIntegration;
      mockOfficeIntegration.getCurrentRecipients.mockResolvedValue([
        { email: 'john@example.com', displayName: 'John Doe', extractedNames: [], isGeneric: false }
      ]);

      const result = await orchestrator.validateCurrentEmail();
      
      // Should use fallback parsing
      expect(result).toBeDefined();
    });

    it('should handle name matching errors with fallback', async () => {
      // Mock successful parsing but failed matching
      const mockEmailParser = {
        parseEmailContent: vi.fn().mockReturnValue({
          greetings: [{ extractedName: 'John', fullMatch: 'Hi John', position: 0, confidence: 0.9 }],
          hasValidContent: true
        })
      };

      const mockMatchingEngine = {
        validateNames: vi.fn().mockImplementation(() => {
          throw new ValidationError('Matching failed', 'name_matching');
        })
      };

      (orchestrator as any).emailParser = mockEmailParser;
      (orchestrator as any).matchingEngine = mockMatchingEngine;

      // Mock office integration and recipient parser
      const mockOfficeIntegration = (orchestrator as any).officeIntegration;
      mockOfficeIntegration.getCurrentRecipients.mockResolvedValue([
        { email: 'john@example.com', displayName: 'John Doe', extractedNames: ['john'], isGeneric: false }
      ]);

      const result = await orchestrator.validateCurrentEmail();
      
      // Should use fallback matching
      expect(result).toBeDefined();
      expect(result[0].confidence).toBe(0.5); // Fallback confidence
    });

    it('should enter degraded mode after consecutive validation failures', async () => {
      // Mock validation to always fail
      const mockOfficeIntegration = (orchestrator as any).officeIntegration;
      mockOfficeIntegration.getCurrentRecipients.mockRejectedValue(
        new Error('Persistent failure')
      );

      // Fail validation multiple times
      for (let i = 0; i < 6; i++) {
        try {
          await orchestrator.validateCurrentEmail();
        } catch (error) {
          // Expected to fail
        }
      }

      expect(orchestrator.isDegradedMode()).toBe(true);
      const stats = orchestrator.getErrorStatistics();
      expect(stats.consecutiveErrors).toBeGreaterThanOrEqual(5);
    });

    it('should reset error count on successful validation', async () => {
      // First, cause some failures
      const mockOfficeIntegration = (orchestrator as any).officeIntegration;
      mockOfficeIntegration.getCurrentRecipients.mockRejectedValueOnce(new Error('Failure 1'));
      mockOfficeIntegration.getCurrentRecipients.mockRejectedValueOnce(new Error('Failure 2'));

      try {
        await orchestrator.validateCurrentEmail();
      } catch (error) {
        // Expected
      }

      try {
        await orchestrator.validateCurrentEmail();
      } catch (error) {
        // Expected
      }

      // Now make it succeed
      mockOfficeIntegration.getCurrentRecipients.mockResolvedValue([]);
      mockOfficeIntegration.getCurrentEmailBody.mockResolvedValue('');

      const mockEmailParser = {
        parseEmailContent: vi.fn().mockReturnValue({
          greetings: [],
          hasValidContent: false
        })
      };

      (orchestrator as any).emailParser = mockEmailParser;

      await orchestrator.validateCurrentEmail();

      const stats = orchestrator.getErrorStatistics();
      expect(stats.consecutiveErrors).toBe(0);
    });
  });

  describe('Degraded Mode Behavior', () => {
    beforeEach(async () => {
      // Force orchestrator into degraded mode
      const mockOfficeIntegration = {
        initialize: vi.fn().mockResolvedValue(undefined),
        getCurrentRecipients: vi.fn().mockResolvedValue([]),
        getCurrentEmailBody: vi.fn().mockResolvedValue(''),
        getValidationState: vi.fn().mockReturnValue({
          lastValidationTime: new Date(),
          isEnabled: true
        })
      };

      (orchestrator as any).officeIntegration = mockOfficeIntegration;
      (orchestrator as any).degradedMode = true;
      (orchestrator as any).availableFeatures = ['basic_functionality'];
    });

    it('should handle errors gracefully in degraded mode', async () => {
      // Mock data retrieval to fail
      const mockOfficeIntegration = (orchestrator as any).officeIntegration;
      mockOfficeIntegration.getCurrentRecipients.mockRejectedValue(
        new Error('Data retrieval failed')
      );

      // Should not throw in degraded mode, should use empty data
      const result = await orchestrator.validateCurrentEmail();
      expect(result).toEqual([]);
    });

    it('should report degraded mode status', () => {
      expect(orchestrator.isDegradedMode()).toBe(true);
      expect(orchestrator.getAvailableFeatures()).toContain('basic_functionality');
    });
  });

  describe('Error Recovery', () => {
    it('should reset error state manually', () => {
      // Set some error state
      (orchestrator as any).consecutiveErrors = 5;
      (orchestrator as any).degradedMode = true;

      orchestrator.resetErrorState();

      expect(orchestrator.isDegradedMode()).toBe(false);
      const stats = orchestrator.getErrorStatistics();
      expect(stats.consecutiveErrors).toBe(0);
    });

    it('should log diagnostic information on errors', async () => {
      const mockOfficeIntegration = {
        initialize: vi.fn().mockResolvedValue(undefined),
        getCurrentRecipients: vi.fn().mockRejectedValue(new Error('Test error')),
        getCurrentEmailBody: vi.fn().mockResolvedValue(''),
        getValidationState: vi.fn().mockReturnValue({
          lastValidationTime: new Date(),
          isEnabled: true
        })
      };

      (orchestrator as any).officeIntegration = mockOfficeIntegration;
      await orchestrator.initialize();

      try {
        await orchestrator.validateCurrentEmail();
      } catch (error) {
        // Expected
      }

      const errorLogs = DiagnosticLogger.getLogs('error');
      expect(errorLogs.length).toBeGreaterThan(0);
    });
  });

  describe('Event Handler Integration', () => {
    it('should notify event handler of validation errors', async () => {
      const mockOfficeIntegration = {
        initialize: vi.fn().mockResolvedValue(undefined),
        getCurrentRecipients: vi.fn().mockRejectedValue(new Error('Test error')),
        getCurrentEmailBody: vi.fn().mockResolvedValue(''),
        getValidationState: vi.fn().mockReturnValue({
          lastValidationTime: new Date(),
          isEnabled: true
        })
      };

      (orchestrator as any).officeIntegration = mockOfficeIntegration;
      await orchestrator.initialize();

      try {
        await orchestrator.validateCurrentEmail();
      } catch (error) {
        // Expected
      }

      expect(mockEventHandler.onValidationError).toHaveBeenCalled();
      const errorArg = (mockEventHandler.onValidationError as Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(ValidationError);
    });

    it('should notify event handler of validation start', async () => {
      const mockOfficeIntegration = {
        initialize: vi.fn().mockResolvedValue(undefined),
        getCurrentRecipients: vi.fn().mockResolvedValue([]),
        getCurrentEmailBody: vi.fn().mockResolvedValue(''),
        getValidationState: vi.fn().mockReturnValue({
          lastValidationTime: new Date(),
          isEnabled: true
        })
      };

      const mockEmailParser = {
        parseEmailContent: vi.fn().mockReturnValue({
          greetings: [],
          hasValidContent: false
        })
      };

      (orchestrator as any).officeIntegration = mockOfficeIntegration;
      (orchestrator as any).emailParser = mockEmailParser;
      await orchestrator.initialize();

      await orchestrator.validateCurrentEmail();

      expect(mockEventHandler.onValidationStarted).toHaveBeenCalled();
    });
  });

  describe('Concurrent Validation Handling', () => {
    it('should prevent concurrent validations', async () => {
      const mockOfficeIntegration = {
        initialize: vi.fn().mockResolvedValue(undefined),
        getCurrentRecipients: vi.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve([]), 100))
        ),
        getCurrentEmailBody: vi.fn().mockResolvedValue(''),
        getValidationState: vi.fn().mockReturnValue({
          lastValidationTime: new Date(),
          isEnabled: true,
          currentValidation: []
        })
      };

      (orchestrator as any).officeIntegration = mockOfficeIntegration;
      await orchestrator.initialize();

      // Start two validations concurrently
      const validation1 = orchestrator.validateCurrentEmail();
      const validation2 = orchestrator.validateCurrentEmail();

      const [result1, result2] = await Promise.all([validation1, validation2]);

      // Second validation should return cached results
      expect(result1).toEqual(result2);
    });
  });
});