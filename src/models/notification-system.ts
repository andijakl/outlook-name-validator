/**
 * NotificationSystem class for displaying warnings and status in the Outlook Name Validator
 * Implements non-intrusive warning display with suggested corrections and dismissible UI
 */

import { ValidationResult, ValidationStatus } from './interfaces';
import { BaseValidationError, DiagnosticLogger, OfficeErrorHandler } from '../integration/error-handler';

export interface NotificationSystemConfig {
  /** Duration to auto-dismiss warnings (0 = no auto-dismiss) */
  autoHideDuration?: number;
  /** Maximum number of warnings to display simultaneously */
  maxWarnings?: number;
  /** Whether to show success notifications */
  showSuccessNotifications?: boolean;
  /** Whether to enable sound notifications */
  enableSounds?: boolean;
}

export interface NotificationCallbacks {
  /** Called when a warning is dismissed */
  onWarningDismissed?: (warningId: string) => void;
  /** Called when a correction is applied */
  onCorrectionApplied?: (originalName: string, correctedName: string) => void;
  /** Called when settings are requested */
  onSettingsRequested?: () => void;
  /** Called when retry is requested for an error */
  onRetryRequested?: (errorId: string, error: Error) => void;
}

/**
 * Main notification system class
 */
export class NotificationSystem {
  private config: Required<NotificationSystemConfig>;
  private callbacks: NotificationCallbacks;
  private activeWarnings: Map<string, HTMLElement> = new Map();
  private warningCounter = 0;

  constructor(
    config: NotificationSystemConfig = {},
    callbacks: NotificationCallbacks = {}
  ) {
    this.config = {
      autoHideDuration: config.autoHideDuration ?? 0,
      maxWarnings: config.maxWarnings ?? 5,
      showSuccessNotifications: config.showSuccessNotifications ?? true,
      enableSounds: config.enableSounds ?? false
    };
    this.callbacks = callbacks;
    
    this.initializeNotificationContainer();
  }

  /**
   * Initialize the notification container in the DOM
   */
  private initializeNotificationContainer(): void {
    let container = document.getElementById('warnings-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'warnings-container';
      container.className = 'warnings-container';
      container.style.display = 'none';
      
      // Insert after validation status or at the beginning of app body
      const appBody = document.getElementById('app-body');
      const statusElement = document.querySelector('.validation-status');
      if (appBody && statusElement) {
        statusElement.insertAdjacentElement('afterend', container);
      } else if (appBody) {
        appBody.insertBefore(container, appBody.firstChild);
      }
    }
  }

  /**
   * Show a warning notification for validation results
   */
  public showWarning(validation: ValidationResult): string {
    const warningId = `warning-${++this.warningCounter}`;
    
    // Check if we've reached the maximum number of warnings
    if (this.activeWarnings.size >= this.config.maxWarnings) {
      this.dismissOldestWarning();
    }

    const warningElement = this.createWarningElement(warningId, validation);
    this.activeWarnings.set(warningId, warningElement);

    const container = document.getElementById('warnings-container');
    if (container) {
      container.appendChild(warningElement);
      container.style.display = 'block';
      
      // Auto-hide if configured
      if (this.config.autoHideDuration > 0) {
        setTimeout(() => {
          this.dismissWarning(warningId);
        }, this.config.autoHideDuration);
      }
    }

    // Play notification sound if enabled
    if (this.config.enableSounds) {
      this.playNotificationSound('warning');
    }

    return warningId;
  }

  /**
   * Show an error notification with recovery suggestions
   */
  public showError(error: Error): string {
    const errorId = `error-${++this.warningCounter}`;
    
    DiagnosticLogger.error('Displaying error notification', error);
    
    const { message, suggestions } = OfficeErrorHandler.getUserFriendlyMessage(error);
    
    const errorElement = this.createErrorElement(errorId, error, message, suggestions);
    this.activeWarnings.set(errorId, errorElement);

    const container = document.getElementById('warnings-container');
    if (container) {
      container.appendChild(errorElement);
      container.style.display = 'block';
    }

    // Play error sound if enabled
    if (this.config.enableSounds) {
      this.playNotificationSound('error');
    }

    return errorId;
  }

  /**
   * Show a success notification
   */
  public showSuccess(message: string = 'All names validated successfully'): void {
    if (!this.config.showSuccessNotifications) {
      return;
    }

    this.updateStatus(message, 'success');
    
    if (this.config.enableSounds) {
      this.playNotificationSound('success');
    }

    // Auto-hide success message after 3 seconds
    setTimeout(() => {
      this.updateStatus('Ready to validate', 'ready');
    }, 3000);
  }

