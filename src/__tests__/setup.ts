/**
 * Jest test setup file
 */

// Mock Office.js global
(global as any).Office = {
  context: {
    roamingSettings: {
      data: new Map<string, string>(),
      get: jest.fn(),
      set: jest.fn(),
      saveAsync: jest.fn()
    }
  },
  AsyncResultStatus: {
    Succeeded: 'succeeded',
    Failed: 'failed'
  }
};

// Mock DOM methods
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => ''
  })
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};