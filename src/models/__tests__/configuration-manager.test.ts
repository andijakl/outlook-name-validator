/**
 * Unit tests for ConfigurationManager
 * Tests configuration storage, validation, and user preferences management
 */

import { ConfigurationManager, DEFAULT_CONFIG, DEFAULT_PREFERENCES } from '../configuration-manager';
import { ValidationConfig, UserPreferences } from '../interfaces';

// Mock Office.js API
const mockOfficeContext = {
  roamingSettings: {
    data: new Map<string, string>(),
    get: jest.fn((key: string) => mockOfficeContext.roamingSettings.data.get(key)),
    set: jest.fn((key: string, value: string) => {
      mockOfficeContext.roamingSettings.data.set(key, value);
    }),
    saveAsync: jest.fn((callback: (result: any) => void) => {
      // Simulate successful save
      callback({
        status: 'succeeded' as any,
        error: null
      });
    })
  }
};

// Mock global Office object
(global as any).Office = {
  context: mockOfficeContext,
  AsyncResultStatus: {
    Succeeded: 'succeeded',
    Failed: 'failed'
  }
};

describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;

  beforeEach(() => {
    // Reset singleton instance
    (ConfigurationManager as any).instance = undefined;
    configManager = ConfigurationManager.getInstance();
    
    // Clear mock data
    mockOfficeContext.roamingSettings.data.clear();
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ConfigurationManager.getInstance();
      const instance2 = ConfigurationManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization', () => {
    it('should initialize with default values when no saved settings exist', async () => {
      await configManager.initialize();
      
      const config = configManager.getConfig();
      const preferences = configManager.getPreferences();
      
      expect(config).toEqual(DEFAULT_CONFIG);
      expect(preferences).toEqual(DEFAULT_PREFERENCES);
    });

    it('should load saved configuration from Office settings', async () => {
      const savedConfig: Partial<ValidationConfig> = {
        minimumConfidenceThreshold: 0.8,
        enableFuzzyMatching: false
      };
      
      mockOfficeContext.roamingSettings.data.set('validationConfig', JSON.stringify(savedConfig));
      
      await configManager.initialize();
      
      const config = configManager.getConfig();
      expect(config.minimumConfidenceThreshold).toBe(0.8);
      expect(config.enableFuzzyMatching).toBe(false);
      expect(config.enabledGreetingPatterns).toEqual(DEFAULT_CONFIG.enabledGreetingPatterns);
    });

    it('should load saved preferences from Office settings', async () => {
      const savedPreferences: Partial<UserPreferences> = {
        showSuccessNotifications: true,
        warningDisplayDuration: 10000
      };
      
      mockOfficeContext.roamingSettings.data.set('userPreferences', JSON.stringify(savedPreferences));
      
      await configManager.initialize();
      
      const preferences = configManager.getPreferences();
      expect(preferences.showSuccessNotifications).toBe(true);
      expect(preferences.warningDisplayDuration).toBe(10000);
      expect(preferences.autoCorrectSuggestions).toBe(DEFAULT_PREFERENCES.autoCorrectSuggestions);
    });

    it('should handle initialization errors gracefully', async () => {
      mockOfficeContext.roamingSettings.get.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      await configManager.initialize();
      
      const config = configManager.getConfig();
      const preferences = configManager.getPreferences();
      
      expect(config).toEqual(DEFAULT_CONFIG);
      expect(preferences).toEqual(DEFAULT_PREFERENCES);
    });

    it('should not reinitialize if already initialized', async () => {
      await configManager.initialize();
      const getSpy = jest.spyOn(mockOfficeContext.roamingSettings, 'get');
      
      await configManager.initialize();
      
      expect(getSpy).not.toHaveBeenCalled();
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      await configManager.initialize();
    });

    it('should update configuration correctly', async () => {
      const newConfig: Partial<ValidationConfig> = {
        minimumConfidenceThreshold: 0.9,
        enableFuzzyMatching: false
      };
      
      await configManager.updateConfig(newConfig);
      
      const config = configManager.getConfig();
      expect(config.minimumConfidenceThreshold).toBe(0.9);
      expect(config.enableFuzzyMatching).toBe(false);
      expect(mockOfficeContext.roamingSettings.set).toHaveBeenCalledWith(
        'validationConfig',
        expect.stringContaining('"minimumConfidenceThreshold":0.9')
      );
    });

    it('should validate configuration before saving', async () => {
      const invalidConfig: Partial<ValidationConfig> = {
        minimumConfidenceThreshold: 1.5 // Invalid: > 1
      };
      
      await expect(configManager.updateConfig(invalidConfig)).rejects.toThrow(
        'minimumConfidenceThreshold must be a number between 0 and 1'
      );
    });

    it('should validate greeting patterns are valid regex', async () => {
      const invalidConfig: Partial<ValidationConfig> = {
        enabledGreetingPatterns: ['Hi\\s+([A-Za-z]+)', '[invalid regex']
      };
      
      await expect(configManager.updateConfig(invalidConfig)).rejects.toThrow(
        'Invalid regex pattern at index 1'
      );
    });

    it('should reset configuration to defaults', async () => {
      await configManager.updateConfig({ minimumConfidenceThreshold: 0.9 });
      await configManager.resetConfig();
      
      const config = configManager.getConfig();
      expect(config).toEqual(DEFAULT_CONFIG);
    });
  });

  describe('Preferences Management', () => {
    beforeEach(async () => {
      await configManager.initialize();
    });

    it('should update preferences correctly', async () => {
      const newPreferences: Partial<UserPreferences> = {
        showSuccessNotifications: true,
        warningDisplayDuration: 8000
      };
      
      await configManager.updatePreferences(newPreferences);
      
      const preferences = configManager.getPreferences();
      expect(preferences.showSuccessNotifications).toBe(true);
      expect(preferences.warningDisplayDuration).toBe(8000);
      expect(mockOfficeContext.roamingSettings.set).toHaveBeenCalledWith(
        'userPreferences',
        expect.stringContaining('"showSuccessNotifications":true')
      );
    });

    it('should validate preferences before saving', async () => {
      const invalidPreferences: Partial<UserPreferences> = {
        warningDisplayDuration: 500 // Invalid: < 1000
      };
      
      await expect(configManager.updatePreferences(invalidPreferences)).rejects.toThrow(
        'warningDisplayDuration must be a number between 1000 and 30000'
      );
    });

    it('should reset preferences to defaults', async () => {
      await configManager.updatePreferences({ showSuccessNotifications: true });
      await configManager.resetPreferences();
      
      const preferences = configManager.getPreferences();
      expect(preferences).toEqual(DEFAULT_PREFERENCES);
    });
  });

  describe('Data Validation', () => {
    beforeEach(async () => {
      await configManager.initialize();
    });

    it('should validate configuration structure', async () => {
      const tests = [
        {
          config: { enabledGreetingPatterns: 'not an array' },
          error: 'enabledGreetingPatterns must be an array'
        },
        {
          config: { minimumConfidenceThreshold: -0.1 },
          error: 'minimumConfidenceThreshold must be a number between 0 and 1'
        },
        {
          config: { enableFuzzyMatching: 'not a boolean' },
          error: 'enableFuzzyMatching must be a boolean'
        },
        {
          config: { excludeGenericEmails: 'not a boolean' },
          error: 'excludeGenericEmails must be a boolean'
        }
      ];

      for (const test of tests) {
        await expect(configManager.updateConfig(test.config as any)).rejects.toThrow(test.error);
      }
    });

    it('should validate preferences structure', async () => {
      const tests = [
        {
          preferences: { showSuccessNotifications: 'not a boolean' },
          error: 'showSuccessNotifications must be a boolean'
        },
        {
          preferences: { autoCorrectSuggestions: 'not a boolean' },
          error: 'autoCorrectSuggestions must be a boolean'
        },
        {
          preferences: { warningDisplayDuration: 50000 },
          error: 'warningDisplayDuration must be a number between 1000 and 30000'
        }
      ];

      for (const test of tests) {
        await expect(configManager.updatePreferences(test.preferences as any)).rejects.toThrow(test.error);
      }
    });
  });

  describe('Storage Error Handling', () => {
    beforeEach(async () => {
      await configManager.initialize();
    });

    it('should handle save errors gracefully', async () => {
      mockOfficeContext.roamingSettings.saveAsync.mockImplementation((callback) => {
        callback({
          status: 'failed',
          error: { message: 'Storage full' }
        });
      });
      
      await expect(configManager.updateConfig({ minimumConfidenceThreshold: 0.8 }))
        .rejects.toThrow('Failed to save configuration: Storage full');
    });

    it('should handle Office API unavailability', async () => {
      (global as any).Office = { context: { roamingSettings: null } };
      
      await expect(configManager.updateConfig({ minimumConfidenceThreshold: 0.8 }))
        .rejects.toThrow('Office roaming settings not available');
    });
  });

  describe('Default Values', () => {
    it('should have valid default configuration', () => {
      expect(DEFAULT_CONFIG.minimumConfidenceThreshold).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_CONFIG.minimumConfidenceThreshold).toBeLessThanOrEqual(1);
      expect(Array.isArray(DEFAULT_CONFIG.enabledGreetingPatterns)).toBe(true);
      expect(DEFAULT_CONFIG.enabledGreetingPatterns.length).toBeGreaterThan(0);
      
      // Validate all default patterns are valid regex
      DEFAULT_CONFIG.enabledGreetingPatterns.forEach((pattern, index) => {
        expect(() => new RegExp(pattern)).not.toThrow();
      });
    });

    it('should have valid default preferences', () => {
      expect(typeof DEFAULT_PREFERENCES.showSuccessNotifications).toBe('boolean');
      expect(typeof DEFAULT_PREFERENCES.autoCorrectSuggestions).toBe('boolean');
      expect(DEFAULT_PREFERENCES.warningDisplayDuration).toBeGreaterThanOrEqual(1000);
      expect(DEFAULT_PREFERENCES.warningDisplayDuration).toBeLessThanOrEqual(30000);
    });
  });

  describe('Immutability', () => {
    beforeEach(async () => {
      await configManager.initialize();
    });

    it('should return immutable copies of configuration', () => {
      const config1 = configManager.getConfig();
      const config2 = configManager.getConfig();
      
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
      
      config1.minimumConfidenceThreshold = 0.9;
      expect(configManager.getConfig().minimumConfidenceThreshold).not.toBe(0.9);
    });

    it('should return immutable copies of preferences', () => {
      const prefs1 = configManager.getPreferences();
      const prefs2 = configManager.getPreferences();
      
      expect(prefs1).not.toBe(prefs2);
      expect(prefs1).toEqual(prefs2);
      
      prefs1.showSuccessNotifications = true;
      expect(configManager.getPreferences().showSuccessNotifications).not.toBe(true);
    });
  });
});