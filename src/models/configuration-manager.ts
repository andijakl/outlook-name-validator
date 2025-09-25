/**
 * Configuration and user preferences management for Outlook Name Validator
 * Handles storage, retrieval, and validation of user settings using Office settings API
 */

import { ValidationConfig, UserPreferences } from './interfaces';

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: ValidationConfig = {
  enabledGreetingPatterns: [
    'Hi\\s+([A-Za-z]+)',
    'Hello\\s+([A-Za-z]+)',
    'Dear\\s+([A-Za-z]+)',
    'Hey\\s+([A-Za-z]+)',
    'Good\\s+morning\\s+([A-Za-z]+)',
    'Good\\s+afternoon\\s+([A-Za-z]+)',
    'Good\\s+evening\\s+([A-Za-z]+)'
  ],
  minimumConfidenceThreshold: 0.7,
  enableFuzzyMatching: true,
  excludeGenericEmails: true,
  language: 'auto'
};

/**
 * Default user preferences
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
  showSuccessNotifications: false,
  autoCorrectSuggestions: true,
  warningDisplayDuration: 5000
};

/**
 * Configuration manager for handling user settings and preferences
 */
export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private config: ValidationConfig;
  private preferences: UserPreferences;
  private isInitialized: boolean = false;

  private constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.preferences = { ...DEFAULT_PREFERENCES };
  }

  /**
   * Get singleton instance of configuration manager
   */
  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  /**
   * Initialize configuration manager and load settings from Office storage
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.loadConfiguration();
      await this.loadPreferences();
      this.isInitialized = true;
    } catch (error) {
      console.warn('Failed to initialize configuration manager:', error);
      // Use defaults if loading fails
      this.config = { ...DEFAULT_CONFIG };
      this.preferences = { ...DEFAULT_PREFERENCES };
      this.isInitialized = true;
    }
  }

  /**
   * Get current validation configuration
   */
  public getConfig(): ValidationConfig {
    return { ...this.config };
  }

  /**
   * Get current user preferences
   */
  public getPreferences(): UserPreferences {
    return { ...this.preferences };
  }

  /**
   * Update validation configuration
   */
  public async updateConfig(newConfig: Partial<ValidationConfig>): Promise<void> {
    const updatedConfig = { ...this.config, ...newConfig };
    
    // Validate configuration before saving
    this.validateConfig(updatedConfig);
    
    this.config = updatedConfig;
    await this.saveConfiguration();
  }

  /**
   * Update user preferences
   */
  public async updatePreferences(newPreferences: Partial<UserPreferences>): Promise<void> {
    const updatedPreferences = { ...this.preferences, ...newPreferences };
    
    // Validate preferences before saving
    this.validatePreferences(updatedPreferences);
    
    this.preferences = updatedPreferences;
    await this.savePreferences();
  }

  /**
   * Reset configuration to defaults
   */
  public async resetConfig(): Promise<void> {
    this.config = { ...DEFAULT_CONFIG };
    await this.saveConfiguration();
  }

  /**
   * Reset preferences to defaults
   */
  public async resetPreferences(): Promise<void> {
    this.preferences = { ...DEFAULT_PREFERENCES };
    await this.savePreferences();
  }

  /**
   * Load configuration from Office settings
   */
  private async loadConfiguration(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!Office?.context?.roamingSettings) {
        reject(new Error('Office roaming settings not available'));
        return;
      }

      try {
        const savedConfig = Office.context.roamingSettings.get('validationConfig');
        if (savedConfig) {
          const parsedConfig = JSON.parse(savedConfig);
          this.validateConfig(parsedConfig);
          this.config = { ...DEFAULT_CONFIG, ...parsedConfig };
        }
        resolve();
      } catch (error) {
        reject(new Error(`Failed to load configuration: ${error}`));
      }
    });
  }

  /**
   * Load preferences from Office settings
   */
  private async loadPreferences(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!Office?.context?.roamingSettings) {
        reject(new Error('Office roaming settings not available'));
        return;
      }

      try {
        const savedPreferences = Office.context.roamingSettings.get('userPreferences');
        if (savedPreferences) {
          const parsedPreferences = JSON.parse(savedPreferences);
          this.validatePreferences(parsedPreferences);
          this.preferences = { ...DEFAULT_PREFERENCES, ...parsedPreferences };
        }
        resolve();
      } catch (error) {
        reject(new Error(`Failed to load preferences: ${error}`));
      }
    });
  }

  /**
   * Save configuration to Office settings
   */
  private async saveConfiguration(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!Office?.context?.roamingSettings) {
        reject(new Error('Office roaming settings not available'));
        return;
      }

      try {
        Office.context.roamingSettings.set('validationConfig', JSON.stringify(this.config));
        Office.context.roamingSettings.saveAsync((result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            resolve();
          } else {
            reject(new Error(`Failed to save configuration: ${result.error?.message}`));
          }
        });
      } catch (error) {
        reject(new Error(`Failed to save configuration: ${error}`));
      }
    });
  }

  /**
   * Save preferences to Office settings
   */
  private async savePreferences(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!Office?.context?.roamingSettings) {
        reject(new Error('Office roaming settings not available'));
        return;
      }

      try {
        Office.context.roamingSettings.set('userPreferences', JSON.stringify(this.preferences));
        Office.context.roamingSettings.saveAsync((result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            resolve();
          } else {
            reject(new Error(`Failed to save preferences: ${result.error?.message}`));
          }
        });
      } catch (error) {
        reject(new Error(`Failed to save preferences: ${error}`));
      }
    });
  }

  /**
   * Validate configuration object
   */
  private validateConfig(config: ValidationConfig): void {
    if (!config.enabledGreetingPatterns || !Array.isArray(config.enabledGreetingPatterns)) {
      throw new Error('enabledGreetingPatterns must be an array');
    }

    if (typeof config.minimumConfidenceThreshold !== 'number' || 
        config.minimumConfidenceThreshold < 0 || 
        config.minimumConfidenceThreshold > 1) {
      throw new Error('minimumConfidenceThreshold must be a number between 0 and 1');
    }

    if (typeof config.enableFuzzyMatching !== 'boolean') {
      throw new Error('enableFuzzyMatching must be a boolean');
    }

    if (typeof config.excludeGenericEmails !== 'boolean') {
      throw new Error('excludeGenericEmails must be a boolean');
    }

    if (!['en', 'de', 'auto'].includes(config.language)) {
      throw new Error('language must be one of: en, de, auto');
    }

    // Validate regex patterns
    config.enabledGreetingPatterns.forEach((pattern, index) => {
      try {
        new RegExp(pattern);
      } catch (error) {
        throw new Error(`Invalid regex pattern at index ${index}: ${pattern}`);
      }
    });
  }

  /**
   * Validate preferences object
   */
  private validatePreferences(preferences: UserPreferences): void {
    if (typeof preferences.showSuccessNotifications !== 'boolean') {
      throw new Error('showSuccessNotifications must be a boolean');
    }

    if (typeof preferences.autoCorrectSuggestions !== 'boolean') {
      throw new Error('autoCorrectSuggestions must be a boolean');
    }

    if (typeof preferences.warningDisplayDuration !== 'number' || 
        preferences.warningDisplayDuration < 1000 || 
        preferences.warningDisplayDuration > 30000) {
      throw new Error('warningDisplayDuration must be a number between 1000 and 30000');
    }
  }
}