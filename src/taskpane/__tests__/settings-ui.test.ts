/**
 * Unit tests for SettingsUI
 * Tests user interface interactions and settings management
 */

import { SettingsUI } from '../settings-ui';
import { ConfigurationManager, DEFAULT_CONFIG, DEFAULT_PREFERENCES } from '../../models/configuration-manager';

// Mock ConfigurationManager
jest.mock('../../models/configuration-manager');

// Mock DOM methods
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => ''
  })
});

describe('SettingsUI', () => {
  let settingsUI: SettingsUI;
  let mockConfigManager: jest.Mocked<ConfigurationManager>;
  let container: HTMLElement;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = '<div id="settings-container"></div>';
    container = document.getElementById('settings-container')!;

    // Setup mocks
    mockConfigManager = {
      initialize: jest.fn().mockResolvedValue(undefined),
      getConfig: jest.fn().mockReturnValue(DEFAULT_CONFIG),
      getPreferences: jest.fn().mockReturnValue(DEFAULT_PREFERENCES),
      updateConfig: jest.fn().mockResolvedValue(undefined),
      updatePreferences: jest.fn().mockResolvedValue(undefined),
      resetConfig: jest.fn().mockResolvedValue(undefined),
      resetPreferences: jest.fn().mockResolvedValue(undefined)
    } as any;

    (ConfigurationManager.getInstance as jest.Mock).mockReturnValue(mockConfigManager);

    settingsUI = new SettingsUI();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid container', async () => {
      await settingsUI.initialize('settings-container');

      expect(mockConfigManager.initialize).toHaveBeenCalled();
      expect(container.innerHTML).toContain('Name Validator Settings');
      expect(container.innerHTML).toContain('Validation Configuration');
      expect(container.innerHTML).toContain('User Preferences');
    });

    it('should throw error with invalid container', async () => {
      await expect(settingsUI.initialize('invalid-container'))
        .rejects.toThrow("Container element with id 'invalid-container' not found");
    });

    it('should render configuration values correctly', async () => {
      const customConfig = {
        ...DEFAULT_CONFIG,
        minimumConfidenceThreshold: 0.8,
        enableFuzzyMatching: false,
        excludeGenericEmails: false
      };
      mockConfigManager.getConfig.mockReturnValue(customConfig);

      await settingsUI.initialize('settings-container');

      const thresholdSlider = container.querySelector('#confidence-threshold') as HTMLInputElement;
      const fuzzyCheckbox = container.querySelector('#fuzzy-matching') as HTMLInputElement;
      const excludeCheckbox = container.querySelector('#exclude-generic') as HTMLInputElement;

      expect(thresholdSlider.value).toBe('0.8');
      expect(fuzzyCheckbox.checked).toBe(false);
      expect(excludeCheckbox.checked).toBe(false);
    });

    it('should render preferences values correctly', async () => {
      const customPreferences = {
        ...DEFAULT_PREFERENCES,
        showSuccessNotifications: true,
        autoCorrectSuggestions: false,
        warningDisplayDuration: 8000
      };
      mockConfigManager.getPreferences.mockReturnValue(customPreferences);

      await settingsUI.initialize('settings-container');

      const successCheckbox = container.querySelector('#success-notifications') as HTMLInputElement;
      const autoCorrectCheckbox = container.querySelector('#auto-correct') as HTMLInputElement;
      const durationInput = container.querySelector('#warning-duration') as HTMLInputElement;

      expect(successCheckbox.checked).toBe(true);
      expect(autoCorrectCheckbox.checked).toBe(false);
      expect(durationInput.value).toBe('8');
    });

    it('should render greeting patterns correctly', async () => {
      const customConfig = {
        ...DEFAULT_CONFIG,
        enabledGreetingPatterns: ['Hi\\s+([A-Za-z]+)', 'Hello\\s+([A-Za-z]+)']
      };
      mockConfigManager.getConfig.mockReturnValue(customConfig);

      await settingsUI.initialize('settings-container');

      const patternInputs = container.querySelectorAll('.pattern-input') as NodeListOf<HTMLInputElement>;
      expect(patternInputs.length).toBe(2);
      expect(patternInputs[0].value).toBe('Hi\\s+([A-Za-z]+)');
      expect(patternInputs[1].value).toBe('Hello\\s+([A-Za-z]+)');
    });
  });

  describe('User Interactions', () => {
    beforeEach(async () => {
      await settingsUI.initialize('settings-container');
    });

    it('should update threshold display when slider changes', () => {
      const thresholdSlider = container.querySelector('#confidence-threshold') as HTMLInputElement;
      const thresholdValue = container.querySelector('.threshold-value') as HTMLSpanElement;

      thresholdSlider.value = '0.9';
      thresholdSlider.dispatchEvent(new Event('input'));

      expect(thresholdValue.textContent).toBe('0.9');
    });

    it('should add new greeting pattern', () => {
      const addButton = container.querySelector('#add-pattern-btn') as HTMLButtonElement;
      const initialPatterns = container.querySelectorAll('.pattern-item').length;

      addButton.click();

      const newPatterns = container.querySelectorAll('.pattern-item').length;
      expect(newPatterns).toBe(initialPatterns + 1);

      const newInput = container.querySelector('.pattern-item:last-child .pattern-input') as HTMLInputElement;
      expect(newInput.placeholder).toContain('Enter regex pattern');
    });

    it('should remove greeting pattern', () => {
      const initialPatterns = container.querySelectorAll('.pattern-item').length;
      const removeButton = container.querySelector('.remove-pattern') as HTMLButtonElement;

      removeButton.click();

      const newPatterns = container.querySelectorAll('.pattern-item').length;
      expect(newPatterns).toBe(initialPatterns - 1);
    });

    it('should re-index patterns after removal', () => {
      // Add a pattern first
      const addButton = container.querySelector('#add-pattern-btn') as HTMLButtonElement;
      addButton.click();

      // Remove the first pattern
      const firstRemoveButton = container.querySelector('.remove-pattern') as HTMLButtonElement;
      firstRemoveButton.click();

      // Check that remaining patterns are re-indexed
      const patternItems = container.querySelectorAll('.pattern-item');
      patternItems.forEach((item, index) => {
        const element = item as HTMLElement;
        expect(element.dataset.index).toBe(index.toString());
      });
    });
  });

  describe('Settings Management', () => {
    beforeEach(async () => {
      await settingsUI.initialize('settings-container');
    });

    it('should save settings successfully', async () => {
      // Modify some settings
      const thresholdSlider = container.querySelector('#confidence-threshold') as HTMLInputElement;
      const fuzzyCheckbox = container.querySelector('#fuzzy-matching') as HTMLInputElement;
      const successCheckbox = container.querySelector('#success-notifications') as HTMLInputElement;
      const durationInput = container.querySelector('#warning-duration') as HTMLInputElement;

      thresholdSlider.value = '0.9';
      fuzzyCheckbox.checked = false;
      successCheckbox.checked = true;
      durationInput.value = '10';

      // Save settings
      const saveButton = container.querySelector('#save-settings') as HTMLButtonElement;
      saveButton.click();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockConfigManager.updateConfig).toHaveBeenCalledWith({
        minimumConfidenceThreshold: 0.9,
        enableFuzzyMatching: false,
        excludeGenericEmails: true,
        enabledGreetingPatterns: expect.any(Array)
      });

      expect(mockConfigManager.updatePreferences).toHaveBeenCalledWith({
        showSuccessNotifications: true,
        autoCorrectSuggestions: true,
        warningDisplayDuration: 10000
      });

      const statusMessage = container.querySelector('#settings-status') as HTMLElement;
      expect(statusMessage.textContent).toBe('Settings saved successfully!');
      expect(statusMessage.classList.contains('success')).toBe(true);
    });

    it('should handle save errors', async () => {
      mockConfigManager.updateConfig.mockRejectedValue(new Error('Save failed'));

      const saveButton = container.querySelector('#save-settings') as HTMLButtonElement;
      saveButton.click();

      await new Promise(resolve => setTimeout(resolve, 0));

      const statusMessage = container.querySelector('#settings-status') as HTMLElement;
      expect(statusMessage.textContent).toContain('Failed to save settings');
      expect(statusMessage.classList.contains('error')).toBe(true);
    });

    it('should reset settings to defaults', async () => {
      const resetButton = container.querySelector('#reset-settings') as HTMLButtonElement;
      resetButton.click();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockConfigManager.resetConfig).toHaveBeenCalled();
      expect(mockConfigManager.resetPreferences).toHaveBeenCalled();

      const statusMessage = container.querySelector('#settings-status') as HTMLElement;
      expect(statusMessage.textContent).toBe('Settings reset to defaults');
      expect(statusMessage.classList.contains('success')).toBe(true);
    });

    it('should handle reset errors', async () => {
      mockConfigManager.resetConfig.mockRejectedValue(new Error('Reset failed'));

      const resetButton = container.querySelector('#reset-settings') as HTMLButtonElement;
      resetButton.click();

      await new Promise(resolve => setTimeout(resolve, 0));

      const statusMessage = container.querySelector('#settings-status') as HTMLElement;
      expect(statusMessage.textContent).toContain('Failed to reset settings');
      expect(statusMessage.classList.contains('error')).toBe(true);
    });

    it('should cancel settings changes', async () => {
      const cancelButton = container.querySelector('#cancel-settings') as HTMLButtonElement;
      cancelButton.click();

      const statusMessage = container.querySelector('#settings-status') as HTMLElement;
      expect(statusMessage.textContent).toBe('Changes cancelled');
      expect(statusMessage.classList.contains('info')).toBe(true);
    });
  });

  describe('Data Collection', () => {
    beforeEach(async () => {
      await settingsUI.initialize('settings-container');
    });

    it('should collect configuration data correctly', async () => {
      // Set specific values
      const thresholdSlider = container.querySelector('#confidence-threshold') as HTMLInputElement;
      const fuzzyCheckbox = container.querySelector('#fuzzy-matching') as HTMLInputElement;
      const excludeCheckbox = container.querySelector('#exclude-generic') as HTMLInputElement;

      thresholdSlider.value = '0.85';
      fuzzyCheckbox.checked = false;
      excludeCheckbox.checked = true;

      // Add a custom pattern
      const addButton = container.querySelector('#add-pattern-btn') as HTMLButtonElement;
      addButton.click();
      const newPatternInput = container.querySelector('.pattern-item:last-child .pattern-input') as HTMLInputElement;
      newPatternInput.value = 'Custom\\s+([A-Za-z]+)';

      const saveButton = container.querySelector('#save-settings') as HTMLButtonElement;
      saveButton.click();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockConfigManager.updateConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          minimumConfidenceThreshold: 0.85,
          enableFuzzyMatching: false,
          excludeGenericEmails: true,
          enabledGreetingPatterns: expect.arrayContaining(['Custom\\s+([A-Za-z]+)'])
        })
      );
    });

    it('should collect preferences data correctly', async () => {
      const successCheckbox = container.querySelector('#success-notifications') as HTMLInputElement;
      const autoCorrectCheckbox = container.querySelector('#auto-correct') as HTMLInputElement;
      const durationInput = container.querySelector('#warning-duration') as HTMLInputElement;

      successCheckbox.checked = true;
      autoCorrectCheckbox.checked = false;
      durationInput.value = '15';

      const saveButton = container.querySelector('#save-settings') as HTMLButtonElement;
      saveButton.click();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockConfigManager.updatePreferences).toHaveBeenCalledWith({
        showSuccessNotifications: true,
        autoCorrectSuggestions: false,
        warningDisplayDuration: 15000
      });
    });

    it('should filter out empty greeting patterns', async () => {
      // Add empty patterns
      const addButton = container.querySelector('#add-pattern-btn') as HTMLButtonElement;
      addButton.click();
      addButton.click();

      const patternInputs = container.querySelectorAll('.pattern-input') as NodeListOf<HTMLInputElement>;
      patternInputs[patternInputs.length - 2].value = '';
      patternInputs[patternInputs.length - 1].value = '   '; // whitespace only

      const saveButton = container.querySelector('#save-settings') as HTMLButtonElement;
      saveButton.click();

      await new Promise(resolve => setTimeout(resolve, 0));

      const savedPatterns = (mockConfigManager.updateConfig as jest.Mock).mock.calls[0][0].enabledGreetingPatterns;
      expect(savedPatterns.every((pattern: string) => pattern.trim().length > 0)).toBe(true);
    });
  });

  describe('Status Messages', () => {
    beforeEach(async () => {
      await settingsUI.initialize('settings-container');
    });

    it('should show and hide status messages', async () => {
      const saveButton = container.querySelector('#save-settings') as HTMLButtonElement;
      saveButton.click();

      await new Promise(resolve => setTimeout(resolve, 0));

      const statusMessage = container.querySelector('#settings-status') as HTMLElement;
      expect(statusMessage.style.display).toBe('block');

      // Wait for auto-hide timeout
      await new Promise(resolve => setTimeout(resolve, 3100));
      expect(statusMessage.style.display).toBe('none');
    });

    it('should show different message types with correct styling', async () => {
      const statusMessage = container.querySelector('#settings-status') as HTMLElement;

      // Test success message
      const saveButton = container.querySelector('#save-settings') as HTMLButtonElement;
      saveButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(statusMessage.classList.contains('success')).toBe(true);

      // Test error message
      mockConfigManager.updateConfig.mockRejectedValue(new Error('Test error'));
      saveButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(statusMessage.classList.contains('error')).toBe(true);

      // Test info message
      const cancelButton = container.querySelector('#cancel-settings') as HTMLButtonElement;
      cancelButton.click();

      expect(statusMessage.classList.contains('info')).toBe(true);
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      await settingsUI.initialize('settings-container');
    });

    it('should have proper labels for form elements', () => {
      const thresholdSlider = container.querySelector('#confidence-threshold') as HTMLInputElement;
      const thresholdLabel = container.querySelector('label[for="confidence-threshold"]') as HTMLLabelElement;

      expect(thresholdLabel).toBeTruthy();
      expect(thresholdLabel.textContent).toContain('Minimum Confidence Threshold');

      const durationInput = container.querySelector('#warning-duration') as HTMLInputElement;
      const durationLabel = container.querySelector('label[for="warning-duration"]') as HTMLLabelElement;

      expect(durationLabel).toBeTruthy();
      expect(durationLabel.textContent).toContain('Warning Display Duration');
    });

    it('should have proper button text', () => {
      const saveButton = container.querySelector('#save-settings') as HTMLButtonElement;
      const resetButton = container.querySelector('#reset-settings') as HTMLButtonElement;
      const cancelButton = container.querySelector('#cancel-settings') as HTMLButtonElement;

      expect(saveButton.textContent).toBe('Save Settings');
      expect(resetButton.textContent).toBe('Reset to Defaults');
      expect(cancelButton.textContent).toBe('Cancel');
    });
  });
});