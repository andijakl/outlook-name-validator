/**
 * Comprehensive Test Suite for Outlook Name Validator
 * 
 * This test suite covers all requirements and provides end-to-end testing,
 * performance benchmarks, accessibility testing, and regression tests.
 */

import { TestRunner } from './test-runner';
import { EndToEndTests } from './e2e/end-to-end-tests';
import { TestDataSets } from './data/test-data-sets';
import { OutlookVersionTests } from './compatibility/outlook-version-tests';
import { AccessibilityTests } from './accessibility/accessibility-tests';
import { PerformanceBenchmarks } from './performance/performance-benchmarks';
import { RegressionTests } from './regression/regression-tests';

export class ComprehensiveTestSuite {
  private testRunner: TestRunner;
  private endToEndTests: EndToEndTests;
  private testDataSets: TestDataSets;
  private outlookVersionTests: OutlookVersionTests;
  private accessibilityTests: AccessibilityTests;
  private performanceBenchmarks: PerformanceBenchmarks;
  private regressionTests: RegressionTests;

  constructor() {
    this.testRunner = new TestRunner();
    this.endToEndTests = new EndToEndTests();
    this.testDataSets = new TestDataSets();
    this.outlookVersionTests = new OutlookVersionTests();
    this.accessibilityTests = new AccessibilityTests();
    this.performanceBenchmarks = new PerformanceBenchmarks();
    this.regressionTests = new RegressionTests();
  }

  /**
   * Run all comprehensive tests
   */
  async runAllTests(): Promise<TestResults> {
    console.log('🚀 Starting Comprehensive Test Suite for Outlook Name Validator');
    
    const results: TestResults = {
      endToEnd: { passed: 0, failed: 0, skipped: 0 },
      compatibility: { passed: 0, failed: 0, skipped: 0 },
      accessibility: { passed: 0, failed: 0, skipped: 0 },
      performance: { passed: 0, failed: 0, skipped: 0 },
      regression: { passed: 0, failed: 0, skipped: 0 },
      overall: { passed: 0, failed: 0, skipped: 0 }
    };

    try {
      // 1. End-to-End Tests
      console.log('\n📋 Running End-to-End Tests...');
      results.endToEnd = await this.endToEndTests.runAllTests();
      
      // 2. Outlook Version Compatibility Tests
      console.log('\n🔄 Running Outlook Version Compatibility Tests...');
      results.compatibility = await this.outlookVersionTests.runAllTests();
      
      // 3. Accessibility Tests
      console.log('\n♿ Running Accessibility Tests...');
      results.accessibility = await this.accessibilityTests.runAllTests();
      
      // 4. Performance Benchmarks
      console.log('\n⚡ Running Performance Benchmarks...');
      results.performance = await this.performanceBenchmarks.runAllTests();
      
      // 5. Regression Tests
      console.log('\n🔍 Running Regression Tests...');
      results.regression = await this.regressionTests.runAllTests();
      
      // Calculate overall results
      results.overall = this.calculateOverallResults(results);
      
      // Generate test report
      this.generateTestReport(results);
      
      return results;
      
    } catch (error) {
      console.error('❌ Comprehensive test suite failed:', error);
      throw error;
    }
  }

  /**
   * Run specific test category
   */
  async runTestCategory(category: TestCategory): Promise<TestResult> {
    switch (category) {
      case 'endToEnd':
        return await this.endToEndTests.runAllTests();
      case 'compatibility':
        return await this.outlookVersionTests.runAllTests();
      case 'accessibility':
        return await this.accessibilityTests.runAllTests();
      case 'performance':
        return await this.performanceBenchmarks.runAllTests();
      case 'regression':
        return await this.regressionTests.runAllTests();
      default:
        throw new Error(`Unknown test category: ${category}`);
    }
  }

  private calculateOverallResults(results: TestResults): TestResult {
    const categories = [results.endToEnd, results.compatibility, results.accessibility, results.performance, results.regression];
    
    return categories.reduce((overall, category) => ({
      passed: overall.passed + category.passed,
      failed: overall.failed + category.failed,
      skipped: overall.skipped + category.skipped
    }), { passed: 0, failed: 0, skipped: 0 });
  }

  private generateTestReport(results: TestResults): void {
    const timestamp = new Date().toISOString();
    const report = {
      timestamp,
      results,
      summary: {
        totalTests: results.overall.passed + results.overall.failed + results.overall.skipped,
        successRate: results.overall.passed / (results.overall.passed + results.overall.failed) * 100,
        categories: {
          endToEnd: this.getCategoryStatus(results.endToEnd),
          compatibility: this.getCategoryStatus(results.compatibility),
          accessibility: this.getCategoryStatus(results.accessibility),
          performance: this.getCategoryStatus(results.performance),
          regression: this.getCategoryStatus(results.regression)
        }
      }
    };

    console.log('\n📊 Test Results Summary:');
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`Success Rate: ${report.summary.successRate.toFixed(2)}%`);
    console.log(`Passed: ${results.overall.passed}`);
    console.log(`Failed: ${results.overall.failed}`);
    console.log(`Skipped: ${results.overall.skipped}`);
    
    // Save detailed report
    this.saveTestReport(report);
  }

  private getCategoryStatus(result: TestResult): string {
    if (result.failed > 0) return 'FAILED';
    if (result.skipped > 0) return 'PARTIAL';
    return 'PASSED';
  }

  private saveTestReport(report: any): void {
    // In a real implementation, this would save to a file or test reporting system
    console.log('\n📄 Detailed test report generated');
  }
}

// Type definitions
export interface TestResult {
  passed: number;
  failed: number;
  skipped: number;
}

export interface TestResults {
  endToEnd: TestResult;
  compatibility: TestResult;
  accessibility: TestResult;
  performance: TestResult;
  regression: TestResult;
  overall: TestResult;
}

export type TestCategory = 'endToEnd' | 'compatibility' | 'accessibility' | 'performance' | 'regression';