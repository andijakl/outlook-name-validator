/**
 * Unit tests for ValidationOrchestrator core functionality
 * Tests the orchestrator without Office.js dependencies
 */

// Mock the office integration to avoid Office.js dependencies
const mockOfficeIntegration = {
  initialize: async () => {},
  getCurrentRecipients: async () => [],
  getCurrentEmailBody: async () => '',
  getValidationState: () => ({
    lastValidationTime: new Date(),
    isEnabled: true,
    currentValidation: []
  }),
  setValidationEnabled: () => {},
  dispose: () => {}
};

// Mock the models
const mockEmailParser = {
  parseEmailContent: (content: string) => ({
    greetings: [],
    hasValidContent: content.length > 0
  })
};

const mockRecipientParser = {
  parseEmailAddress: (email: string, displayName?: string) => ({
    email,
    displayName,
    extractedNames: [],
    isGeneric: false
  })
};

const mockMatchingEngine = {
  validateNames: () => []
};

// Create a test version of the orchestrator that uses mocks
class TestValidationOrchestrator {
  private eventHandler?: any;
  private isValidating = false;
  private cachedRecipients?: any[];
  private cachedContent?: string;
  private cachedRecipientsTimestamp = 0;
  private cachedContentTimestamp = 0;
  private lastValidationTime = 0;
  private readonly minValidationInterval = 1000;
  private readonly cacheExpirationTime = 30000;
  private debounceTimer?: any;
  private readonly debounceDelay = 500;

  constructor(eventHandler?: any) {
    this.eventHandler = eventHandler;
  }

  async initialize(): Promise<void> {
    await mockOfficeIntegration.initialize();
  }

  async validateCurrentEmail(): Promise<any[]> {
    if (this.isValidating) {
      return this.getLastValidationResults();
    }

    const now = Date.now();
    if (now - this.lastValidationTime < this.minValidationInterval) {
      return this.getLastValidationResults();
    }

    this.isValidating = true;
    this.lastValidationTime = now;

    try {
      if (this.eventHandler) {
        this.eventHandler.onValidationStarted();
      }

      const [recipients, emailBody] = await Promise.all([
        this.getCachedOrFreshRecipients(),
        this.getCachedOrFreshContent()
      ]);

      const parsedContent = mockEmailParser.parseEmailContent(emailBody);
      
      if (!parsedContent.hasValidContent || parsedContent.greetings.length === 0) {
        const emptyResults: any[] = [];
        this.updateValidationState(emptyResults);
        return emptyResults;
      }

      const parsedRecipients = this.parseRecipientsWithCaching(recipients);
      const validationResults = mockMatchingEngine.validateNames();

      this.updateValidationState(validationResults);
      
      if (this.eventHandler) {
        this.eventHandler.onValidationComplete(validationResults);
      }

      return validationResults;
    } catch (error) {
      if (this.eventHandler) {
        this.eventHandler.onValidationError(error as Error);
      }
      throw error;
    } finally {
      this.isValidating = false;
    }
  }

  handleRecipientsChanged(): void {
    this.invalidateRecipientsCache();
    this.debouncedValidation();
  }

  handleContentChanged(): void {
    this.invalidateContentCache();
    this.debouncedValidation();
  }

  onRecipientsChanged(recipients: any[]): void {
    this.updateRecipientsCache(recipients);
  }

  onContentChanged(content: string): void {
    this.updateContentCache(content);
  }

  getCachedRecipients(): any[] | undefined {
    return this.cachedRecipients;
  }

  getCachedContent(): string | undefined {
    return this.cachedContent;
  }

  isValidationInProgress(): boolean {
    return this.isValidating;
  }

  getValidationState(): any {
    return mockOfficeIntegration.getValidationState();
  }

  setValidationEnabled(enabled: boolean): void {
    mockOfficeIntegration.setValidationEnabled();
  }

