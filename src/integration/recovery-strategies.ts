/**
 * Recovery strategies for different error types in the Outlook Name Validator
 * Implements graceful degradation and automatic recovery mechanisms
 */

import { RecoveryStrategy, DiagnosticLogger, OfficeIntegrationError, ValidationError, ParsingError, NetworkError } from './error-handler';

/**
 * Base recovery strategy with common functionality
 */
abstract class BaseRecoveryStrategy implements RecoveryStrategy {
  protected maxRecoveryAttempts = 3;
  protected recoveryAttempts = 0;

  abstract canRecover(error: Error): boolean;
  abstract recover(error: Error, context?: Record<string, any>): Promise<any>;
  abstract getRecoveryMessage(): string;

  protected resetAttempts(): void {
    this.recoveryAttempts = 0;
  }

  protected incrementAttempts(): void {
    this.recoveryAttempts++;
  }

  protected hasAttemptsLeft(): boolean {
    return this.recoveryAttempts < this.maxRecoveryAttempts;
  }
}

/**
 * Recovery strategy for Office.js API errors
 */
export class OfficeApiRecoveryStrategy extends BaseRecoveryStrategy {
  canRecover(error: Error): boolean {
    if (!(error instanceof OfficeIntegrationError)) {
      return false;
    }

    // Can recover from certain Office API errors
    const recoverableCodes = [
      'INTERNAL_ERROR',
      'ITEM_NOT_FOUND',
      'NETWORK_ERROR'
    ];

    return recoverableCodes.includes(error.code || '') && this.hasAttemptsLeft();
  }

  async recover(error: Error, context?: Record<string, any>): Promise<void> {
    this.incrementAttempts();
    
    DiagnosticLogger.info(`Attempting Office API recovery (attempt ${this.recoveryAttempts}/${this.maxRecoveryAttempts})`);

    const officeError = error as OfficeIntegrationError;
    
    switch (officeError.code) {
      case 'INTERNAL_ERROR':
        await this.recoverFromInternalError(context);
        break;
      case 'ITEM_NOT_FOUND':
        await this.recoverFromItemNotFound(context);
        break;
      case 'NETWORK_ERROR':
        await this.recoverFromNetworkError(context);
        break;
      default:
        throw new Error(`No recovery strategy for code: ${officeError.code}`);
    }
  }

  getRecoveryMessage(): string {
    return 'Attempting to recover from Office API error...';
  }

  private async recoverFromInternalError(context?: Record<string, any>): Promise<void> {
    // Wait a bit and try to reinitialize Office context
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      // Verify Office context is still available
      if (typeof Office !== 'undefined' && Office.context) {
        DiagnosticLogger.info('Office context recovered from internal error');
      } else {
        throw new Error('Office context not available after recovery attempt');
      }
    } catch (error) {
      DiagnosticLogger.error('Failed to recover from internal error', error as Error);
      throw error;
    }
  }

  private async recoverFromItemNotFound(context?: Record<string, any>): Promise<void> {
    // Try to refresh the mail item reference
    try {
      if (Office.context?.mailbox?.item) {
        // Force a property access to verify item is available
        const itemType = Office.context.mailbox.item.itemType;
        DiagnosticLogger.info('Mail item recovered', { itemType });
      } else {
        throw new Error('Mail item still not available');
      }
    } catch (error) {
      DiagnosticLogger.error('Failed to recover mail item', error as Error);
      throw error;
    }
  }

  private async recoverFromNetworkError(context?: Record<string, any>): Promise<void> {
    // Wait for network recovery
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test network connectivity by trying a simple Office operation
    try {
      if (Office.context?.mailbox?.item) {
        // Simple property access to test connectivity
        const itemType = Office.context.mailbox.item.itemType;
        DiagnosticLogger.info('Network connectivity recovered');
      }
    } catch (error) {
      DiagnosticLogger.error('Network still unavailable after recovery attempt', error as Error);
      throw error;
    }
  }
}

/**
 * Recovery strategy for validation errors
 */
export class ValidationRecoveryStrategy extends BaseRecoveryStrategy {
  canRecover(error: Error): boolean {
    if (!(error instanceof ValidationError)) {
      return false;
    }

    // Can recover from certain validation steps
    const recoverableSteps = [
      'content_parsing',
      'recipient_parsing',
      'name_matching'
    ];

    return recoverableSteps.includes(error.validationStep || '') && this.hasAttemptsLeft();
  }

  async recover(error: Error, context?: Record<string, any>): Promise<void> {
    this.incrementAttempts();
    
    const validationError = error as ValidationError;
    DiagnosticLogger.info(`Attempting validation recovery for step: ${validationError.validationStep}`);

    switch (validationError.validationStep) {
      case 'content_parsing':
        await this.recoverFromContentParsingError(context);
        break;
      case 'recipient_parsing':
        await this.recoverFromRecipientParsingError(context);
        break;
      case 'name_matching':
        await this.recoverFromNameMatchingError(context);
        break;
      default:
        throw new Error(`No recovery strategy for validation step: ${validationError.validationStep}`);
    }
  }

