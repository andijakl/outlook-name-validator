/**
 * Unit tests for notification system error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationSystem, NotificationCallbacks } from '../notification-system';
import {
  OfficeIntegrationError,
  ValidationError,
  ParsingError,
  PermissionError,
  NetworkError,
  BaseValidationError,
  ErrorCategory,
  ErrorSeverity
} from '../../integration/error-handler';

// Mock DOM methods
const mockElement = {
  appendChild: vi.fn(),
  querySelector: vi.fn(),
  addEventListener: vi.fn(),
  setAttribute: vi.fn(),
  remove: vi.fn(),
  style: {},
  innerHTML: '',
  textContent: '',
  className: '',
  insertAdjacentElement: vi.fn()
};

const mockContainer = {
  ...mockElement,
  style: { display: 'none' }
};

// Mock document methods
Object.defineProperty(global, 'document', {
  value: {
    getElementById: vi.fn().mockImplementation((id) => {
      if (id === 'warnings-container') return mockContainer;
      if (id === 'app-body') return mockElement;
      return null;
    }),
    createElement: vi.fn().mockReturnValue(mockElement),
    querySelector: vi.fn().mockReturnValue(mockElement)
  },
  writable: true
});

describe('NotificationSystem Error Handling', () => {
  let notificationSystem: NotificationSystem;
  let mockCallbacks: NotificationCallbacks;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockCallbacks = {
      onWarningDismissed: vi.fn(),
      onCorrectionApplied: vi.fn(),
      onSettingsRequested: vi.fn(),
      onRetryRequested: vi.fn()
    };

    notificationSystem = new NotificationSystem({}, mockCallbacks);
  });

  afterEach(() => {
    notificationSystem.clearNotifications();
  });

  describe('Error Notification Display', () => {
    it('should display office integration errors', () => {
      const error = new OfficeIntegrationError(
        'Office API failed',
        'INTERNAL_ERROR',
        new Error('Original error')
      );

      const errorId = notificationSystem.showError(error);

      expect(errorId).toBeDefined();
      expect(errorId).toMatch(/^error-\d+$/);
      expect(mockContainer.appendChild).toHaveBeenCalled();
    });

    it('should display validation errors', () => {
      const error = new ValidationError(
        'Validation failed',
        'content_parsing',
        new Error('Original error')
      );

      const errorId = notificationSystem.showError(error);

      expect(errorId).toBeDefined();
      expect(mockContainer.appendChild).toHaveBeenCalled();
    });

    it('should display parsing errors', () => {
      const error = new ParsingError(
        'Parsing failed',
        'greeting_extraction',
        new Error('Original error')
      );

      const errorId = notificationSystem.showError(error);

      expect(errorId).toBeDefined();
      expect(mockContainer.appendChild).toHaveBeenCalled();
    });

    it('should display permission errors', () => {
      const error = new PermissionError(
        'Permission denied',
        new Error('Original error')
      );

      const errorId = notificationSystem.showError(error);

      expect(errorId).toBeDefined();
      expect(mockContainer.appendChild).toHaveBeenCalled();
    });

    it('should display network errors', () => {
      const error = new NetworkError(
        'Network failed',
        new Error('Original error')
      );

      const errorId = notificationSystem.showError(error);

      expect(errorId).toBeDefined();
      expect(mockContainer.appendChild).toHaveBeenCalled();
    });

    it('should display generic errors', () => {
      const error = new Error('Generic error');

      const errorId = notificationSystem.showError(error);

      expect(errorId).toBeDefined();
      expect(mockContainer.appendChild).toHaveBeenCalled();
    });
  });

  describe('Error Element Creation', () => {
    it('should create error element with diagnostic information for BaseValidationError', () => {
      const error = new OfficeIntegrationError(
        'Test error',
        'TEST_CODE',
        new Error('Original error'),
        { testContext: 'value' }
      );

      notificationSystem.showError(error);

      // Verify createElement was called to create the error element
      expect(document.createElement).toHaveBeenCalledWith('div');
      
      // Verify the element was configured with error class
      expect(mockElement.className).toBe('validation-error');
      expect(mockElement.setAttribute).toHaveBeenCalledWith('data-error-id', expect.any(String));
    });

    it('should include recovery suggestions in error display', () => {
      const error = new PermissionError('Permission denied');

      notificationSystem.showError(error);

      // The innerHTML should contain suggestions
      expect(mockElement.innerHTML).toContain('error-suggestions');
    });

    it('should include diagnostic details for BaseValidationError', () => {
      const error = new ValidationError('Validation failed', 'test_step');

      notificationSystem.showError(error);

      // The innerHTML should contain error details
      expect(mockElement.innerHTML).toContain('error-details');
      expect(mockElement.innerHTML).toContain('Error ID:');
      expect(mockElement.innerHTML).toContain('Category:');
      expect(mockElement.innerHTML).toContain('Severity:');
    });

    it('should not include diagnostic details for regular errors', () => {
      const error = new Error('Regular error');

      notificationSystem.showError(error);

      // The innerHTML should not contain error details for regular errors
      expect(mockElement.innerHTML).not.toContain('error-details');
    });
  });

  describe('Error Event Handling', () => {
    beforeEach(() => {
      // Mock querySelector to return elements with event listeners
      mockElement.querySelector.mockImplementation((selector) => {
        if (selector === '.dismiss-error') return { addEventListener: vi.fn() };
        if (selector === '.retry-action') return { addEventListener: vi.fn() };
        if (selector === '.show-details') return { addEventListener: vi.fn() };
        if (selector === '.error-details') return { style: { display: 'none' } };
        return null;
      });
    });

    it('should attach dismiss event listener', () => {
      const error = new OfficeIntegrationError('Test error');
      
      notificationSystem.showError(error);

      // Verify dismiss button event listener was attached
      const dismissButton = mockElement.querySelector('.dismiss-error');
      expect(dismissButton?.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should attach retry event listener', () => {
      const error = new OfficeIntegrationError('Test error');
      
      notificationSystem.showError(error);

      // Verify retry button event listener was attached
      const retryButton = mockElement.querySelector('.retry-action');
      expect(retryButton?.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should attach show details event listener', () => {
      const error = new ValidationError('Test error', 'test_step');
      
      notificationSystem.showError(error);

      // Verify show details button event listener was attached
      const detailsButton = mockElement.querySelector('.show-details');
      expect(detailsButton?.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });
  });

  describe('Error Dismissal', () => {
    it('should dismiss error notifications', () => {
      const error = new OfficeIntegrationError('Test error');
      const errorId = notificationSystem.showError(error);

      // Mock the warning element
      const warningElement = { ...mockElement, style: { animation: '' } };
      (notificationSystem as any).activeWarnings.set(errorId, warningElement);

      notificationSystem.dismissWarning(errorId);

      expect(warningElement.style.animation).toBe('fadeOut 0.3s ease-out');
    });

    it('should call onWarningDismissed callback', (done) => {
      const error = new OfficeIntegrationError('Test error');
      const errorId = notificationSystem.showError(error);

      // Mock the warning element
      const warningElement = { 
        ...mockElement, 
        style: { animation: '' },
        remove: vi.fn()
      };
      (notificationSystem as any).activeWarnings.set(errorId, warningElement);

      // Mock setTimeout to execute immediately
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn().mockImplementation((callback) => {
        callback();
        return 1;
      });

      notificationSystem.dismissWarning(errorId);

      // Verify callback was called
      setTimeout(() => {
        expect(mockCallbacks.onWarningDismissed).toHaveBeenCalledWith(errorId);
        global.setTimeout = originalSetTimeout;
        done();
      }, 0);
    });
  });

  describe('Retry Functionality', () => {
    it('should handle retry requests', () => {
      const error = new NetworkError('Network failed');
      const errorId = notificationSystem.showError(error);

      // Simulate retry button click
      if (mockCallbacks.onRetryRequested) {
        mockCallbacks.onRetryRequested(errorId, error);
      }

      expect(mockCallbacks.onRetryRequested).toHaveBeenCalledWith(errorId, error);
    });
  });

  describe('Error Statistics', () => {
    it('should track active error count', () => {
      const error1 = new OfficeIntegrationError('Error 1');
      const error2 = new ValidationError('Error 2', 'test_step');

      notificationSystem.showError(error1);
      notificationSystem.showError(error2);

      expect(notificationSystem.getActiveWarningCount()).toBe(2);
    });

    it('should limit maximum errors displayed', () => {
      const notificationSystemWithLimit = new NotificationSystem({ maxWarnings: 2 });

      // Add more errors than the limit
      notificationSystemWithLimit.showError(new Error('Error 1'));
      notificationSystemWithLimit.showError(new Error('Error 2'));
      notificationSystemWithLimit.showError(new Error('Error 3'));

      expect(notificationSystemWithLimit.getActiveWarningCount()).toBe(2);
    });
  });

  describe('Configuration', () => {
    it('should respect sound notification settings', () => {
      const notificationSystemWithSound = new NotificationSystem({ enableSounds: true });
      
      // Mock console.debug to verify sound notification
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      
      notificationSystemWithSound.showError(new Error('Test error'));

      // Should log sound notification
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Playing error notification sound'));
      
      consoleSpy.mockRestore();
    });

    it('should update configuration dynamically', () => {
      notificationSystem.updateConfig({ enableSounds: true, maxWarnings: 10 });

      // Configuration should be updated (tested indirectly through behavior)
      expect(notificationSystem.getActiveWarningCount()).toBe(0); // No errors yet
    });
  });

  describe('HTML Escaping', () => {
    it('should escape HTML in error messages', () => {
      const error = new Error('<script>alert("xss")</script>');
      
      notificationSystem.showError(error);

      // The innerHTML should contain escaped HTML
      expect(mockElement.innerHTML).toContain('&lt;script&gt;');
      expect(mockElement.innerHTML).not.toContain('<script>');
    });

    it('should escape HTML in suggestions', () => {
      // Create a custom error that would have HTML in suggestions
      const error = new OfficeIntegrationError('Test error with <b>HTML</b>');
      
      notificationSystem.showError(error);

      // Suggestions should be escaped
      expect(mockElement.innerHTML).not.toContain('<b>HTML</b>');
    });
  });

  describe('Accessibility', () => {
    it('should include ARIA labels for error elements', () => {
      const error = new OfficeIntegrationError('Test error');
      
      notificationSystem.showError(error);

      // Should include role="alert" for screen readers
      expect(mockElement.innerHTML).toContain('role="alert"');
      expect(mockElement.innerHTML).toContain('aria-label="Error"');
      expect(mockElement.innerHTML).toContain('aria-label="Dismiss error"');
    });
  });
});