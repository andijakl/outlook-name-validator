import './taskpane.css';
import { ValidationOrchestratorImpl, OrchestratorEventHandler } from '../integration/validation-orchestrator';
import { ValidationResult, ValidationStatus } from '../models/interfaces';
import { NotificationSystem, NotificationCallbacks, NotificationSystemConfig } from '../models/notification-system';
import { SettingsUI } from './settings-ui';
import { ConfigurationManager } from '../models/configuration-manager';

/* global console, document, Excel, Office */

let validationOrchestrator: ValidationOrchestratorImpl | null = null;
let notificationSystem: NotificationSystem | null = null;
let settingsUI: SettingsUI | null = null;
let configManager: ConfigurationManager | null = null;

Office.onReady((info) => {
  if (info.host === Office.HostType.Outlook) {
    document.getElementById("sideload-msg")!.style.display = "none";
    document.getElementById("app-body")!.style.display = "flex";
    
    // Initialize the add-in
    initializeAddIn();
  }
});

/**
 * Event handler for validation orchestrator
 */
class TaskpaneEventHandler implements OrchestratorEventHandler {
  onValidationComplete(results: ValidationResult[]): void {
    console.log('Validation completed with', results.length, 'results');
    
    if (!notificationSystem) return;

    if (results.length === 0) {
      notificationSystem.showSuccess('No issues found');
    } else {
      const invalidResults = results.filter(r => !r.isValid);
      if (invalidResults.length > 0) {
        const status: ValidationStatus = {
          isValidating: false,
          hasWarnings: true,
          warningCount: invalidResults.length
        };
        notificationSystem.updateStatus(status);
        
        // Clear existing warnings and show new ones
        notificationSystem.clearNotifications();
        invalidResults.forEach(result => {
          notificationSystem!.showWarning(result);
        });
      } else {
        notificationSystem.showSuccess('All names validated successfully');
      }
    }
  }

  onValidationError(error: Error): void {
    console.error('Validation error:', error);
    if (notificationSystem) {
      notificationSystem.updateStatus('Validation failed: ' + error.message, 'error');
    }
  }

  onValidationStarted(): void {
    if (notificationSystem) {
      const status: ValidationStatus = {
        isValidating: true,
        hasWarnings: false,
        warningCount: 0
      };
      notificationSystem.updateStatus(status);
    }
  }
}

/**
 * Initialize the add-in functionality
 */
async function initializeAddIn(): Promise<void> {
  console.log('Outlook Name Validator add-in initialized');
  
  try {
    // Initialize configuration manager
    configManager = ConfigurationManager.getInstance();
    await configManager.initialize();
    
    // Get user preferences for notification system
    const userPreferences = configManager.getPreferences();
    
    // Initialize notification system
    const notificationConfig: NotificationSystemConfig = {
      autoHideDuration: userPreferences.warningDisplayDuration,
      maxWarnings: 5,
      showSuccessNotifications: userPreferences.showSuccessNotifications,
      enableSounds: false
    };

    const notificationCallbacks: NotificationCallbacks = {
      onWarningDismissed: (warningId: string) => {
        console.log('Warning dismissed:', warningId);
      },
      onCorrectionApplied: (originalName: string, correctedName: string) => {
        console.log('Correction applied:', originalName, '->', correctedName);
        // TODO: Apply correction to email content
        applyCorrectionToEmail(originalName, correctedName);
      },
      onSettingsRequested: () => {
        toggleSettingsPanel();
      }
    };

    notificationSystem = new NotificationSystem(notificationConfig, notificationCallbacks);
    
    // Initialize validation orchestrator
    const eventHandler = new TaskpaneEventHandler();
    validationOrchestrator = new ValidationOrchestratorImpl(eventHandler);
    
    await validationOrchestrator.initialize();
    console.log('Validation orchestrator initialized');
    
    // Initialize settings UI
    settingsUI = new SettingsUI();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize validation status
    notificationSystem.updateStatus('Ready to validate', 'ready');
    
    // Perform initial validation
    if (validationOrchestrator) {
      await validationOrchestrator.validateCurrentEmail();
    }
    
  } catch (error) {
    console.error('Failed to initialize add-in:', error);
    if (notificationSystem) {
      notificationSystem.updateStatus('Initialization failed', 'error');
    }
  }
}

/**
 * Set up event listeners for UI interactions
 */
