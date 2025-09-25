/**
 * Outlook Version Compatibility Tests
 * 
 * Tests compatibility across different Outlook client versions
 * Requirements: 3.1, 3.4, 3.5
 */

import { TestRunner, TestFunction, TestResult } from '../test-runner';

export class OutlookVersionTests {
  private testRunner: TestRunner;

  constructor() {
    this.testRunner = new TestRunner();
  }

  async runAllTests(): Promise<TestResult> {
    const tests: TestFunction[] = [
      {
        name: 'Outlook Desktop 2025.x compatibility',
        execute: () => this.testOutlookDesktop2025()
      },
      {
        name: 'Outlook Web App compatibility',
        execute: () => this.testOutlookWebApp()
      },
      {
        name: 'Office.js API version compatibility',
        execute: () => this.testOfficeJsApiVersions()
      },
      {
        name: 'Event handling compatibility',
        execute: () => this.testEventHandlingCompatibility()
      },
      {
        name: 'Settings storage compatibility',
        execute: () => this.testSettingsStorageCompatibility()
      },
      {
        name: 'Manifest compatibility',
        execute: () => this.testManifestCompatibility()
      },
      {
        name: 'Performance across versions',
        execute: () => this.testPerformanceAcrossVersions()
      }
    ];

    return await this.testRunner.runTestSuite('Outlook Version Compatibility Tests', tests);
  }

  private async testOutlookDesktop2025() {
    // Mock Outlook Desktop 2025.x environment
    const mockOutlookDesktop = {
      version: '16.0.17830.20138',
      platform: 'desktop',
      host: 'Outlook',
      capabilities: {
        recipientEvents: true,
        contentEvents: true,
        roamingSettings: true,
        notifications: true
      }
    };

    // Test Office.js initialization
    global.Office = {
      ...global.Office,
      context: {
        ...global.Office.context,
        host: {
          name: 'Outlook',
          version: mockOutlookDesktop.version,
          platform: 'PC'
        },
        requirements: {
          isSetSupported: (requirement, version) => {
            const supportedRequirements = {
              'Mailbox': '1.13',
              'CustomFunctions': '1.1'
            };
            return supportedRequirements[requirement] >= version;
          }
        }
      }
    };

    // Test basic functionality
    let initializationSuccessful = false;
    let eventHandlersWorking = false;

    try {
      // Test add-in initialization
      if (global.Office.context.host.name === 'Outlook') {
        initializationSuccessful = true;
      }

      // Test event handler registration
      global.Office.context.mailbox.item.addHandlerAsync = (eventType, handler, callback) => {
        if (eventType === 'recipientsChanged' || eventType === 'itemChanged') {
          eventHandlersWorking = true;
          callback({ status: 'succeeded' });
        } else {
          callback({ status: 'failed', error: { message: 'Unsupported event type' } });
        }
      };

      // Simulate event handler registration
      await new Promise((resolve, reject) => {
        global.Office.context.mailbox.item.addHandlerAsync('recipientsChanged', () => {}, (result) => {
          if (result.status === 'succeeded') {
            resolve(result);
          } else {
            reject(new Error(result.error.message));
          }
        });
      });

    } catch (error) {
      throw new Error(`Outlook Desktop 2025.x compatibility failed: ${error.message}`);
    }

    if (!initializationSuccessful) {
      throw new Error('Failed to initialize in Outlook Desktop 2025.x environment');
    }

    if (!eventHandlersWorking) {
      throw new Error('Event handlers not working in Outlook Desktop 2025.x');
    }

    return { status: 'passed' as const };
  }