  /**
   * Clear all notifications
   */
  public clearNotifications(): void {
    const container = document.getElementById('warnings-container');
    if (container) {
      container.innerHTML = '';
      container.style.display = 'none';
    }
    this.activeWarnings.clear();
  }

  /**
   * Update the validation status display
   */
  public updateStatus(status: ValidationStatus): void;
  public updateStatus(message: string, type: 'ready' | 'validating' | 'success' | 'warning' | 'error'): void;
  public updateStatus(
    statusOrMessage: ValidationStatus | string, 
    type?: 'ready' | 'validating' | 'success' | 'warning' | 'error'
  ): void {
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = statusIndicator?.querySelector('.status-text');

    if (typeof statusOrMessage === 'string' && type) {
      // Simple message update
      if (statusText) {
        statusText.textContent = statusOrMessage;
      }
      
      if (statusIndicator) {
        statusIndicator.className = 'status-indicator';
        statusIndicator.classList.add(`status-${type}`);
      }
    } else if (typeof statusOrMessage === 'object') {
      // ValidationStatus object
      const status = statusOrMessage;
      let message = 'Ready to validate';
      let statusType: string = 'ready';

      if (status.isValidating) {
        message = 'Validating names...';
        statusType = 'validating';
      } else if (status.hasWarnings) {
        message = `${status.warningCount} potential issue(s) found`;
        statusType = 'warning';
      } else {
        message = 'All names validated successfully';
        statusType = 'success';
      }

      if (statusText) {
        statusText.textContent = message;
      }
      
      if (statusIndicator) {
        statusIndicator.className = 'status-indicator';
        statusIndicator.classList.add(`status-${statusType}`);
      }
    }
  }

  /**
   * Dismiss a specific warning by ID
   */
  public dismissWarning(warningId: string): void {
    const warningElement = this.activeWarnings.get(warningId);
    if (warningElement) {
      // Add fade-out animation
      warningElement.style.animation = 'fadeOut 0.3s ease-out';
      
      setTimeout(() => {
        warningElement.remove();
        this.activeWarnings.delete(warningId);
        
        // Hide container if no warnings left
        if (this.activeWarnings.size === 0) {
          const container = document.getElementById('warnings-container');
          if (container) {
            container.style.display = 'none';
          }
          this.updateStatus('Warnings dismissed', 'ready');
        }
        
        // Call callback if provided
        if (this.callbacks.onWarningDismissed) {
          this.callbacks.onWarningDismissed(warningId);
        }
      }, 300);
    }
  }

  /**
   * Get the number of active warnings
   */
  public getActiveWarningCount(): number {
    return this.activeWarnings.size;
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<NotificationSystemConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Create a warning element for a validation result
   */
  private createWarningElement(warningId: string, validation: ValidationResult): HTMLElement {
    const warningElement = document.createElement('div');
    warningElement.className = 'validation-warning';
    warningElement.setAttribute('data-warning-id', warningId);

    let suggestionText = '';
    let correctionButton = '';
    
    if (validation.suggestedRecipient) {
      const suggestedName = validation.suggestedRecipient.extractedNames[0] || 
                           validation.suggestedRecipient.displayName || 
                           validation.suggestedRecipient.email.split('@')[0];
      suggestionText = ` Did you mean "${suggestedName}"?`;
      
      correctionButton = `
        <button class="apply-correction" data-original="${validation.greetingName}" data-suggested="${suggestedName}">
          Apply Correction
        </button>
      `;
    }

    warningElement.innerHTML = `
      <div class="warning-icon" role="img" aria-label="Warning">⚠️</div>
      <div class="warning-content">
        <div class="warning-message" role="alert">
          Name "<strong>${this.escapeHtml(validation.greetingName)}</strong>" doesn't match any recipient.${suggestionText}
        </div>
        <div class="warning-confidence" aria-label="Confidence level">
          Confidence: ${Math.round(validation.confidence * 100)}%
        </div>
        ${correctionButton}
      </div>
      <button class="dismiss-warning" aria-label="Dismiss warning" title="Dismiss this warning">×</button>
    `;

    // Add event listeners
    this.attachWarningEventListeners(warningElement, warningId, validation);

    return warningElement;
  }

  /**
   * Attach event listeners to warning elements
   */
  private attachWarningEventListeners(
    warningElement: HTMLElement, 
    warningId: string, 
    validation: ValidationResult
  ): void {
    // Dismiss button
    const dismissButton = warningElement.querySelector('.dismiss-warning');
    if (dismissButton) {
      dismissButton.addEventListener('click', () => {
        this.dismissWarning(warningId);
      });
    }

    // Apply correction button
    const correctionButton = warningElement.querySelector('.apply-correction');
    if (correctionButton) {
      correctionButton.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const originalName = target.getAttribute('data-original') || '';
        const suggestedName = target.getAttribute('data-suggested') || '';
        
        if (this.callbacks.onCorrectionApplied) {
          this.callbacks.onCorrectionApplied(originalName, suggestedName);
        }
        
        this.dismissWarning(warningId);
      });
    }

