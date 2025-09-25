/**
 * Core data models and interfaces for the Outlook Name Validator extension
 */

/**
 * Represents a greeting match found in email content
 */
export interface GreetingMatch {
  /** The full matched greeting text (e.g., "Hi John") */
  fullMatch: string;
  /** The extracted name from the greeting (e.g., "John") */
  extractedName: string;
  /** Position of the match in the email content */
  position: number;
  /** Confidence score of the extraction (0-1) */
  confidence: number;
}

/**
 * Represents a parsed recipient from email addresses
 */
export interface ParsedRecipient {
  /** The full email address */
  email: string;
  /** Display name if available from email client */
  displayName?: string;
  /** Array of extracted name components from email address */
  extractedNames: string[];
  /** Whether this is a generic email address (info@, support@, etc.) */
  isGeneric: boolean;
}

/**
 * Result of name validation comparing greeting names with recipients
 */
export interface ValidationResult {
  /** The name found in the greeting */
  greetingName: string;
  /** Whether the name matches any recipient */
  isValid: boolean;
  /** Suggested recipient if mismatch detected */
  suggestedRecipient?: ParsedRecipient;
  /** Confidence score of the validation (0-1) */
  confidence: number;
}

/**
 * Configuration settings for validation behavior
 */
export interface ValidationConfig {
  /** Array of greeting patterns to recognize */
  enabledGreetingPatterns: string[];
  /** Minimum confidence threshold for matches (0-1) */
  minimumConfidenceThreshold: number;
  /** Whether to enable fuzzy matching for misspellings */
  enableFuzzyMatching: boolean;
  /** Whether to exclude generic emails from validation */
  excludeGenericEmails: boolean;
  /** Language for greeting detection ('en', 'de', 'auto') */
  language: 'en' | 'de' | 'auto';
}

/**
 * User preferences for extension behavior
 */
export interface UserPreferences {
  /** Whether to show notifications when validation passes */
  showSuccessNotifications: boolean;
  /** Whether to automatically suggest corrections */
  autoCorrectSuggestions: boolean;
  /** Duration to display warnings in milliseconds */
  warningDisplayDuration: number;
}

/**
 * Current validation state tracking
 */
export interface ValidationState {
  /** Current validation results if any */
  currentValidation?: ValidationResult[];
  /** Timestamp of last validation */
  lastValidationTime: Date;
  /** Whether validation is currently enabled */
  isEnabled: boolean;
}

/**
 * Parsed email content structure
 */
export interface ParsedContent {
  /** Array of greeting matches found */
  greetings: GreetingMatch[];
  /** Whether the content contains valid parseable content */
  hasValidContent: boolean;
}

/**
 * Match result for name comparison
 */
export interface MatchResult {
  /** The recipient that matched */
  recipient: ParsedRecipient;
  /** Type of match found */
  matchType: 'exact' | 'partial' | 'fuzzy' | 'none';
  /** Confidence score of the match (0-1) */
  confidence: number;
}

/**
 * Current validation status for UI display
 */
export interface ValidationStatus {
  /** Whether validation is currently in progress */
  isValidating: boolean;
  /** Whether there are active warnings */
  hasWarnings: boolean;
  /** Number of warnings detected */
  warningCount: number;
}