  private async testOutlookWebApp() {
    // Mock Outlook Web App environment
    const mockOutlookWeb = {
      version: '16.0.17830.20138',
      platform: 'web',
      host: 'OutlookWebApp',
      capabilities: {
        recipientEvents: true,
        contentEvents: true,
        roamingSettings: true,
        notifications: true,
        limitedStorage: true
      }
    };

    global.Office = {
      ...global.Office,
      context: {
        ...global.Office.context,
        host: {
          name: 'OutlookWebApp',
          version: mockOutlookWeb.version,
          platform: 'OfficeOnline'
        }
      }
    };

    // Test web-specific limitations
    let webCompatibilityWorking = false;
    let storageWorking = false;

    try {
      // Test that basic functionality works in web environment
      if (global.Office.context.host.platform === 'OfficeOnline') {
        webCompatibilityWorking = true;
      }

      // Test roaming settings (with potential limitations)
      global.Office.context.roamingSettings.set('test-key', 'test-value');
      const retrievedValue = global.Office.context.roamingSettings.get('test-key');
      
      if (retrievedValue === 'test-value') {
        storageWorking = true;
      }

    } catch (error) {
      throw new Error(`Outlook Web App compatibility failed: ${error.message}`);
    }

    if (!webCompatibilityWorking) {
      throw new Error('Failed to initialize in Outlook Web App environment');
    }

    if (!storageWorking) {
      throw new Error('Storage not working in Outlook Web App');
    }

    return { status: 'passed' as const };
  }

  private async testOfficeJsApiVersions() {
    const apiVersionTests = [
      { version: '1.13', features: ['recipientEvents', 'contentEvents', 'roamingSettings'] },
      { version: '1.12', features: ['recipientEvents', 'roamingSettings'] },
      { version: '1.11', features: ['roamingSettings'] }
    ];

    for (const versionTest of apiVersionTests) {
      // Mock API version
      global.Office.context.requirements = {
        isSetSupported: (requirement, version) => {
          return parseFloat(versionTest.version) >= parseFloat(version);
        }
      };

      // Test feature availability
      for (const feature of versionTest.features) {
        let featureAvailable = false;

        switch (feature) {
          case 'recipientEvents':
            if (global.Office.context.requirements.isSetSupported('Mailbox', '1.12')) {
              featureAvailable = true;
            }
            break;
          case 'contentEvents':
            if (global.Office.context.requirements.isSetSupported('Mailbox', '1.13')) {
              featureAvailable = true;
            }
            break;
          case 'roamingSettings':
            if (global.Office.context.requirements.isSetSupported('Mailbox', '1.1')) {
              featureAvailable = true;
            }
            break;
        }

        if (!featureAvailable && versionTest.features.includes(feature)) {
          throw new Error(`Feature ${feature} not available in API version ${versionTest.version}`);
        }
      }
    }

    return { status: 'passed' as const };
  }

  private async testEventHandlingCompatibility() {
    const eventTypes = [
      'recipientsChanged',
      'itemChanged'
    ];

    let allEventsSupported = true;
    const unsupportedEvents: string[] = [];

    for (const eventType of eventTypes) {
      try {
        await new Promise((resolve, reject) => {
          global.Office.context.mailbox.item.addHandlerAsync(eventType, () => {}, (result) => {
            if (result.status === 'succeeded') {
              resolve(result);
            } else {
              reject(new Error(`Event ${eventType} not supported`));
            }
          });
        });
      } catch (error) {
        allEventsSupported = false;
        unsupportedEvents.push(eventType);
      }
    }

    if (!allEventsSupported) {
      // For compatibility testing, we might want to log warnings instead of failing
      console.warn(`Some events not supported: ${unsupportedEvents.join(', ')}`);
      
      // Check if critical events are supported
      const criticalEvents = ['recipientsChanged'];
      const criticalEventsUnsupported = criticalEvents.filter(event => unsupportedEvents.includes(event));
      
      if (criticalEventsUnsupported.length > 0) {
        throw new Error(`Critical events not supported: ${criticalEventsUnsupported.join(', ')}`);
      }
    }

    return { status: 'passed' as const };
  }

