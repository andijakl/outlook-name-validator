/**
 * Validation orchestrator that coordinates the validation process
 * Integrates Office.js events with validation logic
 */

import { OutlookIntegration, ValidationEventHandler } from './office-integration';
import { ValidationResult, ValidationState, ParsedRecipient } from '../models/interfaces';
import { EmailContentParserImpl, SupportedLanguage } from '../models/email-content-parser';
import { ConfigurationManager } from '../models/configuration-manager';
import { RecipientParser } from '../models/recipient-parser';
import { NameMatchingEngine } from '../models/name-matching-engine';
import { 
  OfficeErrorHandler, 
  DiagnosticLogger, 
  ValidationError, 
  ParsingError,
  BaseValidationError,
  ErrorSeverity 
} from './error-handler';
import { createRecoveryStrategies } from './recovery-strategies';
import { 
  globalPerformanceMonitor,
  PerformanceMeasurement 
} from '../models/performance-monitor';
import { 
  globalLazyLoader,
  LazyEmailContentParser,
  LazyRecipientParser,
  LazyNameMatchingEngine 
} from '../models/lazy-loader';
import { 
  globalAsyncProcessor,
  globalWorkerProcessor 
} from '../models/async-processor';
import { 
  globalRecipientCache,
  globalValidationCache,
  globalMemoryMonitor 
} from '../models/memory-optimizer';

/**
 * Interface for validation orchestrator
 */
export interface ValidationOrchestrator {
  initialize(): Promise<void>;
  validateCurrentEmail(): Promise<ValidationResult[]>;
  handleRecipientsChanged(): void;
  handleContentChanged(): void;
  dispose(): void;
}

/**
 * Interface for orchestrator event callbacks
 */
export interface OrchestratorEventHandler {
  onValidationComplete(results: ValidationResult[]): void;
  onValidationError(error: Error): void;
  onValidationStarted(): void;
}

/**
 * Main validation orchestrator implementation
 */
export class ValidationOrchestratorImpl implements ValidationOrchestrator, ValidationEventHandler {
  private officeIntegration: OutlookIntegration;
  private emailParser?: EmailContentParserImpl;
  private recipientParser?: RecipientParser;
  private matchingEngine?: NameMatchingEngine;
  private lazyEmailParser?: LazyEmailContentParser;
  private lazyRecipientParser?: LazyRecipientParser;
  private lazyMatchingEngine?: LazyNameMatchingEngine;
  private eventHandler?: OrchestratorEventHandler;
  private isValidating = false;
  private cachedRecipients?: ParsedRecipient[];
  private cachedContent?: string;
  private cachedRecipientsTimestamp = 0;
  private cachedContentTimestamp = 0;
  private lastValidationTime = 0;
  private readonly minValidationInterval = 1000; // Minimum 1 second between validations
  private readonly cacheExpirationTime = 30000; // 30 seconds cache expiration
  private debounceTimer?: number;
  private readonly debounceDelay = 500; // 500ms debounce delay
  private degradedMode = false;
  private availableFeatures: string[] = [];
  private consecutiveErrors = 0;
  private readonly maxConsecutiveErrors = 5;
  private useLazyLoading = true;
  private useAsyncProcessing = true;
  private useWorkerProcessing = false;
  private currentMeasurement?: PerformanceMeasurement;

  constructor(eventHandler?: OrchestratorEventHandler) {
    this.eventHandler = eventHandler;
    this.officeIntegration = new OutlookIntegration(this);
    
    // Initialize components based on configuration
    this.initializeComponents();
    
    // Register recovery strategies
    this.initializeRecoveryStrategies();
  }

