/**
 * Test Runner for Outlook Name Validator
 * 
 * Provides utilities for running tests with proper setup and teardown
 */

export class TestRunner {
  private testResults: TestExecutionResult[] = [];
  private currentSuite: string = '';

  /**
   * Run a test suite with proper setup and teardown
   */
  async runTestSuite(suiteName: string, tests: TestFunction[]): Promise<TestResult> {
    this.currentSuite = suiteName;
    console.log(`\n🧪 Running ${suiteName} test suite...`);
    
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    for (const test of tests) {
      try {
        await this.setupTest();
        const result = await this.runSingleTest(test);
        
        if (result.status === 'passed') {
          passed++;
          console.log(`  ✅ ${result.name}`);
        } else if (result.status === 'failed') {
          failed++;
          console.log(`  ❌ ${result.name}: ${result.error}`);
        } else {
          skipped++;
          console.log(`  ⏭️  ${result.name}: ${result.reason}`);
        }
        
        this.testResults.push(result);
        
      } catch (error) {
        failed++;
        console.log(`  ❌ ${test.name}: ${error.message}`);
        this.testResults.push({
          name: test.name,
          suite: suiteName,
          status: 'failed',
          error: error.message,
          duration: 0
        });
      } finally {
        await this.teardownTest();
      }
    }

    const result = { passed, failed, skipped };
    console.log(`📊 ${suiteName} Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
    return result;
  }

  /**
   * Run a single test with timing and error handling
   */
  private async runSingleTest(test: TestFunction): Promise<TestExecutionResult> {
    const startTime = Date.now();
    
    try {
      const result = await test.execute();
      const duration = Date.now() - startTime;
      
      return {
        name: test.name,
        suite: this.currentSuite,
        status: result.status,
        error: result.error,
        reason: result.reason,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        name: test.name,
        suite: this.currentSuite,
        status: 'failed',
        error: error.message,
        duration
      };
    }
  }

  /**
   * Setup test environment
   */
  private async setupTest(): Promise<void> {
    // Mock Office.js environment if not already present
    if (typeof global !== 'undefined' && !global.Office) {
      this.setupOfficeMocks();
    }
    
    // Setup DOM mocks if needed
    if (typeof global !== 'undefined' && !global.document) {
      this.setupDOMMocks();
    }
  }

  /**
   * Cleanup after test
   */
  private async teardownTest(): Promise<void> {
    // Clear any test data or mocks
    if (global.Office && global.Office.context && global.Office.context.roamingSettings) {
      global.Office.context.roamingSettings.data.clear();
    }
  }

  /**
   * Setup Office.js mocks for testing
   */
  private setupOfficeMocks(): void {
    global.Office = {
      context: {
        mailbox: {
          item: {
            to: { getAsync: (callback) => callback({ status: 'succeeded', value: [] }) },
            cc: { getAsync: (callback) => callback({ status: 'succeeded', value: [] }) },
            bcc: { getAsync: (callback) => callback({ status: 'succeeded', value: [] }) },
            body: { 
              getAsync: (callback) => callback({ 
                status: 'succeeded', 
                value: 'Hi John,\n\nHow are you?\n\nBest regards,\nSender' 
              })
            },
            addHandlerAsync: (eventType, handler, callback) => {
              callback({ status: 'succeeded' });
            },
            removeHandlerAsync: (eventType, handler, callback) => {
              callback({ status: 'succeeded' });
            }
          }
        },
        roamingSettings: {
          data: new Map(),
          get: function(key) { return this.data.get(key); },
          set: function(key, value) { this.data.set(key, value); },
          saveAsync: function(callback) {
            setTimeout(() => callback({ status: 'succeeded', error: null }), 10);
          }
        }
      },
      AsyncResultStatus: {
        Succeeded: 'succeeded',
        Failed: 'failed'
      },
      EventType: {
        RecipientsChanged: 'recipientsChanged',
        ItemChanged: 'itemChanged'
      },
      CoercionType: {
        Text: 'text',
        Html: 'html'
      }
    };
  }

  /**
   * Setup DOM mocks for testing
   */
  private setupDOMMocks(): void {
    global.document = {
      getElementById: (id) => ({
        innerHTML: '',
        textContent: '',
        style: { display: 'none' },
        classList: { 
          contains: () => false, 
          add: () => {}, 
          remove: () => {},
          toggle: () => {}
        },
        querySelector: () => null,
        querySelectorAll: () => [],
        addEventListener: () => {},
        removeEventListener: () => {},
        appendChild: () => {},
        removeChild: () => {},
        remove: () => {},
        dataset: {},
        attributes: [],
        getAttribute: () => null,
        setAttribute: () => {},
        removeAttribute: () => {}
      }),
      createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        className: '',
        innerHTML: '',
        textContent: '',
        style: {},
        dataset: {},
        appendChild: () => {},
        addEventListener: () => {},
        querySelector: () => null,
        querySelectorAll: () => []
      }),
      createTextNode: (text) => ({ textContent: text }),
      body: {
        appendChild: () => {},
        removeChild: () => {}
      }
    };

    global.window = {
      getComputedStyle: () => ({ 
        getPropertyValue: () => '',
        display: 'block',
        visibility: 'visible'
      }),
      addEventListener: () => {},
      removeEventListener: () => {}
    };
  }

  /**
   * Get all test results
   */
  getTestResults(): TestExecutionResult[] {
    return this.testResults;
  }

  /**
   * Clear test results
   */
  clearResults(): void {
    this.testResults = [];
  }
}

// Type definitions
export interface TestFunction {
  name: string;
  execute: () => Promise<SingleTestResult>;
}

export interface SingleTestResult {
  status: 'passed' | 'failed' | 'skipped';
  error?: string;
  reason?: string;
}

export interface TestResult {
  passed: number;
  failed: number;
  skipped: number;
}

export interface TestExecutionResult {
  name: string;
  suite: string;
  status: 'passed' | 'failed' | 'skipped';
  error?: string;
  reason?: string;
  duration: number;
}