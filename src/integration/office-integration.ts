/**
 * Office.js integration layer for Outlook Name Validator
 * Handles email composition events, recipient changes, and content monitoring
 */

import { ValidationResult, ValidationState, ParsedRecipient, GreetingMatch } from '../models/interfaces';

/**
 * Interface for Office.js integration functionality
 */
export interface OfficeIntegration {
  initialize(): Promise<void>;
  validateCurrentEmail(): Promise<ValidationResult[]>;
  handleRecipientsChanged(): void;
  handleContentChanged(): void;
  getCurrentRecipients(): Promise<ParsedRecipient[]>;
  getCurrentEmailBody(): Promise<string>;
  isComposing(): boolean;
}

/**
 * Event handler interface for validation events
 */
export interface ValidationEventHandler {
  onValidationComplete(results: ValidationResult[]): void;
  onValidationError(error: Error): void;
  onRecipientsChanged(recipients: ParsedRecipient[]): void;
  onContentChanged(content: string): void;
}

/**
 * Office.js integration implementation
 */
export class OutlookIntegration implements OfficeIntegration {
  private isInitialized = false;
  private validationState: ValidationState;
  private eventHandler?: ValidationEventHandler;
  private recipientChangeHandler?: () => void;
  private contentChangeHandler?: () => void;
  private debounceTimer?: number;
  private readonly debounceDelay = 500; // 500ms debounce

  constructor(eventHandler?: ValidationEventHandler) {
    this.eventHandler = eventHandler;
    this.validationState = {
      lastValidationTime: new Date(),
      isEnabled: true
    };
  }

  /**
   * Initialize the Office.js integration
   */
  async initialize(): Promise<void> {
    try {
      // Ensure Office.js is ready
      if (!Office.context || !Office.context.mailbox) {
        throw new Error('Office.js context not available');
      }

      // Verify we're in compose mode
      if (!this.isComposing()) {
        throw new Error('Add-in must be used in email compose mode');
      }

      // Set up event handlers
      await this.setupEventHandlers();
      
      this.isInitialized = true;
      console.log('Office.js integration initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Office.js integration:', error);
      throw error;
    }
  }

  /**
   * Set up Office.js event handlers
   */
  private async setupEventHandlers(): Promise<void> {
    try {
      // Set up recipient change handler
      this.recipientChangeHandler = () => this.onRecipientsChangedInternal();
      
      // Set up content change handler  
      this.contentChangeHandler = () => this.onContentChangedInternal();

      // Add event listeners for recipient changes
      if (Office.context.mailbox.item?.to) {
        Office.context.mailbox.item.to.addHandlerAsync(
          Office.EventType.RecipientsChanged,
          this.recipientChangeHandler,
          (result) => {
            if (result.status === Office.AsyncResultStatus.Failed) {
              console.error('Failed to add TO recipients change handler:', result.error);
            }
          }
        );
      }

      if (Office.context.mailbox.item?.cc) {
        Office.context.mailbox.item.cc.addHandlerAsync(
          Office.EventType.RecipientsChanged,
          this.recipientChangeHandler,
          (result) => {
            if (result.status === Office.AsyncResultStatus.Failed) {
              console.error('Failed to add CC recipients change handler:', result.error);
            }
          }
        );
      }

      if (Office.context.mailbox.item?.bcc) {
        Office.context.mailbox.item.bcc.addHandlerAsync(
          Office.EventType.RecipientsChanged,
          this.recipientChangeHandler,
          (result) => {
            if (result.status === Office.AsyncResultStatus.Failed) {
              console.error('Failed to add BCC recipients change handler:', result.error);
            }
          }
        );
      }

      // Add event listener for body changes
      if (Office.context.mailbox.item?.body) {
        Office.context.mailbox.item.body.addHandlerAsync(
          Office.EventType.AppointmentTimeChanged, // Using available event type
          this.contentChangeHandler,
          (result) => {
            if (result.status === Office.AsyncResultStatus.Failed) {
              console.error('Failed to add body change handler:', result.error);
            }
          }
        );
      }

    } catch (error) {
      console.error('Error setting up event handlers:', error);
      throw error;
    }
  }

  /**
   * Handle recipient changes with debouncing (private event handler)
   */
  private onRecipientsChangedInternal(): void {
    this.clearDebounceTimer();
    this.debounceTimer = window.setTimeout(() => {
      this.handleRecipientsChanged();
    }, this.debounceDelay);
  }

  /**
   * Handle content changes with debouncing (private event handler)
   */
  private onContentChangedInternal(): void {
    this.clearDebounceTimer();
    this.debounceTimer = window.setTimeout(() => {
      this.handleContentChanged();
    }, this.debounceDelay);
  }