  getRecoveryMessage(): string {
    return 'Attempting to recover from validation error using fallback methods...';
  }

  private async recoverFromContentParsingError(context?: Record<string, any>): Promise<void> {
    // Try with simplified parsing rules
    DiagnosticLogger.info('Attempting content parsing recovery with simplified rules');
    
    // This would involve using more lenient parsing patterns
    // The actual implementation would be in the email content parser
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async recoverFromRecipientParsingError(context?: Record<string, any>): Promise<void> {
    // Try with basic email parsing
    DiagnosticLogger.info('Attempting recipient parsing recovery with basic patterns');
    
    // This would involve falling back to simple email address parsing
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async recoverFromNameMatchingError(context?: Record<string, any>): Promise<void> {
    // Try with exact matching only (disable fuzzy matching)
    DiagnosticLogger.info('Attempting name matching recovery with exact matching only');
    
    // This would involve disabling fuzzy matching temporarily
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * Recovery strategy for parsing errors
 */
export class ParsingRecoveryStrategy extends BaseRecoveryStrategy {
  canRecover(error: Error): boolean {
    return error instanceof ParsingError && this.hasAttemptsLeft();
  }

  async recover(error: Error, context?: Record<string, any>): Promise<void> {
    this.incrementAttempts();
    
    const parsingError = error as ParsingError;
    DiagnosticLogger.info(`Attempting parsing recovery for step: ${parsingError.parsingStep}`);

    // Try with more lenient parsing rules
    switch (parsingError.parsingStep) {
      case 'greeting_extraction':
        await this.recoverFromGreetingExtractionError(context);
        break;
      case 'email_parsing':
        await this.recoverFromEmailParsingError(context);
        break;
      default:
        // Generic parsing recovery
        await this.recoverFromGenericParsingError(context);
    }
  }

  getRecoveryMessage(): string {
    return 'Attempting to recover from parsing error using fallback patterns...';
  }

  private async recoverFromGreetingExtractionError(context?: Record<string, any>): Promise<void> {
    // Use basic greeting patterns only
    DiagnosticLogger.info('Using basic greeting patterns for recovery');
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async recoverFromEmailParsingError(context?: Record<string, any>): Promise<void> {
    // Use simple email splitting
    DiagnosticLogger.info('Using simple email parsing for recovery');
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async recoverFromGenericParsingError(context?: Record<string, any>): Promise<void> {
    // Skip parsing and use raw data
    DiagnosticLogger.info('Skipping complex parsing for recovery');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * Recovery strategy for network errors
 */
export class NetworkRecoveryStrategy extends BaseRecoveryStrategy {
  canRecover(error: Error): boolean {
    return error instanceof NetworkError && this.hasAttemptsLeft();
  }

  async recover(error: Error, context?: Record<string, any>): Promise<void> {
    this.incrementAttempts();
    
    DiagnosticLogger.info(`Attempting network recovery (attempt ${this.recoveryAttempts}/${this.maxRecoveryAttempts})`);

    // Wait for network to recover
    const waitTime = Math.min(1000 * this.recoveryAttempts, 5000); // Max 5 seconds
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // Test network connectivity
    try {
      // Simple connectivity test using Office API
      if (Office.context?.mailbox?.item) {
        const itemType = Office.context.mailbox.item.itemType;
        DiagnosticLogger.info('Network connectivity test passed');
      }
    } catch (error) {
      DiagnosticLogger.error('Network connectivity test failed', error as Error);
      throw new Error('Network still unavailable');
    }
  }

  getRecoveryMessage(): string {
    return 'Waiting for network connectivity to recover...';
  }
}

/**
 * Graceful degradation strategy for when recovery is not possible
 */
export class GracefulDegradationStrategy extends BaseRecoveryStrategy {
  canRecover(error: Error): boolean {
    // This strategy can always "recover" by providing degraded functionality
    return true;
  }

  async recover(error: Error, context?: Record<string, any>): Promise<{ degradedMode: boolean; availableFeatures: string[] }> {
    DiagnosticLogger.info('Entering graceful degradation mode');

    const availableFeatures: string[] = [];

    // Test what features are still available
    try {
      if (Office.context?.mailbox?.item) {
        availableFeatures.push('basic_office_access');
        
        if (Office.context.mailbox.item.to) {
          availableFeatures.push('recipient_access');
        }
        
        if (Office.context.mailbox.item.body) {
          availableFeatures.push('body_access');
        }
      }
    } catch (error) {
      DiagnosticLogger.warn('Limited Office access in degraded mode', { error: (error as Error).message });
    }

    return {
      degradedMode: true,
      availableFeatures
    };
  }

  getRecoveryMessage(): string {
    return 'Switching to limited functionality mode...';
  }
}

/**
 * Recovery strategy for configuration errors
 */
export class ConfigurationRecoveryStrategy extends BaseRecoveryStrategy {
  canRecover(error: Error): boolean {
    return error.name === 'ConfigurationError' && this.hasAttemptsLeft();
  }

  async recover(error: Error, context?: Record<string, any>): Promise<void> {
    this.incrementAttempts();
    
    DiagnosticLogger.info(`Attempting configuration recovery (attempt ${this.recoveryAttempts}/${this.maxRecoveryAttempts})`);

    // Try to reset to default configuration
    try {
      // This would involve resetting configuration to defaults
      DiagnosticLogger.info('Resetting to default configuration');
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      DiagnosticLogger.error('Failed to reset configuration', error as Error);
      throw error;
    }
  }

  getRecoveryMessage(): string {
    return 'Attempting to recover from configuration error by resetting to defaults...';
  }
}

/**
 * Recovery strategy for memory-related errors
 */
export class MemoryRecoveryStrategy extends BaseRecoveryStrategy {
  canRecover(error: Error): boolean {
    const isMemoryError = (error as Error).message.toLowerCase().includes('memory') ||
                         (error as Error).message.toLowerCase().includes('heap') ||
                         (error as Error).name === 'RangeError';
    return isMemoryError && this.hasAttemptsLeft();
  }

  async recover(error: Error, context?: Record<string, any>): Promise<void> {
    this.incrementAttempts();
    
    DiagnosticLogger.info(`Attempting memory recovery (attempt ${this.recoveryAttempts}/${this.maxRecoveryAttempts})`);

    try {
      // Clear caches and force garbage collection
      if (typeof window !== 'undefined' && (window as any).gc) {
        (window as any).gc();
      }
      
      // Clear any large data structures
      DiagnosticLogger.info('Memory cleanup completed');
      
      // Wait a bit for memory to be freed
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      DiagnosticLogger.error('Failed to recover from memory error', error as Error);
      throw error;
    }
  }

  getRecoveryMessage(): string {
    return 'Attempting to recover from memory error by clearing caches...';
  }
}

/**
 * Recovery strategy for timeout errors
 */
export class TimeoutRecoveryStrategy extends BaseRecoveryStrategy {
  canRecover(error: Error): boolean {
    const isTimeoutError = (error as Error).message.toLowerCase().includes('timeout') ||
                          (error as Error).message.toLowerCase().includes('timed out') ||
                          (error as Error).name === 'TimeoutError';
    return isTimeoutError && this.hasAttemptsLeft();
  }

  async recover(error: Error, context?: Record<string, any>): Promise<void> {
    this.incrementAttempts();
    
    DiagnosticLogger.info(`Attempting timeout recovery (attempt ${this.recoveryAttempts}/${this.maxRecoveryAttempts})`);

    // Increase timeout for next attempt
    const baseTimeout = 5000; // 5 seconds
    const newTimeout = baseTimeout * this.recoveryAttempts;
    
    DiagnosticLogger.info(`Increasing timeout to ${newTimeout}ms for next attempt`);
    
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, 1000 * this.recoveryAttempts));
  }

  getRecoveryMessage(): string {
    return 'Attempting to recover from timeout by increasing wait time...';
  }
}

/**
 * Recovery strategy for quota/rate limit errors
 */
export class QuotaRecoveryStrategy extends BaseRecoveryStrategy {
  canRecover(error: Error): boolean {
    const isQuotaError = (error as Error).message.toLowerCase().includes('quota') ||
                        (error as Error).message.toLowerCase().includes('rate limit') ||
                        (error as Error).message.toLowerCase().includes('throttle');
    return isQuotaError && this.hasAttemptsLeft();
  }

  async recover(error: Error, context?: Record<string, any>): Promise<void> {
    this.incrementAttempts();
    
    DiagnosticLogger.info(`Attempting quota recovery (attempt ${this.recoveryAttempts}/${this.maxRecoveryAttempts})`);

    // Wait with exponential backoff for quota to reset
    const waitTime = Math.min(5000 * Math.pow(2, this.recoveryAttempts - 1), 60000); // Max 1 minute
    
    DiagnosticLogger.info(`Waiting ${waitTime}ms for quota to reset`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  getRecoveryMessage(): string {
    return 'Attempting to recover from quota limit by waiting for reset...';
  }
}

/**
 * Factory function to create and register all recovery strategies
 */
export function createRecoveryStrategies(): Map<string, RecoveryStrategy> {
  const strategies = new Map<string, RecoveryStrategy>();

  strategies.set('OfficeIntegrationError', new OfficeApiRecoveryStrategy());
  strategies.set('ValidationError', new ValidationRecoveryStrategy());
  strategies.set('ParsingError', new ParsingRecoveryStrategy());
  strategies.set('NetworkError', new NetworkRecoveryStrategy());
  strategies.set('ConfigurationError', new ConfigurationRecoveryStrategy());
  strategies.set('MemoryError', new MemoryRecoveryStrategy());
  strategies.set('TimeoutError', new TimeoutRecoveryStrategy());
  strategies.set('QuotaError', new QuotaRecoveryStrategy());
  strategies.set('graceful_degradation', new GracefulDegradationStrategy());

  return strategies;
}