    // Keyboard accessibility
    warningElement.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.dismissWarning(warningId);
      }
    });
  }

  /**
   * Dismiss the oldest warning when max limit is reached
   */
  private dismissOldestWarning(): void {
    const oldestWarningId = this.activeWarnings.keys().next().value;
    if (oldestWarningId) {
      this.dismissWarning(oldestWarningId);
    }
  }

  /**
   * Create an error element for display
   */
  private createErrorElement(errorId: string, error: Error, message: string, suggestions: string[]): HTMLElement {
    const errorElement = document.createElement('div');
    errorElement.className = 'validation-error';
    errorElement.setAttribute('data-error-id', errorId);

    const suggestionsList = suggestions.length > 0 
      ? `<ul class="error-suggestions">${suggestions.map(s => `<li>${this.escapeHtml(s)}</li>`).join('')}</ul>`
      : '';

    const diagnosticInfo = error instanceof BaseValidationError 
      ? `<div class="error-details" style="display: none;">
           <strong>Error ID:</strong> ${error.errorId}<br>
           <strong>Category:</strong> ${error.category}<br>
           <strong>Severity:</strong> ${error.severity}<br>
           <strong>Time:</strong> ${error.timestamp.toLocaleString()}
         </div>`
      : '';

    errorElement.innerHTML = `
      <div class="error-icon" role="img" aria-label="Error">❌</div>
      <div class="error-content">
        <div class="error-message" role="alert">
          <strong>Error:</strong> ${this.escapeHtml(message)}
        </div>
        ${suggestionsList}
        ${diagnosticInfo}
        <div class="error-actions">
          <button class="retry-action" data-error-id="${errorId}">Try Again</button>
          <button class="show-details" data-error-id="${errorId}">Show Details</button>
        </div>
      </div>
      <button class="dismiss-error" aria-label="Dismiss error" title="Dismiss this error">×</button>
    `;

    // Add event listeners
    this.attachErrorEventListeners(errorElement, errorId, error);

    return errorElement;
  }

  /**
   * Attach event listeners to error elements
   */
  private attachErrorEventListeners(errorElement: HTMLElement, errorId: string, error: Error): void {
    // Dismiss button
    const dismissButton = errorElement.querySelector('.dismiss-error');
    if (dismissButton) {
      dismissButton.addEventListener('click', () => {
        this.dismissWarning(errorId);
      });
    }

    // Retry button
    const retryButton = errorElement.querySelector('.retry-action');
    if (retryButton) {
      retryButton.addEventListener('click', () => {
        if (this.callbacks.onRetryRequested) {
          this.callbacks.onRetryRequested(errorId, error);
        }
        this.dismissWarning(errorId);
      });
    }

    // Show details button
    const detailsButton = errorElement.querySelector('.show-details');
    if (detailsButton) {
      detailsButton.addEventListener('click', () => {
        const detailsDiv = errorElement.querySelector('.error-details') as HTMLElement;
        if (detailsDiv) {
          const isVisible = detailsDiv.style.display !== 'none';
          detailsDiv.style.display = isVisible ? 'none' : 'block';
          (detailsButton as HTMLElement).textContent = isVisible ? 'Show Details' : 'Hide Details';
        }
      });
    }
  }

  /**
   * Play notification sound (placeholder for future implementation)
   */
  private playNotificationSound(type: 'warning' | 'success' | 'error'): void {
    // Placeholder for sound notification
    // Could be implemented with Web Audio API or HTML5 audio elements
    DiagnosticLogger.debug(`Playing ${type} notification sound`);
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

/**
 * Factory function to create a NotificationSystem instance
 */
export function createNotificationSystem(
  config?: NotificationSystemConfig,
  callbacks?: NotificationCallbacks
): NotificationSystem {
  return new NotificationSystem(config, callbacks);
}