  /**
   * Initialize validation components (lazy or eager loading)
   */
  private async initializeComponents(): Promise<void> {
    // Get language configuration
    const configManager = ConfigurationManager.getInstance();
    await configManager.initialize();
    const config = configManager.getConfig();
    const language = config.language as SupportedLanguage;

    if (this.useLazyLoading) {
      // Use lazy loading for better initial performance
      this.lazyEmailParser = await globalLazyLoader.load('emailParser', language);
      this.lazyRecipientParser = await globalLazyLoader.load('recipientParser');
      this.lazyMatchingEngine = await globalLazyLoader.load('nameMatchingEngine');
    } else {
      // Use eager loading for immediate availability
      this.emailParser = new EmailContentParserImpl(language);
      this.recipientParser = new RecipientParser();
      this.matchingEngine = new NameMatchingEngine();
    }
  }

  /**
   * Initialize recovery strategies for error handling
   */
  private initializeRecoveryStrategies(): void {
    try {
      const strategies = createRecoveryStrategies();
      strategies.forEach((strategy, errorType) => {
        OfficeErrorHandler.registerRecoveryStrategy(errorType, strategy);
      });
      DiagnosticLogger.info('Recovery strategies initialized successfully');
    } catch (error) {
      DiagnosticLogger.error('Failed to initialize recovery strategies', error as Error);
    }
  }

