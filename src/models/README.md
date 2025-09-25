# Data Models and Interfaces

This directory contains the core data models, interfaces, and validation utilities for the Outlook Name Validator extension.

## Files

### `interfaces.ts`
Defines all TypeScript interfaces used throughout the application:
- `GreetingMatch` - Represents a greeting found in email content
- `ParsedRecipient` - Represents a parsed email recipient
- `ValidationResult` - Result of name validation
- `ValidationConfig` - Configuration settings for validation
- `UserPreferences` - User preference settings
- `ValidationState` - Current validation state tracking
- `ParsedContent` - Parsed email content structure
- `MatchResult` - Result of name matching comparison
- `ValidationStatus` - Current validation status for UI

### `defaults.ts`
Contains default configurations and constants:
- `DEFAULT_VALIDATION_CONFIG` - Default validation settings
- `DEFAULT_USER_PREFERENCES` - Default user preferences
- `INITIAL_VALIDATION_STATE` - Initial validation state
- `GENERIC_EMAIL_PREFIXES` - Common generic email prefixes to exclude
- `EMAIL_SEPARATORS` - Common email separators for parsing
- `COMMON_TITLES` - Common titles/honorifics to filter out

### `validators.ts`
Provides validation utilities and type guards:
- Type guard functions for all interfaces (e.g., `isValidGreetingMatch`)
- Safe constructor functions (e.g., `createGreetingMatch`)
- Input validation and error handling

### `index.ts`
Main export file that re-exports all models, defaults, and validators.

## Testing

The `__tests__` directory contains comprehensive unit tests for all data models:
- `interfaces.test.ts` - Tests for interface validation and type safety
- `defaults.test.ts` - Tests for default configurations
- `run-tests.ts` - Test runner that executes all tests

### Running Tests

```bash
npm test
```

This will compile the TypeScript test files and run all unit tests, providing detailed output about test results.

## Usage

```typescript
import { 
  GreetingMatch, 
  ValidationConfig, 
  DEFAULT_VALIDATION_CONFIG,
  createGreetingMatch,
  isValidGreetingMatch 
} from './models';

// Create a greeting match
const greeting = createGreetingMatch('Hi John', 'John', 0, 0.95);

// Validate data
if (isValidGreetingMatch(greeting)) {
  console.log('Valid greeting match');
}

// Use default configuration
const config = { ...DEFAULT_VALIDATION_CONFIG };
```

## Requirements Satisfied

This implementation satisfies the following requirements:
- **1.1**: Data structures for greeting extraction and name matching
- **2.1**: Models for recipient parsing and name components
- **4.1**: Configuration models for user preferences and validation settings

All interfaces include proper TypeScript typing, validation utilities, and comprehensive test coverage to ensure type safety and data integrity throughout the application.