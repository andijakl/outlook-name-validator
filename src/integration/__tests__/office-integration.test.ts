/**
 * Integration tests for Office.js integration layer
 */

import { OutlookIntegration, ValidationEventHandler } from '../office-integration';
import { ValidationResult, ParsedRecipient } from '../../models/interfaces';

// Mock Office.js
const mockOffice = {
  context: {
    mailbox: {
      item: {
        itemType: 'Message' as any,
        itemClass: 'IPM.Note',
        to: {
          addHandlerAsync: jest.fn(),
          removeHandlerAsync: jest.fn(),
          getAsync: jest.fn()
        },
        cc: {
          addHandlerAsync: jest.fn(),
          removeHandlerAsync: jest.fn(),
          getAsync: jest.fn()
        },
        bcc: {
          addHandlerAsync: jest.fn(),
          removeHandlerAsync: jest.fn(),
          getAsync: jest.fn()
        },
        body: {
          addHandlerAsync: jest.fn(),
          removeHandlerAsync: jest.fn(),
          getAsync: jest.fn()
        }
      }
    }
  },
  EventType: {
    RecipientsChanged: 'RecipientsChanged',
    AppointmentTimeChanged: 'AppointmentTimeChanged'
  },
  AsyncResultStatus: {
    Succeeded: 'Succeeded',
    Failed: 'Failed'
  },
  CoercionType: {
    Text: 'Text'
  },
  MailboxEnums: {
    ItemType: {
      Message: 'Message'
    }
  }
};

// Set up global Office mock
(global as any).Office = mockOffice;

