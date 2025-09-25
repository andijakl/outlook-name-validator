# Configuration and User Preferences System

This document describes the configuration and user preferences system for the Outlook Name Validator extension.

## Overview

The configuration system provides a centralized way to manage validation settings and user preferences, with persistent storage using the Office.js roaming settings API.

## Components

### ConfigurationManager

The `ConfigurationManager` class is a singleton that handles:
- Loading and saving configuration settings
- Managing user preferences
- Validating configuration data
- Providing default values

#### Key Features

- **Singleton Pattern**: Ensures only one instance exists throughout the application
- **Persistent Storage**: Uses Office.js roaming settings for cross-device synchronization
- **Data Validation**: Validates all configuration changes before saving
- **Default Values**: Provides sensible defaults for all settings
- **Error Handling**: Graceful degradation when storage is unavailable

#### Usage

```typescript
import { ConfigurationManager } from './configuration-manager';

// Get singleton instance
const configManager = ConfigurationManager.getInstance();

// Initialize (loads saved settings)
await configManager.initialize();

// Get current configuration
const config = configManager.getConfig();
const preferences = configManager.getPreferences();

// Update settings
await configManager.updateConfig({
  minimumConfidenceThreshold: 0.8,
  enableFuzzyMatching: false
});

await configManager.updatePreferences({
  showSuccessNotifications: true,
  warningDisplayDuration: 8000
});

// Reset to defaults
await configManager.resetConfig();
await configManager.resetPreferences();
```

### SettingsUI

The `SettingsUI` class provides a user interface for modifying configuration settings.

#### Features

- **Interactive Form**: Sliders, checkboxes, and text inputs for all settings
- **Real-time Validation**: Validates input as user types
- **Pattern Management**: Add/remove greeting patterns dynamically
- **Status Messages**: Success/error feedback for user actions
- **Responsive Design**: Works on different screen sizes

#### Usage

```typescript
import { SettingsUI } from './settings-ui';

const settingsUI = new SettingsUI();
await settingsUI.initialize('settings-container');
```

## Configuration Options

### ValidationConfig

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enabledGreetingPatterns` | `string[]` | Common patterns | Regex patterns for greeting recognition |
| `minimumConfidenceThreshold` | `number` | 0.7 | Minimum confidence for matches (0-1) |
| `enableFuzzyMatching` | `boolean` | true | Enable fuzzy matching for misspellings |
| `excludeGenericEmails` | `boolean` | true | Skip validation for generic emails |

### UserPreferences

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `showSuccessNotifications` | `boolean` | false | Show notifications when validation passes |
| `autoCorrectSuggestions` | `boolean` | true | Automatically suggest corrections |
| `warningDisplayDuration` | `number` | 5000 | Duration to display warnings (ms) |

## Default Greeting Patterns

The system includes these default greeting patterns:

- `Hi\\s+([A-Za-z]+)` - Matches "Hi John"
- `Hello\\s+([A-Za-z]+)` - Matches "Hello Jane"
- `Dear\\s+([A-Za-z]+)` - Matches "Dear Bob"
- `Hey\\s+([A-Za-z]+)` - Matches "Hey Alice"
- `Good\\s+morning\\s+([A-Za-z]+)` - Matches "Good morning Tom"
- `Good\\s+afternoon\\s+([A-Za-z]+)` - Matches "Good afternoon Sarah"
- `Good\\s+evening\\s+([A-Za-z]+)` - Matches "Good evening Mike"

## Storage

Settings are stored using the Office.js roaming settings API, which provides:
- Cross-device synchronization
- Automatic backup and restore
- User-specific storage
- Secure access control

### Storage Keys

- `validationConfig` - Stores ValidationConfig object
- `userPreferences` - Stores UserPreferences object

## Error Handling

The system handles various error scenarios:

### Storage Errors
- Office.js API unavailable
- Storage quota exceeded
- Network connectivity issues
- Permission denied

### Validation Errors
- Invalid configuration values
- Malformed regex patterns
- Out-of-range numeric values
- Invalid data types

### Recovery Strategies
- Fallback to default values
- Graceful degradation
- User notification of issues
- Retry mechanisms for transient failures

## Testing

The configuration system includes comprehensive tests:

### Unit Tests
- Configuration validation
- Preference management
- Error handling
- Default value verification

### Integration Tests
- Office.js API integration
- Settings UI interaction
- End-to-end workflows
- Cross-component communication

### Running Tests

```bash
# Run configuration tests
npm run test

# Run integration tests
npm run test:integration

# Run all tests
npm run test:all
```

## Best Practices

### Configuration Updates
- Always validate before saving
- Use partial updates to preserve other settings
- Handle errors gracefully
- Provide user feedback

### UI Design
- Use appropriate input types
- Provide clear labels and descriptions
- Show validation errors immediately
- Offer reset to defaults option

### Performance
- Initialize configuration manager once
- Cache frequently accessed values
- Use debounced validation for UI inputs
- Minimize storage operations

## Troubleshooting

### Common Issues

1. **Settings not persisting**
   - Check Office.js API availability
   - Verify user permissions
   - Check storage quota

2. **Validation errors**
   - Verify regex pattern syntax
   - Check numeric ranges
   - Ensure required fields are present

3. **UI not responding**
   - Check container element exists
   - Verify event listeners are attached
   - Check for JavaScript errors

### Debug Information

Enable debug logging by setting:
```typescript
console.log('Configuration debug info:', {
  config: configManager.getConfig(),
  preferences: configManager.getPreferences(),
  isInitialized: configManager.isInitialized
});
```

## Future Enhancements

Potential improvements for the configuration system:

- Import/export settings
- Configuration profiles
- Advanced pattern editor
- Real-time pattern testing
- Configuration validation UI
- Backup and restore functionality
- Multi-language support
- Accessibility improvements