function setupEventListeners(): void {
  const validateBtn = document.getElementById('validate-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const confidenceSlider = document.getElementById('confidence-threshold') as HTMLInputElement;
  
  if (validateBtn) {
    validateBtn.addEventListener('click', handleValidateClick);
  }
  
  if (settingsBtn) {
    settingsBtn.addEventListener('click', toggleSettingsPanel);
  }
  
  if (confidenceSlider) {
    confidenceSlider.addEventListener('input', updateConfidenceDisplay);
  }
}

/**
 * Handle validate button click
 */
async function handleValidateClick(): Promise<void> {
  console.log('Validate button clicked');
  
  if (!validationOrchestrator) {
    if (notificationSystem) {
      notificationSystem.updateStatus('Validation not available', 'error');
    }
    return;
  }
  
  try {
    await validationOrchestrator.validateCurrentEmail();
  } catch (error) {
    console.error('Manual validation failed:', error);
    if (notificationSystem) {
      notificationSystem.updateStatus('Manual validation failed', 'error');
    }
  }
}

/**
 * Toggle settings panel visibility
 */
async function toggleSettingsPanel(): Promise<void> {
  const settingsPanel = document.getElementById('settings-panel');
  if (!settingsPanel || !settingsUI) return;
  
  const isVisible = settingsPanel.style.display !== 'none';
  
  if (isVisible) {
    settingsPanel.style.display = 'none';
  } else {
    try {
      // Initialize settings UI if not already done
      await settingsUI.initialize('settings-panel');
      settingsPanel.style.display = 'block';
    } catch (error) {
      console.error('Failed to initialize settings UI:', error);
      if (notificationSystem) {
        notificationSystem.updateStatus('Failed to load settings', 'error');
      }
    }
  }
}

/**
 * Update confidence threshold display
 */
function updateConfidenceDisplay(): void {
  const slider = document.getElementById('confidence-threshold') as HTMLInputElement;
  const display = document.getElementById('confidence-value');
  
  if (slider && display) {
    display.textContent = `${slider.value}%`;
  }
}

/**
 * Apply a name correction to the email content
 */
async function applyCorrectionToEmail(originalName: string, correctedName: string): Promise<void> {
  try {
    if (!Office.context.mailbox.item) {
      console.error('No email item available for correction');
      return;
    }

    // Get current email body
    Office.context.mailbox.item.body.getAsync(Office.CoercionType.Text, (result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        const currentBody = result.value;
        
        // Replace the original name with the corrected name in greetings
        // Use word boundaries to avoid partial replacements
        const greetingPatterns = [
          new RegExp(`\\b(Hi|Hello|Dear)\\s+${originalName}\\b`, 'gi'),
          new RegExp(`\\b${originalName}\\b(?=\\s*[,!]?)`, 'gi')
        ];
        
        let updatedBody = currentBody;
        let replacementMade = false;
        
        greetingPatterns.forEach(pattern => {
          if (pattern.test(updatedBody)) {
            updatedBody = updatedBody.replace(pattern, (match) => {
              replacementMade = true;
              return match.replace(new RegExp(originalName, 'gi'), correctedName);
            });
          }
        });
        
        if (replacementMade) {
          // Set the updated body
          Office.context.mailbox.item!.body.setAsync(
            updatedBody,
            { coercionType: Office.CoercionType.Text },
            (setResult) => {
              if (setResult.status === Office.AsyncResultStatus.Succeeded) {
                console.log('Correction applied successfully');
                if (notificationSystem) {
                  notificationSystem.showSuccess(`Corrected "${originalName}" to "${correctedName}"`);
                }
                
                // Re-validate after correction
                if (validationOrchestrator) {
                  setTimeout(() => {
                    validationOrchestrator!.validateCurrentEmail();
                  }, 500);
                }
              } else {
                console.error('Failed to apply correction:', setResult.error);
                if (notificationSystem) {
                  notificationSystem.updateStatus('Failed to apply correction', 'error');
                }
              }
            }
          );
        } else {
          console.log('No matching text found for correction');
          if (notificationSystem) {
            notificationSystem.updateStatus('No matching text found for correction', 'warning');
          }
        }
      } else {
        console.error('Failed to get email body for correction:', result.error);
        if (notificationSystem) {
          notificationSystem.updateStatus('Failed to access email content', 'error');
        }
      }
    });
  } catch (error) {
    console.error('Error applying correction:', error);
    if (notificationSystem) {
      notificationSystem.updateStatus('Error applying correction', 'error');
    }
  }
}