describe('OutlookIntegration', () => {
  let integration: OutlookIntegration;
  let mockEventHandler: ValidationEventHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockEventHandler = {
      onValidationComplete: jest.fn(),
      onValidationError: jest.fn(),
      onRecipientsChanged: jest.fn(),
      onContentChanged: jest.fn()
    };

    integration = new OutlookIntegration(mockEventHandler);
  });

  afterEach(() => {
    integration.dispose();
  });

  describe('initialize', () => {
    it('should initialize successfully when Office context is available', async () => {
      // Mock successful event handler setup
      mockOffice.context.mailbox.item.to.addHandlerAsync.mockImplementation((eventType, handler, callback) => {
        callback({ status: mockOffice.AsyncResultStatus.Succeeded });
      });
      mockOffice.context.mailbox.item.cc.addHandlerAsync.mockImplementation((eventType, handler, callback) => {
        callback({ status: mockOffice.AsyncResultStatus.Succeeded });
      });
      mockOffice.context.mailbox.item.bcc.addHandlerAsync.mockImplementation((eventType, handler, callback) => {
        callback({ status: mockOffice.AsyncResultStatus.Succeeded });
      });
      mockOffice.context.mailbox.item.body.addHandlerAsync.mockImplementation((eventType, handler, callback) => {
        callback({ status: mockOffice.AsyncResultStatus.Succeeded });
      });

      await expect(integration.initialize()).resolves.toBeUndefined();
      
      expect(mockOffice.context.mailbox.item.to.addHandlerAsync).toHaveBeenCalled();
      expect(mockOffice.context.mailbox.item.cc.addHandlerAsync).toHaveBeenCalled();
      expect(mockOffice.context.mailbox.item.bcc.addHandlerAsync).toHaveBeenCalled();
    });

    it('should throw error when Office context is not available', async () => {
      const originalContext = mockOffice.context;
      (mockOffice as any).context = null;

      await expect(integration.initialize()).rejects.toThrow('Office.js context not available');
      
      (mockOffice as any).context = originalContext;
    });

    it('should throw error when not in compose mode', async () => {
      mockOffice.context.mailbox.item.itemClass = 'IPM.Note.Read';

      await expect(integration.initialize()).rejects.toThrow('Add-in must be used in email compose mode');
      
      mockOffice.context.mailbox.item.itemClass = 'IPM.Note';
    });
  });

  describe('isComposing', () => {
    it('should return true when in compose mode', () => {
      expect(integration.isComposing()).toBe(true);
    });

    it('should return false when not in compose mode', () => {
      mockOffice.context.mailbox.item.itemClass = 'IPM.Note.Read';
      
      expect(integration.isComposing()).toBe(false);
      
      mockOffice.context.mailbox.item.itemClass = 'IPM.Note';
    });
  });

  describe('getCurrentRecipients', () => {
    it('should get recipients from all fields', async () => {
      const mockToRecipients = [
        { emailAddress: 'john@example.com', displayName: 'John Doe' }
      ];
      const mockCcRecipients = [
        { emailAddress: 'jane@example.com', displayName: 'Jane Smith' }
      ];

      mockOffice.context.mailbox.item.to.getAsync.mockImplementation((callback) => {
        callback({ 
          status: mockOffice.AsyncResultStatus.Succeeded, 
          value: mockToRecipients 
        });
      });
      
      mockOffice.context.mailbox.item.cc.getAsync.mockImplementation((callback) => {
        callback({ 
          status: mockOffice.AsyncResultStatus.Succeeded, 
          value: mockCcRecipients 
        });
      });
      
      mockOffice.context.mailbox.item.bcc.getAsync.mockImplementation((callback) => {
        callback({ 
          status: mockOffice.AsyncResultStatus.Succeeded, 
          value: [] 
        });
      });

      const recipients = await integration.getCurrentRecipients();
      
      expect(recipients).toHaveLength(2);
      expect(recipients[0].email).toBe('john@example.com');
      expect(recipients[1].email).toBe('jane@example.com');
    });

    it('should handle empty recipient lists', async () => {
      mockOffice.context.mailbox.item.to.getAsync.mockImplementation((callback) => {
        callback({ 
          status: mockOffice.AsyncResultStatus.Succeeded, 
          value: [] 
        });
      });
      
      mockOffice.context.mailbox.item.cc.getAsync.mockImplementation((callback) => {
        callback({ 
          status: mockOffice.AsyncResultStatus.Succeeded, 
          value: [] 
        });
      });
      
      mockOffice.context.mailbox.item.bcc.getAsync.mockImplementation((callback) => {
        callback({ 
          status: mockOffice.AsyncResultStatus.Succeeded, 
          value: [] 
        });
      });

      const recipients = await integration.getCurrentRecipients();
      
      expect(recipients).toHaveLength(0);
    });
  });

  describe('getCurrentEmailBody', () => {
    it('should get email body content', async () => {
      const mockBody = 'Hi John,\n\nHow are you?\n\nBest regards,\nAlice';
      
      mockOffice.context.mailbox.item.body.getAsync.mockImplementation((coercionType, callback) => {
        callback({ 
          status: mockOffice.AsyncResultStatus.Succeeded, 
          value: mockBody 
        });
      });

      const body = await integration.getCurrentEmailBody();
      
      expect(body).toBe(mockBody);
      expect(mockOffice.context.mailbox.item.body.getAsync).toHaveBeenCalledWith(
        mockOffice.CoercionType.Text,
        expect.any(Function)
      );
    });

    it('should handle empty email body', async () => {
      mockOffice.context.mailbox.item.body.getAsync.mockImplementation((coercionType, callback) => {
        callback({ 
          status: mockOffice.AsyncResultStatus.Succeeded, 
          value: '' 
        });
      });

      const body = await integration.getCurrentEmailBody();
      
      expect(body).toBe('');
    });

    it('should handle API errors', async () => {
      mockOffice.context.mailbox.item.body.getAsync.mockImplementation((coercionType, callback) => {
        callback({ 
          status: mockOffice.AsyncResultStatus.Failed,
          error: { message: 'Access denied' }
        });
      });

      await expect(integration.getCurrentEmailBody()).rejects.toThrow('Failed to get email body: Access denied');
    });
  });

  describe('event handling', () => {
    beforeEach(async () => {
      // Set up successful initialization
      mockOffice.context.mailbox.item.to.addHandlerAsync.mockImplementation((eventType, handler, callback) => {
        callback({ status: mockOffice.AsyncResultStatus.Succeeded });
      });
      mockOffice.context.mailbox.item.cc.addHandlerAsync.mockImplementation((eventType, handler, callback) => {
        callback({ status: mockOffice.AsyncResultStatus.Succeeded });
      });
      mockOffice.context.mailbox.item.bcc.addHandlerAsync.mockImplementation((eventType, handler, callback) => {
        callback({ status: mockOffice.AsyncResultStatus.Succeeded });
      });
      mockOffice.context.mailbox.item.body.addHandlerAsync.mockImplementation((eventType, handler, callback) => {
        callback({ status: mockOffice.AsyncResultStatus.Succeeded });
      });

      await integration.initialize();
    });

    it('should handle recipient changes with debouncing', (done) => {
      // Mock getCurrentRecipients for the event handler
      mockOffice.context.mailbox.item.to.getAsync.mockImplementation((callback) => {
        callback({ 
          status: mockOffice.AsyncResultStatus.Succeeded, 
          value: [{ emailAddress: 'test@example.com', displayName: 'Test User' }] 
        });
      });
      mockOffice.context.mailbox.item.cc.getAsync.mockImplementation((callback) => {
        callback({ status: mockOffice.AsyncResultStatus.Succeeded, value: [] });
      });
      mockOffice.context.mailbox.item.bcc.getAsync.mockImplementation((callback) => {
        callback({ status: mockOffice.AsyncResultStatus.Succeeded, value: [] });
      });

      integration.onRecipientsChanged();
      
      // Should be debounced, so event handler not called immediately
      expect(mockEventHandler.onRecipientsChanged).not.toHaveBeenCalled();
      
      // Wait for debounce delay
      setTimeout(() => {
        expect(mockEventHandler.onRecipientsChanged).toHaveBeenCalled();
        done();
      }, 600);
    });

    it('should handle content changes with debouncing', (done) => {
      // Mock getCurrentEmailBody for the event handler
      mockOffice.context.mailbox.item.body.getAsync.mockImplementation((coercionType, callback) => {
        callback({ 
          status: mockOffice.AsyncResultStatus.Succeeded, 
          value: 'Hi there!' 
        });
      });

      integration.onContentChanged();
      
      // Should be debounced, so event handler not called immediately
      expect(mockEventHandler.onContentChanged).not.toHaveBeenCalled();
      
      // Wait for debounce delay
      setTimeout(() => {
        expect(mockEventHandler.onContentChanged).toHaveBeenCalled();
        done();
      }, 600);
    });
  });

  describe('validation state management', () => {
    it('should track validation state', () => {
      const state = integration.getValidationState();
      
      expect(state.isEnabled).toBe(true);
      expect(state.lastValidationTime).toBeInstanceOf(Date);
    });

    it('should allow enabling/disabling validation', () => {
      integration.setValidationEnabled(false);
      
      expect(integration.getValidationState().isEnabled).toBe(false);
      
      integration.setValidationEnabled(true);
      
      expect(integration.getValidationState().isEnabled).toBe(true);
    });
  });

  describe('dispose', () => {
    it('should clean up event handlers and resources', () => {
      integration.dispose();
      
      // Should attempt to remove event handlers
      expect(mockOffice.context.mailbox.item.to.removeHandlerAsync).toHaveBeenCalled();
      expect(mockOffice.context.mailbox.item.cc.removeHandlerAsync).toHaveBeenCalled();
      expect(mockOffice.context.mailbox.item.bcc.removeHandlerAsync).toHaveBeenCalled();
    });
  });
});