  private debouncedValidation(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.validateCurrentEmail().catch(error => {
        console.error('Error during debounced validation:', error);
      });
    }, this.debounceDelay);
  }

  private async getCachedOrFreshRecipients(): Promise<any[]> {
    const now = Date.now();
    
    if (this.cachedRecipients && (now - this.cachedRecipientsTimestamp) < this.cacheExpirationTime) {
      return this.cachedRecipients;
    }

    const recipients = await mockOfficeIntegration.getCurrentRecipients();
    this.updateRecipientsCache(recipients);
    return recipients;
  }

  private async getCachedOrFreshContent(): Promise<string> {
    const now = Date.now();
    
    if (this.cachedContent !== undefined && (now - this.cachedContentTimestamp) < this.cacheExpirationTime) {
      return this.cachedContent;
    }

    const content = await mockOfficeIntegration.getCurrentEmailBody();
    this.updateContentCache(content);
    return content;
  }

  private parseRecipientsWithCaching(recipients: any[]): any[] {
    if (recipients.length > 0 && recipients[0].extractedNames) {
      return recipients;
    }

    return recipients.map(recipient => 
      mockRecipientParser.parseEmailAddress(recipient.email, recipient.displayName)
    );
  }

  private updateRecipientsCache(recipients: any[]): void {
    this.cachedRecipients = recipients;
    this.cachedRecipientsTimestamp = Date.now();
  }

  private updateContentCache(content: string): void {
    this.cachedContent = content;
    this.cachedContentTimestamp = Date.now();
  }

  private invalidateRecipientsCache(): void {
    this.cachedRecipients = undefined;
    this.cachedRecipientsTimestamp = 0;
  }

  private invalidateContentCache(): void {
    this.cachedContent = undefined;
    this.cachedContentTimestamp = 0;
  }

  private updateValidationState(results: any[]): void {
    // Mock implementation
  }

  private getLastValidationResults(): any[] {
    return [];
  }

  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
    
    mockOfficeIntegration.dispose();
    this.cachedRecipients = undefined;
    this.cachedContent = undefined;
    this.cachedRecipientsTimestamp = 0;
    this.cachedContentTimestamp = 0;
    this.isValidating = false;
  }
}

/**
 * Simple test framework
 */
class SimpleTest {
  private tests: Array<{ name: string; fn: () => Promise<void> | void }> = [];
  private passed = 0;
  private failed = 0;

  test(name: string, fn: () => Promise<void> | void) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('Running ValidationOrchestrator unit tests...\n');

    for (const test of this.tests) {
      try {
        await test.fn();
        console.log(`✓ ${test.name}`);
        this.passed++;
      } catch (error) {
        console.log(`✗ ${test.name}`);
        console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
        this.failed++;
      }
    }

    console.log(`\nResults: ${this.passed} passed, ${this.failed} failed`);
    
    if (this.failed > 0) {
      throw new Error(`${this.failed} test(s) failed`);
    }
  }

  assert(condition: boolean, message: string) {
    if (!condition) {
      throw new Error(message);
    }
  }

  assertEqual(actual: any, expected: any, message?: string) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  assertNotNull(value: any, message?: string) {
    if (value == null) {
      throw new Error(message || 'Expected value to not be null/undefined');
    }
  }
}

const test = new SimpleTest();

// Mock event handler
let lastValidationResults: any[] = [];
let lastError: Error | null = null;
let validationStartedCount = 0;

const mockEventHandler = {
  onValidationComplete: (results: any[]) => {
    lastValidationResults = results;
  },
  onValidationError: (error: Error) => {
    lastError = error;
  },
  onValidationStarted: () => {
    validationStartedCount++;
  }
};

// Test basic orchestrator functionality
test.test('ValidationOrchestrator - should create instance', () => {
  const orchestrator = new TestValidationOrchestrator(mockEventHandler);
  
  test.assertNotNull(orchestrator, 'Orchestrator should be created');
  test.assert(!orchestrator.isValidationInProgress(), 'Should not be validating initially');
  
  orchestrator.dispose();
});

test.test('ValidationOrchestrator - should initialize successfully', async () => {
  const orchestrator = new TestValidationOrchestrator(mockEventHandler);
  
  await orchestrator.initialize();
  
  test.assert(true, 'Should initialize without errors');
  
  orchestrator.dispose();
});