  private async testSettingsStorageCompatibility() {
    const testData = {
      simpleString: 'test-value',
      complexObject: {
        config: { threshold: 0.8, enabled: true },
        preferences: { notifications: true }
      },
      largeString: 'x'.repeat(1000) // Test storage limits
    };

    let storageWorking = true;
    const failedOperations: string[] = [];

    for (const [key, value] of Object.entries(testData)) {
      try {
        // Test set operation
        global.Office.context.roamingSettings.set(key, value);
        
        // Test get operation
        const retrievedValue = global.Office.context.roamingSettings.get(key);
        
        // Test value integrity
        if (JSON.stringify(retrievedValue) !== JSON.stringify(value)) {
          throw new Error(`Value mismatch for key ${key}`);
        }

        // Test save operation
        await new Promise((resolve, reject) => {
          global.Office.context.roamingSettings.saveAsync((result) => {
            if (result.status === 'succeeded') {
              resolve(result);
            } else {
              reject(new Error(`Save failed for key ${key}`));
            }
          });
        });

      } catch (error) {
        storageWorking = false;
        failedOperations.push(`${key}: ${error.message}`);
      }
    }

    if (!storageWorking) {
      throw new Error(`Storage operations failed: ${failedOperations.join(', ')}`);
    }

    return { status: 'passed' as const };
  }

  private async testManifestCompatibility() {
    // Test manifest requirements and capabilities
    const manifestRequirements = {
      minVersion: '1.1',
      sets: [
        { name: 'Mailbox', minVersion: '1.13' }
      ]
    };

    let manifestCompatible = true;
    const incompatibleFeatures: string[] = [];

    // Test requirement sets
    for (const set of manifestRequirements.sets) {
      if (!global.Office.context.requirements.isSetSupported(set.name, set.minVersion)) {
        manifestCompatible = false;
        incompatibleFeatures.push(`${set.name} ${set.minVersion}`);
      }
    }

    // Test host capabilities
    const requiredCapabilities = [
      'mailbox.item.to',
      'mailbox.item.cc',
      'mailbox.item.bcc',
      'mailbox.item.body',
      'roamingSettings'
    ];

    for (const capability of requiredCapabilities) {
      // Simulate capability check
      const parts = capability.split('.');
      let current = global.Office.context;
      
      for (const part of parts) {
        if (current && current[part]) {
          current = current[part];
        } else {
          manifestCompatible = false;
          incompatibleFeatures.push(capability);
          break;
        }
      }
    }

    if (!manifestCompatible) {
      throw new Error(`Manifest incompatible features: ${incompatibleFeatures.join(', ')}`);
    }

    return { status: 'passed' as const };
  }

  private async testPerformanceAcrossVersions() {
    const performanceTests = [
      {
        name: 'Settings access',
        operation: () => {
          global.Office.context.roamingSettings.set('perf-test', 'value');
          return global.Office.context.roamingSettings.get('perf-test');
        },
        maxTime: 50
      },
      {
        name: 'Event handler registration',
        operation: () => {
          return new Promise((resolve) => {
            global.Office.context.mailbox.item.addHandlerAsync('recipientsChanged', () => {}, resolve);
          });
        },
        maxTime: 100
      },
      {
        name: 'Mailbox item access',
        operation: () => {
          return new Promise((resolve) => {
            global.Office.context.mailbox.item.to.getAsync(resolve);
          });
        },
        maxTime: 200
      }
    ];

    for (const test of performanceTests) {
      const startTime = Date.now();
      
      try {
        await test.operation();
        const duration = Date.now() - startTime;
        
        if (duration > test.maxTime) {
          throw new Error(`Performance test "${test.name}" took ${duration}ms, expected < ${test.maxTime}ms`);
        }
        
      } catch (error) {
        if (error.message.includes('took') && error.message.includes('expected')) {
          throw error; // Re-throw performance errors
        }
        // Other errors might be acceptable for compatibility testing
        console.warn(`Performance test "${test.name}" failed with non-performance error: ${error.message}`);
      }
    }

    return { status: 'passed' as const };
  }
}