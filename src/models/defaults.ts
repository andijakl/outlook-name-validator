/**
 * Default configurations and constants for the Outlook Name Validator
 */

import { ValidationConfig, UserPreferences, ValidationState } from './interfaces';

/**
 * Default validation configuration
 */
export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  enabledGreetingPatterns: [
    'hi\\s+([a-zA-Z]+)',
    'hello\\s+([a-zA-Z]+)',
    'dear\\s+([a-zA-Z]+)',
    'hey\\s+([a-zA-Z]+)',
    'good\\s+morning\\s+([a-zA-Z]+)',
    'good\\s+afternoon\\s+([a-zA-Z]+)',
    'good\\s+evening\\s+([a-zA-Z]+)'
  ],
  minimumConfidenceThreshold: 0.7,
  enableFuzzyMatching: true,
  excludeGenericEmails: true,
  language: 'auto'
};

/**
 * Default user preferences
 */
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  showSuccessNotifications: false,
  autoCorrectSuggestions: true,
  warningDisplayDuration: 5000 // 5 seconds
};

/**
 * Initial validation state
 */
export const INITIAL_VALIDATION_STATE: ValidationState = {
  currentValidation: undefined,
  lastValidationTime: new Date(),
  isEnabled: true
};

/**
 * Common generic email prefixes to exclude from validation
 */
export const GENERIC_EMAIL_PREFIXES = [
  'info',
  'support',
  'help',
  'contact',
  'admin',
  'noreply',
  'no-reply',
  'donotreply',
  'do-not-reply',
  'sales',
  'marketing',
  'hr',
  'jobs',
  'careers'
];

/**
 * Common email domain separators for name extraction
 */
export const EMAIL_SEPARATORS = ['.', '_', '-', '+'];

/**
 * Common titles and honorifics to filter out from names
 */
export const COMMON_TITLES = [
  'mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'professor',
  'sir', 'madam', 'lord', 'lady', 'hon', 'honorable'
];