  /**
   * Clear debounce timer
   */
  private clearDebounceTimer(): void {
    if (this.debounceTimer) {
      window.clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
  }

  /**
   * Validate current email content and recipients
   */
  async validateCurrentEmail(): Promise<ValidationResult[]> {
    try {
      if (!this.isInitialized) {
        throw new Error('Office integration not initialized');
      }

      if (!this.isComposing()) {
        throw new Error('Not in compose mode');
      }

      // Get current recipients and email body
      const [recipients, emailBody] = await Promise.all([
        this.getCurrentRecipients(),
        this.getCurrentEmailBody()
      ]);

      // TODO: Implement actual validation logic using existing parsers and matching engine
      // This will be implemented in future tasks
      const validationResults: ValidationResult[] = [];

      this.validationState.currentValidation = validationResults;
      this.validationState.lastValidationTime = new Date();

      // Notify event handler
      if (this.eventHandler) {
        this.eventHandler.onValidationComplete(validationResults);
      }

      return validationResults;

    } catch (error) {
      console.error('Validation failed:', error);
      if (this.eventHandler) {
        this.eventHandler.onValidationError(error as Error);
      }
      throw error;
    }
  }

  /**
   * Handle recipient changes
   */
  handleRecipientsChanged(): void {
    console.log('Recipients changed, triggering validation');
    
    this.getCurrentRecipients()
      .then(recipients => {
        if (this.eventHandler) {
          this.eventHandler.onRecipientsChanged(recipients);
        }
        // Trigger validation
        return this.validateCurrentEmail();
      })
      .catch(error => {
        console.error('Error handling recipient change:', error);
        if (this.eventHandler) {
          this.eventHandler.onValidationError(error);
        }
      });
  }

  /**
   * Handle content changes
   */
  handleContentChanged(): void {
    console.log('Email content changed, triggering validation');
    
    this.getCurrentEmailBody()
      .then(content => {
        if (this.eventHandler) {
          this.eventHandler.onContentChanged(content);
        }
        // Trigger validation
        return this.validateCurrentEmail();
      })
      .catch(error => {
        console.error('Error handling content change:', error);
        if (this.eventHandler) {
          this.eventHandler.onValidationError(error);
        }
      });
  }

  /**
   * Get current recipients from all fields (To, CC, BCC)
   */
  async getCurrentRecipients(): Promise<ParsedRecipient[]> {
    return new Promise((resolve, reject) => {
      try {
        const recipients: ParsedRecipient[] = [];
        let pendingRequests = 0;
        let completedRequests = 0;

        const checkComplete = () => {
          completedRequests++;
          if (completedRequests === pendingRequests) {
            resolve(recipients);
          }
        };

        const handleRecipientsResult = (result: Office.AsyncResult<Office.EmailAddressDetails[]>) => {
          if (result.status === Office.AsyncResultStatus.Succeeded && result.value) {
            result.value.forEach(recipient => {
              recipients.push(this.convertToParsedRecipient(recipient));
            });
          }
          checkComplete();
        };

        // Get TO recipients
        if (Office.context.mailbox.item?.to) {
          pendingRequests++;
          Office.context.mailbox.item.to.getAsync(handleRecipientsResult);
        }

        // Get CC recipients
        if (Office.context.mailbox.item?.cc) {
          pendingRequests++;
          Office.context.mailbox.item.cc.getAsync(handleRecipientsResult);
        }

        // Get BCC recipients
        if (Office.context.mailbox.item?.bcc) {
          pendingRequests++;
          Office.context.mailbox.item.bcc.getAsync(handleRecipientsResult);
        }

        // If no recipients to fetch, resolve immediately
        if (pendingRequests === 0) {
          resolve(recipients);
        }

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Convert Office.EmailAddressDetails to ParsedRecipient
   */
  private convertToParsedRecipient(emailDetails: Office.EmailAddressDetails): ParsedRecipient {
    // TODO: This will use the RecipientParser from previous tasks
    // For now, return a basic structure
    return {
      email: emailDetails.emailAddress,
      displayName: emailDetails.displayName,
      extractedNames: [], // Will be populated by RecipientParser
      isGeneric: false // Will be determined by RecipientParser
    };
  }

  /**
   * Get current email body content
   */
  async getCurrentEmailBody(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        if (!Office.context.mailbox.item?.body) {
          resolve('');
          return;
        }

        Office.context.mailbox.item.body.getAsync(
          Office.CoercionType.Text,
          (result) => {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
              resolve(result.value || '');
            } else {
              reject(new Error(`Failed to get email body: ${result.error?.message}`));
            }
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Check if we're in compose mode
   */
  isComposing(): boolean {
    // Check if we have a mailbox item (indicates compose or read mode)
    if (!Office.context?.mailbox?.item) {
      return false;
    }

    // Check if item type is Message
    if (Office.context.mailbox.item.itemType !== Office.MailboxEnums.ItemType.Message) {
      return false;
    }

    // In compose mode, we should have access to recipients (to, cc, or bcc)
    // This is more reliable than checking itemClass which may vary across platforms
    const hasRecipientAccess = !!(
      Office.context.mailbox.item.to ||
      Office.context.mailbox.item.cc ||
      Office.context.mailbox.item.bcc
    );

    // Also check if we have body access for composing
    const hasBodyAccess = !!Office.context.mailbox.item.body;

    return hasRecipientAccess && hasBodyAccess;
  }

  /**
   * Get current validation state
   */
  getValidationState(): ValidationState {
    return { ...this.validationState };
  }

  /**
   * Enable or disable validation
   */
  setValidationEnabled(enabled: boolean): void {
    this.validationState.isEnabled = enabled;
  }

  /**
   * Clean up event handlers and resources
   */
  dispose(): void {
    this.clearDebounceTimer();
    
    // Remove event handlers
    if (this.recipientChangeHandler && Office.context.mailbox.item) {
      try {
        if (Office.context.mailbox.item.to) {
          Office.context.mailbox.item.to.removeHandlerAsync(
            Office.EventType.RecipientsChanged,
            this.recipientChangeHandler
          );
        }
        if (Office.context.mailbox.item.cc) {
          Office.context.mailbox.item.cc.removeHandlerAsync(
            Office.EventType.RecipientsChanged,
            this.recipientChangeHandler
          );
        }
        if (Office.context.mailbox.item.bcc) {
          Office.context.mailbox.item.bcc.removeHandlerAsync(
            Office.EventType.RecipientsChanged,
            this.recipientChangeHandler
          );
        }
      } catch (error) {
        console.error('Error removing event handlers:', error);
      }
    }

    this.isInitialized = false;
  }
}