/**
 * Comprehensive error handling utilities for Office.js API interactions and validation processes
 */

/// <reference path="../types/office-minimal.d.ts" />

/**
 * Error severity levels for diagnostic logging
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error categories for better error classification
 */
export enum ErrorCategory {
  OFFICE_API = 'office_api',
  VALIDATION = 'validation',
  PARSING = 'parsing',
  NETWORK = 'network',
  PERMISSION = 'permission',
  CONFIGURATION = 'configuration',
  UNKNOWN = 'unknown'
}

/**
 * Base error class with enhanced diagnostic information
 */
export abstract class BaseValidationError extends Error {
  public readonly timestamp: Date;
  public readonly errorId: string;
  
  constructor(
    message: string,
    public readonly category: ErrorCategory,
    public readonly severity: ErrorSeverity,
    public readonly code?: string,
    public readonly originalError?: Error,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.timestamp = new Date();
    this.errorId = this.generateErrorId();
  }

  private generateErrorId(): string {
    return `${this.category}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  toJSON(): Record<string, any> {
    return {
      errorId: this.errorId,
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      code: this.code,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      originalError: this.originalError?.message,
      context: this.context
    };
  }
}

/**
 * Custom error types for Office.js integration
 */
export class OfficeIntegrationError extends BaseValidationError {
  constructor(
    message: string,
    category: ErrorCategory = ErrorCategory.OFFICE_API,
    severity: ErrorSeverity = ErrorSeverity.HIGH,
    code?: string,
    originalError?: Error,
    context?: Record<string, any>
  ) {
    super(message, category, severity, code, originalError, context);
    this.name = 'OfficeIntegrationError';
  }
}

export class ValidationError extends BaseValidationError {
  constructor(
    message: string,
    public readonly validationStep?: string,
    originalError?: Error,
    context?: Record<string, any>
  ) {
    super(message, ErrorCategory.VALIDATION, ErrorSeverity.MEDIUM, undefined, originalError, {
      ...context,
      validationStep
    });
    this.name = 'ValidationError';
  }
}

export class ParsingError extends BaseValidationError {
  constructor(
    message: string,
    public readonly parsingStep?: string,
    originalError?: Error,
    context?: Record<string, any>
  ) {
    super(message, ErrorCategory.PARSING, ErrorSeverity.MEDIUM, undefined, originalError, {
      ...context,
      parsingStep
    });
    this.name = 'ParsingError';
  }
}

export class PermissionError extends OfficeIntegrationError {
  constructor(message: string, originalError?: Error, context?: Record<string, any>) {
    super(message, ErrorCategory.PERMISSION, ErrorSeverity.CRITICAL, 'PERMISSION_DENIED', originalError, context);
    this.name = 'PermissionError';
  }
}

export class ApiUnavailableError extends OfficeIntegrationError {
  constructor(message: string, originalError?: Error, context?: Record<string, any>) {
    super(message, ErrorCategory.OFFICE_API, ErrorSeverity.HIGH, 'API_UNAVAILABLE', originalError, context);
    this.name = 'ApiUnavailableError';
  }
}

export class NetworkError extends BaseValidationError {
  constructor(message: string, originalError?: Error, context?: Record<string, any>) {
    super(message, ErrorCategory.NETWORK, ErrorSeverity.MEDIUM, 'NETWORK_ERROR', originalError, context);
    this.name = 'NetworkError';
  }
}

export class ConfigurationError extends BaseValidationError {
  constructor(message: string, originalError?: Error, context?: Record<string, any>) {
    super(message, ErrorCategory.CONFIGURATION, ErrorSeverity.HIGH, 'CONFIG_ERROR', originalError, context);
    this.name = 'ConfigurationError';
  }
}

/**
 * Recovery strategy interface for different error types
 */
export interface RecoveryStrategy {
  canRecover(error: Error): boolean;
  recover(error: Error, context?: Record<string, any>): Promise<any>;
  getRecoveryMessage(): string;
}

/**
 * Diagnostic logger for error tracking and troubleshooting
 */
export class DiagnosticLogger {
  private static logs: Array<{
    timestamp: Date;
    level: 'error' | 'warn' | 'info' | 'debug';
    message: string;
    data?: any;
  }> = [];
  
  private static readonly MAX_LOGS = 1000;
  private static readonly LOG_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours

  static error(message: string, error?: Error, context?: Record<string, any>): void {
    const errorData = error instanceof BaseValidationError ? error.toJSON() : error?.message;
    this.log('error', message, { error: errorData, context });
    console.error(`[ValidationError] ${message}`, error, context);
  }

  static warn(message: string, data?: any): void {
    this.log('warn', message, data);
    console.warn(`[ValidationWarn] ${message}`, data);
  }

  static info(message: string, data?: any): void {
    this.log('info', message, data);
    console.info(`[ValidationInfo] ${message}`, data);
  }

  static debug(message: string, data?: any): void {
    this.log('debug', message, data);
    console.debug(`[ValidationDebug] ${message}`, data);
  }

  private static log(level: 'error' | 'warn' | 'info' | 'debug', message: string, data?: any): void {
    this.logs.push({
      timestamp: new Date(),
      level,
      message,
      data
    });

    // Cleanup old logs
    this.cleanupOldLogs();
  }

  private static cleanupOldLogs(): void {
    const now = Date.now();
    this.logs = this.logs
      .filter(log => (now - log.timestamp.getTime()) < this.LOG_RETENTION_MS)
      .slice(-this.MAX_LOGS);
  }

  static getLogs(level?: 'error' | 'warn' | 'info' | 'debug'): Array<any> {
    return level ? this.logs.filter(log => log.level === level) : [...this.logs];
  }

  static exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  static clearLogs(): void {
    this.logs = [];
  }
}

/**
 * Enhanced error handler for Office.js operations with comprehensive recovery mechanisms
 */
export class OfficeErrorHandler {
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY_MS = 1000;
  private static readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private static readonly CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds
  
  private static failureCount = 0;
  private static circuitBreakerOpen = false;
  private static circuitBreakerOpenTime = 0;
  private static recoveryStrategies: Map<string, RecoveryStrategy> = new Map();

  /**
   * Register a recovery strategy for specific error types
   */
  static registerRecoveryStrategy(errorType: string, strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(errorType, strategy);
    DiagnosticLogger.info(`Registered recovery strategy for ${errorType}`);
  }

  /**
   * Check circuit breaker status and reset if timeout has passed
   */
  private static checkCircuitBreaker(): void {
    if (this.circuitBreakerOpen) {
      const now = Date.now();
      if (now - this.circuitBreakerOpenTime > this.CIRCUIT_BREAKER_TIMEOUT) {
        this.circuitBreakerOpen = false;
        this.failureCount = 0;
        DiagnosticLogger.info('Circuit breaker reset - attempting operations again');
      }
    }
  }

  /**
   * Update circuit breaker state based on operation result
   */
  private static updateCircuitBreaker(success: boolean): void {
    if (success) {
      this.failureCount = 0;
      if (this.circuitBreakerOpen) {
        this.circuitBreakerOpen = false;
        DiagnosticLogger.info('Circuit breaker closed - operations successful');
      }
    } else {
      this.failureCount++;
      if (this.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD && !this.circuitBreakerOpen) {
        this.circuitBreakerOpen = true;
        this.circuitBreakerOpenTime = Date.now();
        DiagnosticLogger.error(`Circuit breaker opened - too many failures (${this.failureCount})`);
      }
    }
  }

  /**
   * Handle Office.js AsyncResult errors with enhanced error classification
   */
  static handleAsyncResult<T>(
    result: Office.AsyncResult<T>,
    operation: string,
    context?: Record<string, any>
  ): T {
    if (result.status === Office.AsyncResultStatus.Failed) {
      const error = result.error;
      const message = `${operation} failed: ${error?.message || 'Unknown error'}`;
      const errorContext = { ...context, operation, officeErrorCode: error?.code };
      
      const errorObj = new Error(error?.message || 'Unknown Office error');
      DiagnosticLogger.error(`Office.js operation failed: ${operation}`, errorObj, errorContext);
      
      switch (error?.code) {
        case Office.ErrorCodes.PermissionDenied:
          throw new PermissionError(message, errorObj, errorContext);
        
        case Office.ErrorCodes.InvalidApiCall:
          throw new ApiUnavailableError(message, errorObj, errorContext);
        
        case Office.ErrorCodes.ItemNotFound:
          throw new OfficeIntegrationError(message, ErrorCategory.OFFICE_API, ErrorSeverity.HIGH, 'ITEM_NOT_FOUND', errorObj, errorContext);
        
        case Office.ErrorCodes.InternalError:
          throw new OfficeIntegrationError(message, ErrorCategory.OFFICE_API, ErrorSeverity.HIGH, 'INTERNAL_ERROR', errorObj, errorContext);
        
        case Office.ErrorCodes.NetworkProblem:
          throw new NetworkError(message, errorObj, errorContext);
        
        default:
          throw new OfficeIntegrationError(message, ErrorCategory.OFFICE_API, ErrorSeverity.HIGH, error?.code?.toString(), errorObj, errorContext);
      }
    }
    
    this.updateCircuitBreaker(true);
    return result.value;
  }

  /**
   * Retry an async operation with exponential backoff and recovery strategies
   */
  static async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxAttempts: number = OfficeErrorHandler.MAX_RETRY_ATTEMPTS,
    baseDelay: number = OfficeErrorHandler.RETRY_DELAY_MS,
    context?: Record<string, any>
  ): Promise<T> {
    // Check circuit breaker
    this.checkCircuitBreaker();
    if (this.circuitBreakerOpen) {
      throw new OfficeIntegrationError(
        'Circuit breaker is open - too many recent failures',
        ErrorCategory.OFFICE_API,
        ErrorSeverity.HIGH,
        'CIRCUIT_BREAKER_OPEN',
        undefined,
        { ...context, operationName }
      );
    }

    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        DiagnosticLogger.debug(`Attempting operation: ${operationName} (attempt ${attempt}/${maxAttempts})`);
        const result = await operation();
        
        if (attempt > 1) {
          DiagnosticLogger.info(`Operation ${operationName} succeeded after ${attempt} attempts`);
        }
        
        this.updateCircuitBreaker(true);
        return result;
        
      } catch (error) {
        lastError = error as Error;
        
        DiagnosticLogger.warn(`Operation ${operationName} failed on attempt ${attempt}`, {
          error: error instanceof BaseValidationError ? error.toJSON() : (error as Error).message,
          attempt,
          maxAttempts,
          context
        });
        
        // Try recovery strategy if available
        const recoveryStrategy = this.getRecoveryStrategy(error as Error);
        if (recoveryStrategy && attempt < maxAttempts) {
          try {
            DiagnosticLogger.info(`Attempting recovery for ${operationName}: ${recoveryStrategy.getRecoveryMessage()}`);
            await recoveryStrategy.recover(error as Error, context);
            continue; // Retry after recovery
          } catch (recoveryError) {
            DiagnosticLogger.error(`Recovery failed for ${operationName}`, recoveryError as Error);
          }
        }
        
        // Don't retry certain error types
        if (error instanceof PermissionError || 
            error instanceof ApiUnavailableError ||
            error instanceof ConfigurationError) {
          this.updateCircuitBreaker(false);
          throw error;
        }
        
        if (attempt === maxAttempts) {
          break;
        }
        
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        DiagnosticLogger.debug(`Retrying ${operationName} in ${delay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    this.updateCircuitBreaker(false);
    
    const finalError = new OfficeIntegrationError(
      `Operation ${operationName} failed after ${maxAttempts} attempts`,
      ErrorCategory.OFFICE_API,
      ErrorSeverity.HIGH,
      'MAX_RETRIES_EXCEEDED',
      lastError!,
      { ...context, operationName, attempts: maxAttempts }
    );
    
    DiagnosticLogger.error(`Operation ${operationName} exhausted all retry attempts`, finalError);
    throw finalError;
  }

  /**
   * Get appropriate recovery strategy for an error
   */
  private static getRecoveryStrategy(error: Error): RecoveryStrategy | undefined {
    // Check for exact error type match
    let strategy = this.recoveryStrategies.get(error.constructor.name);
    if (strategy && strategy.canRecover(error)) {
      return strategy;
    }

    // Check for error category match
    if (error instanceof BaseValidationError) {
      strategy = this.recoveryStrategies.get(error.category);
      if (strategy && strategy.canRecover(error)) {
        return strategy;
      }
    }

    return undefined;
  }

  /**
   * Wrap Office.js async operations with comprehensive error handling
   */
  static wrapOfficeOperation<T>(
    operation: (callback: (result: Office.AsyncResult<T>) => void) => void,
    operationName: string,
    context?: Record<string, any>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      try {
        // Check circuit breaker before attempting operation
        this.checkCircuitBreaker();
        if (this.circuitBreakerOpen) {
          reject(new OfficeIntegrationError(
            'Circuit breaker is open - too many recent failures',
            ErrorCategory.OFFICE_API,
            ErrorSeverity.HIGH,
            'CIRCUIT_BREAKER_OPEN',
            undefined,
            { ...context, operationName }
          ));
          return;
        }

        DiagnosticLogger.debug(`Executing Office operation: ${operationName}`, context);
        
        operation((result) => {
          try {
            const value = OfficeErrorHandler.handleAsyncResult(result, operationName, context);
            DiagnosticLogger.debug(`Office operation completed successfully: ${operationName}`);
            resolve(value);
          } catch (error) {
            DiagnosticLogger.error(`Office operation failed: ${operationName}`, error as Error, context);
            reject(error);
          }
        });
      } catch (error) {
        const wrappedError = new OfficeIntegrationError(
          `Failed to execute ${operationName}`,
          ErrorCategory.OFFICE_API,
          ErrorSeverity.HIGH,
          'EXECUTION_ERROR',
          error as Error,
          { ...context, operationName }
        );
        DiagnosticLogger.error(`Failed to execute Office operation: ${operationName}`, wrappedError);
        reject(wrappedError);
      }
    });
  }

  /**
   * Wrap Office.js operations with retry logic
   */
  static async wrapOfficeOperationWithRetry<T>(
    operation: (callback: (result: Office.AsyncResult<T>) => void) => void,
    operationName: string,
    context?: Record<string, any>,
    maxAttempts?: number
  ): Promise<T> {
    return this.retryOperation(
      () => this.wrapOfficeOperation(operation, operationName, context),
      operationName,
      maxAttempts,
      undefined,
      context
    );
  }

  /**
   * Comprehensive Office.js context validation with detailed diagnostics
   */
  static validateOfficeContext(): void {
    const context: Record<string, any> = {};
    
    try {
      // Check if Office.js is loaded
      if (typeof Office === 'undefined') {
        throw new ApiUnavailableError('Office.js is not loaded', undefined, { 
          userAgent: navigator.userAgent,
          location: window.location.href 
        });
      }
      context.officeVersion = Office.context?.diagnostics?.version;
      
      // Check Office context
      if (!Office.context) {
        throw new ApiUnavailableError('Office context is not available', undefined, context);
      }
      context.platform = Office.context.platform;
      context.host = Office.context.host;
      
      // Check mailbox context
      if (!Office.context.mailbox) {
        throw new ApiUnavailableError('Mailbox context is not available', undefined, context);
      }
      context.mailboxVersion = Office.context.mailbox.diagnostics?.hostVersion;
      
      // Check mail item
      if (!Office.context.mailbox.item) {
        throw new ApiUnavailableError('Mail item is not available', undefined, context);
      }
      context.itemType = Office.context.mailbox.item.itemType;
      context.itemClass = Office.context.mailbox.item.itemClass;
      
      DiagnosticLogger.info('Office.js context validation successful', context);
      
    } catch (error) {
      DiagnosticLogger.error('Office.js context validation failed', error as Error, context);
      throw error;
    }
  }

  /**
   * Comprehensive permission validation with graceful degradation
   */
  static validatePermissions(): { hasFullAccess: boolean; availableFeatures: string[] } {
    const result = {
      hasFullAccess: true,
      availableFeatures: [] as string[]
    };
    
    const context: Record<string, any> = {};
    
    try {
      const item = Office.context.mailbox.item;
      if (!item) {
        throw new PermissionError('Cannot access mailbox item', undefined, context);
      }
      
      // Test basic property access
      try {
        context.itemType = item.itemType;
        context.itemClass = item.itemClass;
        result.availableFeatures.push('basic_properties');
      } catch (error) {
        DiagnosticLogger.warn('Cannot access basic item properties', { error: (error as Error).message });
        result.hasFullAccess = false;
      }
      
      // Test recipient access
      try {
        if (item.to) {
          result.availableFeatures.push('to_recipients');
        }
        if (item.cc) {
          result.availableFeatures.push('cc_recipients');
        }
        if (item.bcc) {
          result.availableFeatures.push('bcc_recipients');
        }
      } catch (error) {
        DiagnosticLogger.warn('Limited recipient access', { error: (error as Error).message });
        result.hasFullAccess = false;
      }
      
      // Test body access
      try {
        if (item.body) {
          result.availableFeatures.push('body_access');
        }
      } catch (error) {
        DiagnosticLogger.warn('Cannot access email body', { error: (error as Error).message });
        result.hasFullAccess = false;
      }
      
      DiagnosticLogger.info('Permission validation completed', {
        hasFullAccess: result.hasFullAccess,
        availableFeatures: result.availableFeatures,
        context
      });
      
      return result;
      
    } catch (error) {
      if (error instanceof PermissionError) {
        DiagnosticLogger.error('Permission validation failed', error, context);
        throw error;
      }
      
      const permissionError = new PermissionError(
        'Insufficient permissions to access mailbox', 
        error as Error, 
        context
      );
      DiagnosticLogger.error('Permission validation failed with unexpected error', permissionError);
      throw permissionError;
    }
  }

  /**
   * Enhanced error logging with diagnostic information
   */
  static logError(error: Error, context?: Record<string, any>): void {
    if (error instanceof BaseValidationError) {
      DiagnosticLogger.error(`${error.category} error occurred`, error, context);
    } else {
      DiagnosticLogger.error('Unexpected error occurred', error, context);
    }
  }

  /**
   * Handle parsing failures with comprehensive fallback strategies
   */
  static handleParsingFailure(
    operation: string,
    error: Error,
    fallbackData?: any,
    context?: Record<string, any>
  ): any {
    const parsingError = new ParsingError(
      `Parsing failed for ${operation}`,
      operation,
      error,
      context
    );

    DiagnosticLogger.error(`Parsing failure in ${operation}`, parsingError);

    // Try to provide fallback data if available
    if (fallbackData !== undefined) {
      DiagnosticLogger.info(`Using fallback data for ${operation}`, { fallbackData });
      return fallbackData;
    }

    // Return safe defaults based on operation type
    switch (operation) {
      case 'greeting_extraction':
        return { greetings: [], hasValidContent: false };
      case 'email_parsing':
        return { email: '', displayName: '', extractedNames: [], isGeneric: true };
      case 'recipient_parsing':
        return [];
      case 'name_matching':
        return [];
      default:
        return null;
    }
  }

  /**
   * Handle transient failures with exponential backoff and jitter
   */
  static async handleTransientFailure<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxAttempts: number = 3,
    baseDelay: number = 1000,
    maxDelay: number = 10000,
    context?: Record<string, any>
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain error types
        if (error instanceof PermissionError || 
            error instanceof ConfigurationError ||
            (error instanceof OfficeIntegrationError && error.code === 'PERMISSION_DENIED')) {
          throw error;
        }
        
        if (attempt === maxAttempts) {
          break;
        }
        
        // Calculate delay with exponential backoff and jitter
        const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
        const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
        const delay = exponentialDelay + jitter;
        
        DiagnosticLogger.warn(`Transient failure in ${operationName}, retrying in ${delay}ms`, {
          attempt,
          maxAttempts,
          error: (error as Error).message,
          context
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new OfficeIntegrationError(
      `Transient failure handling exhausted for ${operationName}`,
      ErrorCategory.OFFICE_API,
      ErrorSeverity.HIGH,
      'TRANSIENT_FAILURE_EXHAUSTED',
      lastError!,
      { ...context, operationName, attempts: maxAttempts }
    );
  }

  /**
   * Validate system health and return health status
   */
  static getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, { status: 'pass' | 'fail' | 'warn'; message: string; }>;
    recommendations: string[];
  } {
    const checks: Record<string, { status: 'pass' | 'fail' | 'warn'; message: string; }> = {};
    const recommendations: string[] = [];

    // Check Office.js availability
    try {
      if (typeof Office === 'undefined') {
        checks.office_js = { status: 'fail', message: 'Office.js is not loaded' };
        recommendations.push('Ensure Office.js is properly loaded');
      } else if (!Office.context) {
        checks.office_js = { status: 'fail', message: 'Office context is not available' };
        recommendations.push('Check Office.js initialization');
      } else {
        checks.office_js = { status: 'pass', message: 'Office.js is available' };
      }
    } catch (error) {
      checks.office_js = { status: 'fail', message: `Office.js check failed: ${(error as Error).message}` };
    }

    // Check mailbox availability
    try {
      if (Office?.context?.mailbox) {
        checks.mailbox = { status: 'pass', message: 'Mailbox context is available' };
      } else {
        checks.mailbox = { status: 'fail', message: 'Mailbox context is not available' };
        recommendations.push('Ensure add-in is running in Outlook');
      }
    } catch (error) {
      checks.mailbox = { status: 'fail', message: `Mailbox check failed: ${(error as Error).message}` };
    }

    // Check mail item availability
    try {
      if (Office?.context?.mailbox?.item) {
        checks.mail_item = { status: 'pass', message: 'Mail item is available' };
      } else {
        checks.mail_item = { status: 'warn', message: 'Mail item is not available (may be normal if not composing)' };
      }
    } catch (error) {
      checks.mail_item = { status: 'fail', message: `Mail item check failed: ${(error as Error).message}` };
    }

    // Check circuit breaker status
    if (this.circuitBreakerOpen) {
      checks.circuit_breaker = { status: 'warn', message: 'Circuit breaker is open due to recent failures' };
      recommendations.push('Wait for circuit breaker to reset or manually reset error state');
    } else {
      checks.circuit_breaker = { status: 'pass', message: 'Circuit breaker is closed' };
    }

    // Check failure count
    if (this.failureCount > 0) {
      checks.failure_count = { 
        status: this.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD ? 'fail' : 'warn', 
        message: `${this.failureCount} recent failures` 
      };
      if (this.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
        recommendations.push('High failure count detected, investigate system issues');
      }
    } else {
      checks.failure_count = { status: 'pass', message: 'No recent failures' };
    }

    // Determine overall status
    const failCount = Object.values(checks).filter(c => c.status === 'fail').length;
    const warnCount = Object.values(checks).filter(c => c.status === 'warn').length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (failCount === 0 && warnCount === 0) {
      status = 'healthy';
    } else if (failCount === 0) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return { status, checks, recommendations };
  }

  /**
   * Create user-friendly error message with recovery suggestions
   */
  static getUserFriendlyMessage(error: Error): { message: string; suggestions: string[] } {
    let message: string;
    let suggestions: string[] = [];
    
    if (error instanceof PermissionError) {
      message = 'The add-in needs permission to access your email.';
      suggestions = [
        'Check your Outlook add-in permissions',
        'Restart Outlook and try again',
        'Contact your administrator if using corporate email'
      ];
    } else if (error instanceof ApiUnavailableError) {
      message = 'This feature is not available in your version of Outlook.';
      suggestions = [
        'Update to the latest version of Outlook',
        'Try using Outlook on the web',
        'Check if your organization allows add-ins'
      ];
    } else if (error instanceof NetworkError) {
      message = 'Network connection issue detected.';
      suggestions = [
        'Check your internet connection',
        'Try again in a few moments',
        'Contact IT support if the problem persists'
      ];
    } else if (error instanceof ValidationError) {
      message = `Validation issue: ${error.message}`;
      suggestions = [
        'Check your email content and recipients',
        'Try typing the greeting again',
        'Disable and re-enable the add-in'
      ];
    } else if (error instanceof ParsingError) {
      message = 'Unable to analyze email content.';
      suggestions = [
        'Check if your email contains a greeting',
        'Try using a simpler greeting format',
        'Clear email formatting and try again'
      ];
    } else if (error instanceof OfficeIntegrationError) {
      switch (error.code) {
        case 'ITEM_NOT_FOUND':
          message = 'Could not access the current email.';
          suggestions = ['Refresh the email', 'Try composing a new email'];
          break;
        case 'INTERNAL_ERROR':
          message = 'An internal error occurred.';
          suggestions = ['Try again later', 'Restart Outlook'];
          break;
        case 'MAX_RETRIES_EXCEEDED':
          message = 'The operation timed out.';
          suggestions = ['Check your connection', 'Try again in a few moments'];
          break;
        case 'CIRCUIT_BREAKER_OPEN':
          message = 'Service temporarily unavailable due to repeated errors.';
          suggestions = ['Wait a moment and try again', 'Restart the add-in'];
          break;
        default:
          message = 'An unexpected error occurred.';
          suggestions = ['Try again', 'Restart Outlook if the problem persists'];
      }
    } else {
      message = 'An unexpected error occurred.';
      suggestions = ['Try again', 'Restart Outlook if the problem persists'];
    }
    
    return { message, suggestions };
  }

  /**
   * Get system diagnostic information for troubleshooting
   */
  static getSystemDiagnostics(): Record<string, any> {
    const diagnostics: Record<string, any> = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      circuitBreakerOpen: this.circuitBreakerOpen,
      failureCount: this.failureCount
    };

    try {
      if (typeof Office !== 'undefined' && Office.context) {
        diagnostics.office = {
          platform: Office.context.platform,
          host: Office.context.host?.toString(),
          version: Office.context.diagnostics?.version,
          hostVersion: Office.context.mailbox?.diagnostics?.hostVersion
        };

        if (Office.context.mailbox?.item) {
          diagnostics.mailItem = {
            itemType: Office.context.mailbox.item.itemType,
            itemClass: Office.context.mailbox.item.itemClass
          };
        }
      }
    } catch (error) {
      diagnostics.officeContextError = (error as Error).message;
    }

    return diagnostics;
  }

  /**
   * Reset circuit breaker and error counters (for testing or manual recovery)
   */
  static resetErrorState(): void {
    this.circuitBreakerOpen = false;
    this.failureCount = 0;
    this.circuitBreakerOpenTime = 0;
    DiagnosticLogger.info('Error state reset manually');
  }
}