  /**
   * Initialize the validation orchestrator with comprehensive error handling
   */
  async initialize(): Promise<void> {
    return OfficeErrorHandler.retryOperation(
      async () => {
        DiagnosticLogger.info('Initializing validation orchestrator...');
        
        try {
          // Validate Office context first
          OfficeErrorHandler.validateOfficeContext();
          
          // Check permissions and determine available features
          const permissionResult = OfficeErrorHandler.validatePermissions();
          this.availableFeatures = permissionResult.availableFeatures;
          
          if (!permissionResult.hasFullAccess) {
            DiagnosticLogger.warn('Limited permissions detected, entering degraded mode', {
              availableFeatures: this.availableFeatures
            });
            this.degradedMode = true;
          }
          
          // Initialize Office.js integration
          await this.officeIntegration.initialize();
          
          DiagnosticLogger.info('Validation orchestrator initialized successfully', {
            degradedMode: this.degradedMode,
            availableFeatures: this.availableFeatures
          });
          
          this.consecutiveErrors = 0; // Reset error counter on successful initialization
          
        } catch (error) {
          this.consecutiveErrors++;
          DiagnosticLogger.error('Validation orchestrator initialization failed', error as Error, {
            consecutiveErrors: this.consecutiveErrors,
            degradedMode: this.degradedMode
          });
          
          // If too many consecutive errors, enter degraded mode
          if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
            DiagnosticLogger.warn('Too many consecutive errors, entering degraded mode');
            this.degradedMode = true;
            this.availableFeatures = ['basic_functionality'];
            return; // Don't throw, continue in degraded mode
          }
          
          throw error;
        }
      },
      'orchestrator_initialization',
      3, // Max 3 attempts
      2000 // 2 second base delay
    );
  }

  /**
   * Validate current email content and recipients with comprehensive error handling and performance optimization
   */
  async validateCurrentEmail(): Promise<ValidationResult[]> {
    return OfficeErrorHandler.retryOperation(
      async () => {
        try {
          // Prevent concurrent validations
          if (this.isValidating) {
            DiagnosticLogger.debug('Validation already in progress, returning cached results');
            return this.getLastValidationResults();
          }

          // Rate limiting - prevent too frequent validations
          const now = Date.now();
          if (now - this.lastValidationTime < this.minValidationInterval) {
            DiagnosticLogger.debug('Validation rate limited, returning cached results');
            return this.getLastValidationResults();
          }

          this.isValidating = true;
          this.lastValidationTime = now;

          // Start performance measurement
          this.currentMeasurement = globalPerformanceMonitor.startMeasurement();
          globalMemoryMonitor.recordUsage();

          if (this.eventHandler) {
            this.eventHandler.onValidationStarted();
          }

          DiagnosticLogger.info('Starting email validation...', {
            degradedMode: this.degradedMode,
            availableFeatures: this.availableFeatures,
            useLazyLoading: this.useLazyLoading,
            useAsyncProcessing: this.useAsyncProcessing
          });

          // Get current email data with error handling
          const [recipients, emailBody] = await this.getEmailDataWithErrorHandling();

          // Check cache first for validation results
          const cachedValidation = globalValidationCache.getCachedValidation(emailBody, recipients);
          if (cachedValidation) {
            DiagnosticLogger.info('Using cached validation results');
            globalPerformanceMonitor.recordCacheHit();
            this.currentMeasurement?.complete();
            return cachedValidation;
          }
          globalPerformanceMonitor.recordCacheMiss();

          // Set content metrics for performance tracking
          this.currentMeasurement?.setContentMetrics(emailBody.length, recipients.length);

          // Parse email content for greetings with error handling
          this.currentMeasurement?.startParsing();
          const parsedContent = await this.parseContentWithErrorHandling(emailBody);
          this.currentMeasurement?.endParsing();
          
          if (!parsedContent.hasValidContent || parsedContent.greetings.length === 0) {
            DiagnosticLogger.info('No greetings found in email content');
            const emptyResults: ValidationResult[] = [];
            this.updateValidationState(emptyResults);
            this.currentMeasurement?.complete();
            return emptyResults;
          }

          // Parse recipients with error handling
          const parsedRecipients = await this.parseRecipientsWithErrorHandling(recipients);

          // Validate names with error handling
          this.currentMeasurement?.startMatching();
          const validationResults = await this.validateNamesWithErrorHandling(parsedContent.greetings, parsedRecipients);
          this.currentMeasurement?.endMatching();

          // Cache the validation results
          globalValidationCache.cacheValidation(emailBody, recipients, validationResults);

          DiagnosticLogger.info(`Validation complete. Found ${validationResults.length} results`);
          
          // Update validation state
          this.updateValidationState(validationResults);
          
          if (this.eventHandler) {
            this.eventHandler.onValidationComplete(validationResults);
          }

          this.consecutiveErrors = 0; // Reset error counter on success
          
          // Complete performance measurement
          const metrics = this.currentMeasurement?.complete();
          if (metrics) {
            DiagnosticLogger.info('Validation performance metrics', {
              validationTime: metrics.validationTime,
              parseTime: metrics.parseTime,
              matchingTime: metrics.matchingTime,
              memoryUsage: metrics.memoryUsage,
              cacheHitRate: metrics.cacheHitRate
            });
          }

          return validationResults;

        } catch (error) {
          this.consecutiveErrors++;
          
          const validationError = new ValidationError(
            'Email validation failed',
            'validation_orchestration',
            error as Error,
            {
              consecutiveErrors: this.consecutiveErrors,
              degradedMode: this.degradedMode,
              availableFeatures: this.availableFeatures
            }
          );

          DiagnosticLogger.error('Validation failed', validationError);
          
          if (this.eventHandler) {
            this.eventHandler.onValidationError(validationError);
          }
          
          // If too many consecutive errors, enter degraded mode
          if (this.consecutiveErrors >= this.maxConsecutiveErrors && !this.degradedMode) {
            DiagnosticLogger.warn('Entering degraded mode due to consecutive errors');
            this.degradedMode = true;
            this.availableFeatures = ['basic_functionality'];
          }
          
          // Complete measurement even on error
          this.currentMeasurement?.complete();
          
          throw validationError;
        } finally {
          this.isValidating = false;
          this.currentMeasurement = undefined;
        }
      },
      'email_validation',
      2, // Max 2 attempts for validation
      1000 // 1 second base delay
    );
  }

  /**
   * Handle recipient changes from Office.js with debouncing
   */
  handleRecipientsChanged(): void {
    console.log('Recipients changed, clearing cache and triggering debounced validation');
    this.invalidateRecipientsCache();
    this.debouncedValidation();
  }

  /**
   * Handle content changes from Office.js with debouncing
   */
  handleContentChanged(): void {
    console.log('Email content changed, clearing cache and triggering debounced validation');
    this.invalidateContentCache();
    this.debouncedValidation();
  }

  /**
   * ValidationEventHandler implementation - called by Office integration
   */
  onValidationComplete(results: ValidationResult[]): void {
    // Forward to our event handler
    if (this.eventHandler) {
      this.eventHandler.onValidationComplete(results);
    }
  }

  /**
   * ValidationEventHandler implementation - called by Office integration
   */
  onValidationError(error: Error): void {
    // Forward to our event handler
    if (this.eventHandler) {
      this.eventHandler.onValidationError(error);
    }
  }

  /**
   * ValidationEventHandler implementation - called by Office integration for recipient updates
   */
  onRecipientsChanged(recipients: ParsedRecipient[]): void {
    this.updateRecipientsCache(recipients);
  }

  /**
   * ValidationEventHandler implementation - called by Office integration for content updates
   */
  onContentChanged(content: string): void {
    this.updateContentCache(content);
  }

  /**
   * Get cached recipients if available
   */
  getCachedRecipients(): ParsedRecipient[] | undefined {
    return this.cachedRecipients;
  }

  /**
   * Get cached content if available
   */
  getCachedContent(): string | undefined {
    return this.cachedContent;
  }

  /**
   * Check if validation is currently in progress
   */
  isValidationInProgress(): boolean {
    return this.isValidating;
  }

  /**
   * Get validation state from Office integration
   */
  getValidationState(): ValidationState {
    return this.officeIntegration.getValidationState();
  }

  /**
   * Enable or disable validation
   */
  setValidationEnabled(enabled: boolean): void {
    this.officeIntegration.setValidationEnabled(enabled);
  }

  /**
   * Debounced validation to avoid excessive processing
   */
  private debouncedValidation(): void {
    // Clear existing timer
    if (this.debounceTimer) {
      window.clearTimeout(this.debounceTimer);
    }

    // Set new timer
    this.debounceTimer = window.setTimeout(() => {
      this.validateCurrentEmail().catch(error => {
        console.error('Error during debounced validation:', error);
      });
    }, this.debounceDelay);
  }

  /**
   * Get cached recipients or fetch fresh ones with optimized caching
   */
  private async getCachedOrFreshRecipients(): Promise<ParsedRecipient[]> {
    const now = Date.now();
    
    if (this.cachedRecipients && (now - this.cachedRecipientsTimestamp) < this.cacheExpirationTime) {
      console.log('Using cached recipients');
      globalPerformanceMonitor.recordCacheHit();
      return this.cachedRecipients;
    }

    console.log('Fetching fresh recipients');
    globalPerformanceMonitor.recordCacheMiss();
    
    const recipients = await this.officeIntegration.getCurrentRecipients();
    
    // Check global recipient cache
    const cachedParsedRecipients = globalRecipientCache.getCachedRecipients(recipients);
    if (cachedParsedRecipients) {
      console.log('Using globally cached parsed recipients');
      this.updateRecipientsCache(cachedParsedRecipients);
      globalPerformanceMonitor.recordCacheHit();
      return cachedParsedRecipients;
    }
    
    this.updateRecipientsCache(recipients);
    return recipients;
  }

  /**
   * Get cached content or fetch fresh content
   */
  private async getCachedOrFreshContent(): Promise<string> {
    const now = Date.now();
    
    if (this.cachedContent !== undefined && (now - this.cachedContentTimestamp) < this.cacheExpirationTime) {
      console.log('Using cached content');
      return this.cachedContent;
    }

    console.log('Fetching fresh content');
    const content = await this.officeIntegration.getCurrentEmailBody();
    this.updateContentCache(content);
    return content;
  }

  /**
   * Parse recipients with caching to avoid re-parsing the same data
   */
  private parseRecipientsWithCaching(recipients: ParsedRecipient[]): ParsedRecipient[] {
    // If recipients are already parsed (from cache), return them
    if (recipients.length > 0 && recipients[0].extractedNames) {
      return recipients;
    }

    // Parse recipients using RecipientParser
    return recipients.map(recipient => 
      this.recipientParser.parseEmailAddress(recipient.email, recipient.displayName)
    );
  }

  /**
   * Update recipients cache with timestamp
   */
  private updateRecipientsCache(recipients: ParsedRecipient[]): void {
    this.cachedRecipients = recipients;
    this.cachedRecipientsTimestamp = Date.now();
  }

  /**
   * Update content cache with timestamp
   */
  private updateContentCache(content: string): void {
    this.cachedContent = content;
    this.cachedContentTimestamp = Date.now();
  }

  /**
   * Invalidate recipients cache
   */
  private invalidateRecipientsCache(): void {
    this.cachedRecipients = undefined;
    this.cachedRecipientsTimestamp = 0;
  }

  /**
   * Invalidate content cache
   */
  private invalidateContentCache(): void {
    this.cachedContent = undefined;
    this.cachedContentTimestamp = 0;
  }

  /**
   * Update validation state with results
   */
  private updateValidationState(results: ValidationResult[]): void {
    this.officeIntegration.getValidationState().currentValidation = results;
    this.officeIntegration.getValidationState().lastValidationTime = new Date();
  }

  /**
   * Get last validation results from state
   */
  private getLastValidationResults(): ValidationResult[] {
    return this.officeIntegration.getValidationState().currentValidation || [];
  }

  /**
   * Get email data (recipients and content) with error handling
   */
  private async getEmailDataWithErrorHandling(): Promise<[ParsedRecipient[], string]> {
    try {
      const [recipients, emailBody] = await Promise.all([
        this.getCachedOrFreshRecipientsWithErrorHandling(),
        this.getCachedOrFreshContentWithErrorHandling()
      ]);
      return [recipients, emailBody];
    } catch (error) {
      throw new ValidationError(
        'Failed to retrieve email data',
        'data_retrieval',
        error as Error
      );
    }
  }

  /**
   * Parse email content with error handling, fallback, and performance optimization
   */
  private async parseContentWithErrorHandling(emailBody: string): Promise<any> {
    try {
      // Use appropriate parser based on configuration
      if (this.useLazyLoading && this.lazyEmailParser) {
        if (this.useAsyncProcessing && emailBody.length > 10000) {
          // Use async processing for large content
          const result = await globalAsyncProcessor.processEmailContent(
            emailBody,
            async (chunk) => {
              return await this.lazyEmailParser!.parseEmailContent(chunk);
            },
            { chunkSize: 5000 }
          );
          
          // Combine results from all chunks
          const allGreetings = result.results.flatMap(r => r.greetings || []);
          return {
            greetings: allGreetings,
            hasValidContent: allGreetings.length > 0
          };
        } else if (this.useWorkerProcessing && emailBody.length > 50000) {
          // Use web worker for very large content
          return await globalWorkerProcessor.processInWorker('parseContent', emailBody);
        } else {
          return await this.lazyEmailParser.parseEmailContent(emailBody);
        }
      } else if (this.emailParser) {
        return this.emailParser.parseEmailContent(emailBody);
      } else {
        throw new Error('No email parser available');
      }
    } catch (error) {
      DiagnosticLogger.warn('Content parsing failed, attempting recovery', { error: (error as Error).message });
      
      // Try with simplified parsing
      try {
        // This would use a more basic parsing approach
        return { greetings: [], hasValidContent: false };
      } catch (fallbackError) {
        throw new ParsingError(
          'Failed to parse email content',
          'greeting_extraction',
          error as Error
        );
      }
    }
  }

  /**
   * Parse recipients with error handling, fallback, and performance optimization
   */
  private async parseRecipientsWithErrorHandling(recipients: ParsedRecipient[]): Promise<ParsedRecipient[]> {
    try {
      // Check global cache first
      const cachedParsedRecipients = globalRecipientCache.getCachedRecipients(recipients);
      if (cachedParsedRecipients) {
        globalPerformanceMonitor.recordCacheHit();
        return cachedParsedRecipients;
      }
      globalPerformanceMonitor.recordCacheMiss();

      let parsedRecipients: ParsedRecipient[];

      if (this.useAsyncProcessing && recipients.length > 20) {
        // Use async processing for many recipients
        const result = await globalAsyncProcessor.processRecipients(
          recipients,
          async (recipient) => {
            if (this.useLazyLoading && this.lazyRecipientParser) {
              return await this.lazyRecipientParser.parseEmailAddress(recipient.email, recipient.displayName);
            } else if (this.recipientParser) {
              return this.recipientParser.parseEmailAddress(recipient.email, recipient.displayName);
            } else {
              throw new Error('No recipient parser available');
            }
          },
          { maxConcurrency: 5 }
        );
        parsedRecipients = result.results;
      } else {
        // Use synchronous processing for fewer recipients
        parsedRecipients = await this.parseRecipientsWithCaching(recipients);
      }

      // Cache the parsed recipients
      globalRecipientCache.cacheRecipients(recipients, parsedRecipients);
      
      return parsedRecipients;
    } catch (error) {
      DiagnosticLogger.warn('Recipient parsing failed, using basic parsing', { error: (error as Error).message });
      
      // Fallback to basic recipient parsing
      try {
        const basicParsed = recipients.map(recipient => ({
          ...recipient,
          extractedNames: [recipient.email.split('@')[0]], // Basic name extraction
          isGeneric: false
        }));
        
        // Cache even the basic parsing to avoid repeated failures
        globalRecipientCache.cacheRecipients(recipients, basicParsed);
        
        return basicParsed;
      } catch (fallbackError) {
        throw new ParsingError(
          'Failed to parse recipients',
          'email_parsing',
          error as Error
        );
      }
    }
  }

  /**
   * Validate names with error handling, fallback, and performance optimization
   */
  private async validateNamesWithErrorHandling(greetings: any[], recipients: ParsedRecipient[]): Promise<ValidationResult[]> {
    try {
      if (this.useAsyncProcessing && greetings.length > 10) {
        // Use async processing for many greetings
        const result = await globalAsyncProcessor.processValidation(
          greetings,
          recipients,
          async (greeting, allRecipients) => {
            if (this.useLazyLoading && this.lazyMatchingEngine) {
              const results = await this.lazyMatchingEngine.validateNames([greeting], allRecipients);
              return results[0];
            } else if (this.matchingEngine) {
              const results = this.matchingEngine.validateNames([greeting], allRecipients);
              return results[0];
            } else {
              throw new Error('No matching engine available');
            }
          },
          { maxConcurrency: 3 }
        );
        return result.results;
      } else if (this.useWorkerProcessing && greetings.length > 50) {
        // Use web worker for many greetings
        return await globalWorkerProcessor.processInWorker('matchNames', { greetings, recipients });
      } else {
        // Use appropriate matching engine
        if (this.useLazyLoading && this.lazyMatchingEngine) {
          return await this.lazyMatchingEngine.validateNames(greetings, recipients);
        } else if (this.matchingEngine) {
          return this.matchingEngine.validateNames(greetings, recipients);
        } else {
          throw new Error('No matching engine available');
        }
      }
    } catch (error) {
      DiagnosticLogger.warn('Name validation failed, using basic matching', { error: (error as Error).message });
      
      // Fallback to basic validation
      try {
        return greetings.map(greeting => ({
          greetingName: greeting.extractedName,
          isValid: recipients.some(r => 
            r.extractedNames.some(name => 
              name.toLowerCase() === greeting.extractedName.toLowerCase()
            )
          ),
          confidence: 0.5 // Low confidence for fallback
        }));
      } catch (fallbackError) {
        throw new ValidationError(
          'Failed to validate names',
          'name_matching',
          error as Error
        );
      }
    }
  }

  /**
   * Get cached recipients with error handling
   */
  private async getCachedOrFreshRecipientsWithErrorHandling(): Promise<ParsedRecipient[]> {
    try {
      return await this.getCachedOrFreshRecipients();
    } catch (error) {
      if (this.degradedMode) {
        DiagnosticLogger.warn('Using empty recipients in degraded mode');
        return [];
      }
      throw error;
    }
  }

  /**
   * Get cached content with error handling
   */
  private async getCachedOrFreshContentWithErrorHandling(): Promise<string> {
    try {
      return await this.getCachedOrFreshContent();
    } catch (error) {
      if (this.degradedMode) {
        DiagnosticLogger.warn('Using empty content in degraded mode');
        return '';
      }
      throw error;
    }
  }

  /**
   * Check if the orchestrator is in degraded mode
   */
  isDegradedMode(): boolean {
    return this.degradedMode;
  }

  /**
   * Get available features in current mode
   */
  getAvailableFeatures(): string[] {
    return [...this.availableFeatures];
  }

  /**
   * Get error statistics for diagnostics
   */
  getErrorStatistics(): { consecutiveErrors: number; degradedMode: boolean; maxErrors: number } {
    return {
      consecutiveErrors: this.consecutiveErrors,
      degradedMode: this.degradedMode,
      maxErrors: this.maxConsecutiveErrors
    };
  }

  /**
   * Reset error state (for testing or manual recovery)
   */
  resetErrorState(): void {
    this.consecutiveErrors = 0;
    this.degradedMode = false;
    this.availableFeatures = [];
    DiagnosticLogger.info('Orchestrator error state reset');
  }

  /**
   * Configure performance optimization settings
   */
  configurePerformance(options: {
    useLazyLoading?: boolean;
    useAsyncProcessing?: boolean;
    useWorkerProcessing?: boolean;
  }): void {
    this.useLazyLoading = options.useLazyLoading ?? this.useLazyLoading;
    this.useAsyncProcessing = options.useAsyncProcessing ?? this.useAsyncProcessing;
    this.useWorkerProcessing = options.useWorkerProcessing ?? this.useWorkerProcessing;
    
    DiagnosticLogger.info('Performance configuration updated', {
      useLazyLoading: this.useLazyLoading,
      useAsyncProcessing: this.useAsyncProcessing,
      useWorkerProcessing: this.useWorkerProcessing
    });
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): any {
    return globalPerformanceMonitor.getPerformanceReport();
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): any {
    return {
      monitor: globalMemoryMonitor.getMemoryStats(),
      recipientCache: globalRecipientCache.getStats(),
      validationCache: globalValidationCache.getStats()
    };
  }

  /**
   * Optimize memory usage
   */
  optimizeMemory(): void {
    DiagnosticLogger.info('Optimizing memory usage...');
    
    // Clear old performance metrics
    globalPerformanceMonitor.clearOldMetrics(20);
    
    // Optimize caches
    const recipientEvictions = globalRecipientCache.optimize();
    const validationEvictions = globalValidationCache.optimize();
    
    // Force garbage collection if available (only in development/testing)
    if (typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
    
    DiagnosticLogger.info('Memory optimization complete', {
      recipientEvictions,
      validationEvictions,
      memoryStats: globalMemoryMonitor.getMemoryStats()
    });
  }

  /**
   * Check if memory optimization is needed
   */
  shouldOptimizeMemory(): boolean {
    return globalMemoryMonitor.isMemoryUsageHigh();
  }

  /**
   * Clean up resources and event handlers
   */
  dispose(): void {
    DiagnosticLogger.info('Disposing validation orchestrator...');
    
    // Clear debounce timer
    if (this.debounceTimer) {
      window.clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
    
    // Dispose of lazy loaded components
    if (this.useLazyLoading) {
      globalLazyLoader.unloadAll();
    }
    
    // Terminate worker if used
    if (this.useWorkerProcessing) {
      globalWorkerProcessor.terminate();
    }
    
    // Clear caches
    globalRecipientCache.dispose();
    globalValidationCache.dispose();
    
    this.officeIntegration.dispose();
    this.cachedRecipients = undefined;
    this.cachedContent = undefined;
    this.cachedRecipientsTimestamp = 0;
    this.cachedContentTimestamp = 0;
    this.isValidating = false;
    this.consecutiveErrors = 0;
    this.degradedMode = false;
    this.availableFeatures = [];
    
    DiagnosticLogger.info('Validation orchestrator disposed');
  }
}