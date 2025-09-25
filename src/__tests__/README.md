# Comprehensive Test Suite for Outlook Name Validator

This directory contains a comprehensive test suite that covers all aspects of the Outlook Name Validator add-in, ensuring quality, performance, accessibility, and compatibility across different environments.

## Overview

The comprehensive test suite is designed to validate all requirements (1.1 through 5.5) through multiple testing approaches:

- **End-to-End Tests**: Complete user workflows from email composition to validation results
- **Test Data Sets**: Comprehensive test data covering various email patterns and edge cases
- **Outlook Version Compatibility**: Tests across different Outlook client versions
- **Accessibility Tests**: UI components tested for accessibility compliance
- **Performance Benchmarks**: Performance characteristics and optimization validation
- **Regression Tests**: Prevention of previously fixed issues

## Test Structure

```
src/__tests__/
├── comprehensive-test-suite.ts     # Main test orchestrator
├── test-runner.ts                  # Test execution utilities
├── test-config.ts                  # Centralized test configuration
├── run-comprehensive-tests.ts      # Main execution script
├── README.md                       # This documentation
├── e2e/
│   └── end-to-end-tests.ts        # Complete workflow tests
├── data/
│   └── test-data-sets.ts          # Test data and scenarios
├── compatibility/
│   └── outlook-version-tests.ts   # Version compatibility tests
├── accessibility/
│   └── accessibility-tests.ts     # Accessibility compliance tests
├── performance/
│   └── performance-benchmarks.ts  # Performance and optimization tests
└── regression/
    └── regression-tests.ts         # Regression prevention tests
```

## Running Tests

### All Tests
```bash
npm run test:comprehensive
```

### Specific Test Categories
```bash
npm run test:e2e           # End-to-end tests only
npm run test:performance   # Performance benchmarks only
npm run test:accessibility # Accessibility tests only
npm run test:compatibility # Compatibility tests only
npm run test:regression    # Regression tests only
```

### Command Line Options
```bash
# Run specific category
node run-comprehensive-tests.js --category=endToEnd

# Show help
node run-comprehensive-tests.js --help
```

## Test Categories

### 1. End-to-End Tests (`e2e/`)

Tests complete user workflows covering all requirements:

- **Single recipient scenarios** (Requirements 1.1, 1.2, 1.3, 1.4, 1.5)
- **Multiple recipient scenarios** (Requirements 2.1, 2.2, 2.3, 2.4, 2.5)
- **Outlook integration** (Requirements 3.1, 3.2, 3.3)
- **User interface interactions** (Requirements 4.1, 4.2, 4.3, 4.4)
- **Edge case handling** (Requirements 5.1, 5.2, 5.3, 5.4, 5.5)

**Key Test Scenarios:**
- Complete workflow: Single recipient with matching name
- Complete workflow: Single recipient with mismatched name
- Complete workflow: Multiple recipients with partial matches
- Complete workflow: Case insensitive name matching
- Complete workflow: Warning display and user interaction
- Complete workflow: Mismatch highlighting
- Complete workflow: First and last name flexibility
- Complete workflow: Multiple name parts in email
- Complete workflow: Email separators parsing
- Complete workflow: Multiple names in greeting
- Complete workflow: Outlook compose window integration
- Complete workflow: Dynamic recipient validation
- Complete workflow: Dynamic content validation

### 2. Test Data Sets (`data/`)

Comprehensive test data covering various patterns and edge cases:

- **Greeting Patterns**: Basic greetings, titles/honorifics, multiple names, case variations
- **Email Address Patterns**: Standard formats, separators, multiple name parts, generic addresses
- **Name Matching Scenarios**: Exact matches, partial matches, fuzzy matches, no matches
- **Complete Email Scenarios**: Real-world email examples with expected validation results
- **Performance Test Scenarios**: Varying complexity for performance testing
- **Edge Case Scenarios**: Empty content, special characters, HTML content, very long names

### 3. Outlook Version Compatibility (`compatibility/`)

Tests compatibility across different Outlook environments:

- **Outlook Desktop 2025.x**: Latest desktop client compatibility
- **Outlook Web App**: Web-based client compatibility
- **Office.js API Versions**: Different API version support (1.11, 1.12, 1.13)
- **Event Handling**: Cross-version event compatibility
- **Settings Storage**: Roaming settings compatibility
- **Manifest Compatibility**: Add-in manifest requirements
- **Performance Across Versions**: Performance consistency

### 4. Accessibility Tests (`accessibility/`)

UI components tested for accessibility compliance:

- **Notification System**: ARIA attributes, screen reader compatibility
- **Settings UI**: Form accessibility, keyboard navigation
- **Keyboard Navigation**: Tab order, focus management, keyboard shortcuts
- **Screen Reader Compatibility**: Announcements, descriptions, landmarks
- **High Contrast Mode**: Visual accessibility in high contrast
- **Focus Management**: Proper focus trapping and restoration
- **ARIA Attributes**: Comprehensive ARIA implementation
- **Color Contrast**: WCAG AA compliance (4.5:1 ratio)
- **Text Scaling**: Support for 200% zoom