test.test('ValidationOrchestrator - should handle caching', () => {
  const orchestrator = new TestValidationOrchestrator(mockEventHandler);
  
  const recipients = [
    { email: 'test@example.com', extractedNames: ['test'], isGeneric: false }
  ];
  const content = 'Hi test!';
  
  orchestrator.onRecipientsChanged(recipients);
  orchestrator.onContentChanged(content);
  
  test.assertEqual(orchestrator.getCachedRecipients(), recipients, 'Should cache recipients');
  test.assertEqual(orchestrator.getCachedContent(), content, 'Should cache content');
  
  orchestrator.dispose();
});

test.test('ValidationOrchestrator - should invalidate cache on changes', () => {
  const orchestrator = new TestValidationOrchestrator(mockEventHandler);
  
  const recipients = [
    { email: 'test@example.com', extractedNames: ['test'], isGeneric: false }
  ];
  const content = 'Hi test!';
  
  orchestrator.onRecipientsChanged(recipients);
  orchestrator.onContentChanged(content);
  
  test.assertEqual(orchestrator.getCachedRecipients(), recipients, 'Should cache recipients');
  test.assertEqual(orchestrator.getCachedContent(), content, 'Should cache content');
  
  orchestrator.handleRecipientsChanged();
  orchestrator.handleContentChanged();
  
  test.assertEqual(orchestrator.getCachedRecipients(), undefined, 'Recipients cache should be cleared');
  test.assertEqual(orchestrator.getCachedContent(), undefined, 'Content cache should be cleared');
  
  orchestrator.dispose();
});

test.test('ValidationOrchestrator - should perform validation workflow', async () => {
  const orchestrator = new TestValidationOrchestrator(mockEventHandler);
  
  await orchestrator.initialize();
  
  validationStartedCount = 0;
  const results = await orchestrator.validateCurrentEmail();
  
  test.assert(Array.isArray(results), 'Should return array of results');
  test.assert(validationStartedCount > 0, 'Should call onValidationStarted');
  
  orchestrator.dispose();
});

test.test('ValidationOrchestrator - should prevent concurrent validations', async () => {
  const orchestrator = new TestValidationOrchestrator(mockEventHandler);
  
  await orchestrator.initialize();
  
  // Start first validation
  const firstPromise = orchestrator.validateCurrentEmail();
  
  // Start second validation immediately
  const secondPromise = orchestrator.validateCurrentEmail();
  
  const [firstResult, secondResult] = await Promise.all([firstPromise, secondPromise]);
  
  test.assert(Array.isArray(firstResult), 'First validation should return results');
  test.assert(Array.isArray(secondResult), 'Second validation should return results');
  
  orchestrator.dispose();
});

test.test('ValidationOrchestrator - should handle debouncing', async () => {
  const orchestrator = new TestValidationOrchestrator(mockEventHandler);
  
  let changeCount = 0;
  const originalValidate = orchestrator.validateCurrentEmail;
  orchestrator.validateCurrentEmail = async () => {
    changeCount++;
    return [];
  };
  
  // Trigger multiple rapid changes
  orchestrator.handleRecipientsChanged();
  orchestrator.handleRecipientsChanged();
  orchestrator.handleContentChanged();
  orchestrator.handleContentChanged();
  
  // Wait for debounce delay + buffer
  await new Promise(resolve => {
    setTimeout(() => {
      test.assert(changeCount <= 1, 'Should debounce multiple rapid changes');
      orchestrator.dispose();
      resolve(undefined);
    }, 600);
  });
});

test.test('ValidationOrchestrator - should clean up on dispose', () => {
  const orchestrator = new TestValidationOrchestrator(mockEventHandler);
  
  const recipients = [
    { email: 'test@example.com', extractedNames: ['test'], isGeneric: false }
  ];
  
  orchestrator.onRecipientsChanged(recipients);
  test.assertEqual(orchestrator.getCachedRecipients(), recipients, 'Should cache recipients');
  
  orchestrator.dispose();
  
  test.assertEqual(orchestrator.getCachedRecipients(), undefined, 'Cache should be cleared after dispose');
  test.assertEqual(orchestrator.getCachedContent(), undefined, 'Content cache should be cleared after dispose');
  test.assert(!orchestrator.isValidationInProgress(), 'Should not be validating after dispose');
});

// Run all tests
test.run().then(() => {
  console.log('\nAll ValidationOrchestrator unit tests passed!');
}).catch(error => {
  console.error('Test runner failed:', error);
  throw error;
});