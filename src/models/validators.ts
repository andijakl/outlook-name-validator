/**
 * Validation utilities for data models and type safety
 */

import { 
  GreetingMatch, 
  ParsedRecipient, 
  ValidationResult, 
  ValidationConfig, 
  UserPreferences, 
  ValidationState,
  ParsedContent,
  MatchResult,
  ValidationStatus
} from './interfaces';

/**
 * Validates a GreetingMatch object
 */
export function isValidGreetingMatch(obj: any): obj is GreetingMatch {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.fullMatch === 'string' &&
    typeof obj.extractedName === 'string' &&
    typeof obj.position === 'number' &&
    typeof obj.confidence === 'number' &&
    obj.confidence >= 0 &&
    obj.confidence <= 1 &&
    obj.position >= 0
  );
}

/**
 * Validates a ParsedRecipient object
 */
export function isValidParsedRecipient(obj: any): obj is ParsedRecipient {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.email === 'string' &&
    obj.email.includes('@') &&
    (obj.displayName === undefined || typeof obj.displayName === 'string') &&
    Array.isArray(obj.extractedNames) &&
    obj.extractedNames.every((name: any) => typeof name === 'string') &&
    typeof obj.isGeneric === 'boolean'
  );
}

/**
 * Validates a ValidationResult object
 */
export function isValidValidationResult(obj: any): obj is ValidationResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.greetingName === 'string' &&
    typeof obj.isValid === 'boolean' &&
    (obj.suggestedRecipient === undefined || isValidParsedRecipient(obj.suggestedRecipient)) &&
    typeof obj.confidence === 'number' &&
    obj.confidence >= 0 &&
    obj.confidence <= 1
  );
}

/**
 * Validates a ValidationConfig object
 */
export function isValidValidationConfig(obj: any): obj is ValidationConfig {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    Array.isArray(obj.enabledGreetingPatterns) &&
    obj.enabledGreetingPatterns.every((pattern: any) => typeof pattern === 'string') &&
    typeof obj.minimumConfidenceThreshold === 'number' &&
    obj.minimumConfidenceThreshold >= 0 &&
    obj.minimumConfidenceThreshold <= 1 &&
    typeof obj.enableFuzzyMatching === 'boolean' &&
    typeof obj.excludeGenericEmails === 'boolean'
  );
}

/**
 * Validates a UserPreferences object
 */
export function isValidUserPreferences(obj: any): obj is UserPreferences {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.showSuccessNotifications === 'boolean' &&
    typeof obj.autoCorrectSuggestions === 'boolean' &&
    typeof obj.warningDisplayDuration === 'number' &&
    obj.warningDisplayDuration > 0
  );
}

/**
 * Validates a ValidationState object
 */
export function isValidValidationState(obj: any): obj is ValidationState {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (obj.currentValidation === undefined || 
     (Array.isArray(obj.currentValidation) && 
      obj.currentValidation.every(isValidValidationResult))) &&
    obj.lastValidationTime instanceof Date &&
    typeof obj.isEnabled === 'boolean'
  );
}

/**
 * Validates a ParsedContent object
 */
export function isValidParsedContent(obj: any): obj is ParsedContent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    Array.isArray(obj.greetings) &&
    obj.greetings.every(isValidGreetingMatch) &&
    typeof obj.hasValidContent === 'boolean'
  );
}

/**
 * Validates a MatchResult object
 */
export function isValidMatchResult(obj: any): obj is MatchResult {
  const validMatchTypes = ['exact', 'partial', 'fuzzy', 'none'];
  return (
    typeof obj === 'object' &&
    obj !== null &&
    isValidParsedRecipient(obj.recipient) &&
    validMatchTypes.includes(obj.matchType) &&
    typeof obj.confidence === 'number' &&
    obj.confidence >= 0 &&
    obj.confidence <= 1
  );
}

/**
 * Validates a ValidationStatus object
 */
export function isValidValidationStatus(obj: any): obj is ValidationStatus {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.isValidating === 'boolean' &&
    typeof obj.hasWarnings === 'boolean' &&
    typeof obj.warningCount === 'number' &&
    obj.warningCount >= 0
  );
}

/**
 * Creates a safe GreetingMatch with validation
 */
export function createGreetingMatch(
  fullMatch: string,
  extractedName: string,
  position: number,
  confidence: number
): GreetingMatch {
  if (confidence < 0 || confidence > 1) {
    throw new Error('Confidence must be between 0 and 1');
  }
  if (position < 0) {
    throw new Error('Position must be non-negative');
  }
  
  return {
    fullMatch: fullMatch.trim(),
    extractedName: extractedName.trim(),
    position,
    confidence
  };
}

/**
 * Creates a safe ParsedRecipient with validation
 */
export function createParsedRecipient(
  email: string,
  extractedNames: string[],
  isGeneric: boolean,
  displayName?: string
): ParsedRecipient {
  if (!email.includes('@')) {
    throw new Error('Invalid email format');
  }
  
  return {
    email: email.toLowerCase().trim(),
    displayName: displayName?.trim(),
    extractedNames: extractedNames.map(name => name.trim().toLowerCase()),
    isGeneric
  };
}

/**
 * Creates a safe ValidationResult with validation
 */
export function createValidationResult(
  greetingName: string,
  isValid: boolean,
  confidence: number,
  suggestedRecipient?: ParsedRecipient
): ValidationResult {
  if (confidence < 0 || confidence > 1) {
    throw new Error('Confidence must be between 0 and 1');
  }
  
  return {
    greetingName: greetingName.trim(),
    isValid,
    confidence,
    suggestedRecipient
  };
}