### 5. Performance Benchmarks (`performance/`)

Performance characteristics and optimization validation:

- **Email Content Parsing**: Performance across different content sizes
- **Recipient Parsing**: Scalability with varying recipient counts
- **Name Matching**: Efficiency with large recipient lists
- **End-to-End Validation**: Complete workflow performance
- **Memory Usage**: Memory consumption and leak detection
- **Concurrent Validation**: Performance under concurrent load
- **Large Email Handling**: Performance with very large emails
- **Caching Performance**: Benefits of caching mechanisms
- **Debounced Validation**: Efficiency of debouncing

**Performance Thresholds:**
- Email parsing: < 100ms for typical emails
- Recipient parsing: < 2ms per recipient
- Name matching: < 0.5ms per recipient
- End-to-end validation: < 500ms total
- Memory usage: < 50MB for normal operations
- Large email processing: < 5 seconds for 100k+ characters

### 6. Regression Tests (`regression/`)

Prevention of previously fixed issues:

- **Historical Bug Fixes**: Tests for all previously identified and fixed bugs
- **Case Sensitivity**: Proper case-insensitive matching
- **Multiple Names Parsing**: Correct parsing of multiple names in greetings
- **Generic Email Detection**: Proper identification of generic email addresses
- **Empty Content Handling**: Graceful handling of empty or whitespace-only content
- **Special Characters**: Unicode and special character support
- **Memory Leaks**: Prevention of memory leaks in repeated operations
- **Event Handler Cleanup**: Proper cleanup of event handlers
- **Notification Display**: Correct notification rendering and interaction
- **Configuration Persistence**: Settings persistence across sessions
- **Performance Degradation**: Prevention of performance regressions
- **HTML Content Parsing**: Proper handling of HTML email content
- **Unicode Name Handling**: Support for international names
- **Long Email Processing**: Handling of very long email content
- **Concurrent Validation**: Race condition prevention
- **Office.js Error Handling**: Graceful handling of API errors

## Test Configuration

The test suite uses a centralized configuration system (`test-config.ts`) that allows customization of:

- **Performance Thresholds**: Timeout values and performance limits
- **Accessibility Standards**: WCAG compliance levels and requirements
- **Compatibility Matrix**: Supported Outlook versions and platforms
- **Regression Baselines**: Performance baselines and known issue tracking
- **Test Data Variations**: Number of test scenarios and data variations

## Test Execution Flow

1. **Setup**: Initialize test environment with Office.js and DOM mocks
2. **Category Selection**: Run all tests or specific category
3. **Test Execution**: Run tests with proper setup/teardown
4. **Result Collection**: Gather test results and performance metrics
5. **Report Generation**: Create comprehensive test reports
6. **Cleanup**: Clean up test environment and temporary files

## Test Results and Reporting

The test suite provides detailed reporting including:

- **Overall Results**: Total tests, pass/fail counts, success rate
- **Category Breakdown**: Results by test category
- **Performance Metrics**: Timing and resource usage data
- **Accessibility Compliance**: WCAG compliance status
- **Compatibility Matrix**: Support across different environments
- **Regression Status**: Status of previously fixed issues

## Continuous Integration

The comprehensive test suite is designed to integrate with CI/CD pipelines:

- **Automated Execution**: Can be run automatically on code changes
- **Exit Codes**: Proper exit codes for CI/CD integration
- **Parallel Execution**: Support for running test categories in parallel
- **Report Formats**: Machine-readable output for CI/CD systems
- **Performance Tracking**: Historical performance trend tracking

## Best Practices

When adding new tests:

1. **Follow the existing structure** and naming conventions
2. **Add tests to appropriate categories** based on what they validate
3. **Include both positive and negative test cases**
4. **Use the centralized test data sets** when possible
5. **Document any new test scenarios** in this README
6. **Ensure tests are deterministic** and don't rely on external dependencies
7. **Include performance considerations** for new functionality
8. **Add regression tests** for any bug fixes

## Troubleshooting

Common issues and solutions:

- **TypeScript compilation errors**: Ensure all dependencies are properly imported
- **Office.js mock issues**: Check that global Office object is properly set up
- **DOM mock issues**: Verify that document and window objects are mocked correctly
- **Performance test failures**: Check if system is under load during testing
- **Accessibility test failures**: Ensure proper ARIA attributes and semantic HTML
- **Compatibility test failures**: Verify Office.js API version requirements

## Contributing

When contributing to the test suite:

1. Run the full test suite before submitting changes
2. Add tests for any new functionality
3. Update test data sets if adding new scenarios
4. Document any changes to test configuration
5. Ensure all test categories pass
6. Update this README if adding new test categories or significant changes