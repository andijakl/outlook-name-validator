/**
 * Test Configuration for Comprehensive Test Suite
 * 
 * Centralized configuration for all test categories
 */

export interface TestConfig {
  performance: PerformanceConfig;
  accessibility: AccessibilityConfig;
  compatibility: CompatibilityConfig;
  regression: RegressionConfig;
  endToEnd: EndToEndConfig;
}

export interface PerformanceConfig {
  timeouts: {
    emailParsing: number;
    recipientParsing: number;
    nameMatching: number;
    endToEndValidation: number;
  };
  thresholds: {
    memoryUsage: number; // MB
    concurrentValidations: number;
    largeEmailSize: number; // characters
  };
  iterations: {
    benchmark: number;
    stress: number;
    memory: number;
  };
}

export interface AccessibilityConfig {
  wcag: {
    level: 'A' | 'AA' | 'AAA';
    contrastRatio: number;
    minTouchTarget: number; // pixels
  };
  screenReader: {
    announcements: boolean;
    descriptions: boolean;
    landmarks: boolean;
  };
  keyboard: {
    navigation: boolean;
    shortcuts: boolean;
    focusManagement: boolean;
  };
}

export interface CompatibilityConfig {
  outlookVersions: string[];
  officeJsVersions: string[];
  platforms: string[];
  browsers: string[];
}

export interface RegressionConfig {
  knownIssues: KnownIssue[];
  performanceBaselines: PerformanceBaseline[];
  criticalPaths: string[];
}

export interface EndToEndConfig {
  scenarios: string[];
  dataVariations: number;
  userWorkflows: string[];
}

export interface KnownIssue {
  id: string;
  description: string;
  fixVersion: string;
  testCase: string;
}

export interface PerformanceBaseline {
  operation: string;
  baseline: number; // milliseconds
  tolerance: number; // percentage
}

export const DEFAULT_TEST_CONFIG: TestConfig = {
  performance: {
    timeouts: {
      emailParsing: 100,
      recipientParsing: 50,
      nameMatching: 30,
      endToEndValidation: 500
    },
    thresholds: {
      memoryUsage: 50, // 50MB max
      concurrentValidations: 10,
      largeEmailSize: 100000 // 100k characters
    },
    iterations: {
      benchmark: 100,
      stress: 1000,
      memory: 50
    }
  },
  
  accessibility: {
    wcag: {
      level: 'AA',
      contrastRatio: 4.5,
      minTouchTarget: 44
    },
    screenReader: {
      announcements: true,
      descriptions: true,
      landmarks: true
    },
    keyboard: {
      navigation: true,
      shortcuts: true,
      focusManagement: true
    }
  },
  
  compatibility: {
    outlookVersions: [
      '16.0.17830.20138', // Outlook 2025.x
      '16.0.17328.20068', // Outlook 2024.x
      '16.0.16827.20166'  // Outlook 2023.x
    ],
    officeJsVersions: [
      '1.13',
      '1.12',
      '1.11'
    ],
    platforms: [
      'Windows',
      'Mac',
      'Web'
    ],
    browsers: [
      'Chrome',
      'Edge',
      'Firefox',
      'Safari'
    ]
  },
  
  regression: {
    knownIssues: [
      {
        id: 'CASE-001',
        description: 'Case sensitivity not working correctly',
        fixVersion: '1.0.1',
        testCase: 'testCaseSensitivityRegression'
      },
      {
        id: 'MULTI-001',
        description: 'Multiple names in greetings not parsed',
        fixVersion: '1.0.2',
        testCase: 'testMultipleNamesParsingRegression'
      },
      {
        id: 'GENERIC-001',
        description: 'Generic emails being validated',
        fixVersion: '1.0.3',
        testCase: 'testGenericEmailDetectionRegression'
      },
      {
        id: 'EMPTY-001',
        description: 'Empty content causing crashes',
        fixVersion: '1.0.4',
        testCase: 'testEmptyContentHandlingRegression'
      },
      {
        id: 'SPECIAL-001',
        description: 'Special characters causing parsing errors',
        fixVersion: '1.0.5',
        testCase: 'testSpecialCharactersRegression'
      }
    ],
    performanceBaselines: [
      {
        operation: 'emailParsing',
        baseline: 50,
        tolerance: 20
      },
      {
        operation: 'recipientParsing',
        baseline: 25,
        tolerance: 15
      },
      {
        operation: 'nameMatching',
        baseline: 15,
        tolerance: 10
      },
      {
        operation: 'endToEndValidation',
        baseline: 200,
        tolerance: 25
      }
    ],
    criticalPaths: [
      'email-composition-flow',
      'recipient-change-flow',
      'content-change-flow',
      'notification-display-flow',
      'settings-update-flow'
    ]
  },
  
  endToEnd: {
    scenarios: [
      'single-recipient-match',
      'single-recipient-mismatch',
      'multiple-recipients-match',
      'multiple-recipients-partial-match',
      'case-insensitive-matching',
      'generic-email-handling',
      'no-greeting-handling',
      'special-characters-handling',
      'html-content-handling',
      'large-email-handling'
    ],
    dataVariations: 50,
    userWorkflows: [
      'compose-new-email',
      'reply-to-email',
      'forward-email',
      'add-recipients-dynamically',
      'modify-content-dynamically',
      'dismiss-warnings',
      'accept-suggestions',
      'configure-settings'
    ]
  }
};

/**
 * Get test configuration with optional overrides
 */
export function getTestConfig(overrides?: Partial<TestConfig>): TestConfig {
  if (!overrides) {
    return DEFAULT_TEST_CONFIG;
  }

  return {
    performance: { ...DEFAULT_TEST_CONFIG.performance, ...overrides.performance },
    accessibility: { ...DEFAULT_TEST_CONFIG.accessibility, ...overrides.accessibility },
    compatibility: { ...DEFAULT_TEST_CONFIG.compatibility, ...overrides.compatibility },
    regression: { ...DEFAULT_TEST_CONFIG.regression, ...overrides.regression },
    endToEnd: { ...DEFAULT_TEST_CONFIG.endToEnd, ...overrides.endToEnd }
  };
}

/**
 * Validate test configuration
 */
export function validateTestConfig(config: TestConfig): string[] {
  const errors: string[] = [];

  // Validate performance config
  if (config.performance.timeouts.emailParsing <= 0) {
    errors.push('Performance timeout for email parsing must be positive');
  }

  if (config.performance.thresholds.memoryUsage <= 0) {
    errors.push('Memory usage threshold must be positive');
  }

  // Validate accessibility config
  if (config.accessibility.wcag.contrastRatio < 3) {
    errors.push('WCAG contrast ratio must be at least 3:1');
  }

  if (config.accessibility.wcag.minTouchTarget < 24) {
    errors.push('Minimum touch target size should be at least 24px');
  }

  // Validate compatibility config
  if (config.compatibility.outlookVersions.length === 0) {
    errors.push('At least one Outlook version must be specified');
  }

  if (config.compatibility.officeJsVersions.length === 0) {
    errors.push('At least one Office.js version must be specified');
  }

  // Validate regression config
  for (const baseline of config.regression.performanceBaselines) {
    if (baseline.baseline <= 0) {
      errors.push(`Performance baseline for ${baseline.operation} must be positive`);
    }
    if (baseline.tolerance < 0 || baseline.tolerance > 100) {
      errors.push(`Performance tolerance for ${baseline.operation} must be between 0 and 100`);
    }
  }

  return errors;
}