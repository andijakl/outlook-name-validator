/**
 * Main Test Execution Script for Comprehensive Test Suite
 * 
 * Runs all comprehensive tests and generates detailed reports
 */

import { ComprehensiveTestSuite, TestCategory } from './comprehensive-test-suite';

async function main() {
  console.log('🚀 Starting Outlook Name Validator Comprehensive Test Suite');
  console.log('=' .repeat(80));

  const testSuite = new ComprehensiveTestSuite();

  try {
    // Check if specific test category is requested
    const args = process.argv.slice(2);
    const categoryArg = args.find(arg => arg.startsWith('--category='));
    
    if (categoryArg) {
      const category = categoryArg.split('=')[1] as TestCategory;
      console.log(`Running specific test category: ${category}`);
      
      const result = await testSuite.runTestCategory(category);
      
      console.log('\n📊 Category Results:');
      console.log(`Passed: ${result.passed}`);
      console.log(`Failed: ${result.failed}`);
      console.log(`Skipped: ${result.skipped}`);
      
      if (result.failed > 0) {
        process.exit(1);
      }
    } else {
      // Run all tests
      const results = await testSuite.runAllTests();
      
      console.log('\n🎯 Final Results Summary:');
      console.log('=' .repeat(50));
      console.log(`Total Tests: ${results.overall.passed + results.overall.failed + results.overall.skipped}`);
      console.log(`✅ Passed: ${results.overall.passed}`);
      console.log(`❌ Failed: ${results.overall.failed}`);
      console.log(`⏭️  Skipped: ${results.overall.skipped}`);
      
      const successRate = results.overall.passed / (results.overall.passed + results.overall.failed) * 100;
      console.log(`📈 Success Rate: ${successRate.toFixed(2)}%`);
      
      console.log('\n📋 Category Breakdown:');
      console.log(`End-to-End: ${results.endToEnd.passed}/${results.endToEnd.passed + results.endToEnd.failed} passed`);
      console.log(`Compatibility: ${results.compatibility.passed}/${results.compatibility.passed + results.compatibility.failed} passed`);
      console.log(`Accessibility: ${results.accessibility.passed}/${results.accessibility.passed + results.accessibility.failed} passed`);
      console.log(`Performance: ${results.performance.passed}/${results.performance.passed + results.performance.failed} passed`);
      console.log(`Regression: ${results.regression.passed}/${results.regression.passed + results.regression.failed} passed`);
      
      if (results.overall.failed > 0) {
        console.log('\n❌ Some tests failed. Please review the output above for details.');
        process.exit(1);
      } else {
        console.log('\n🎉 All tests passed successfully!');
        console.log('\n✨ The Outlook Name Validator is ready for deployment.');
      }
    }
    
  } catch (error) {
    console.error('\n💥 Test suite execution failed:', error);
    process.exit(1);
  }
}

// Handle command line arguments
function printUsage() {
  console.log('Usage: node run-comprehensive-tests.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --category=<category>  Run specific test category');
  console.log('                         Categories: endToEnd, compatibility, accessibility, performance, regression');
  console.log('  --help                 Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node run-comprehensive-tests.js                    # Run all tests');
  console.log('  node run-comprehensive-tests.js --category=endToEnd # Run only end-to-end tests');
  console.log('  node run-comprehensive-tests.js --category=performance # Run only performance tests');
}

if (process.argv.includes('--help')) {
  printUsage();
  process.exit(0);
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});