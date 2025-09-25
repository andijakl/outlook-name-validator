/**
 * Test runner for all model tests
 */

// Import and run all test files
import './name-matching-engine.test';
import './notification-system.test';
import './configuration-manager.test';

// Import error handling tests
import '../../integration/__tests__/error-handling-basic.test';

// Import settings UI tests
import '../../taskpane/__tests__/settings-ui.test';

console.log('All tests completed successfully!');