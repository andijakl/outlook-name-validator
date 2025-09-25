/**
 * Settings UI component for user customization of validation behavior
 * Provides interface for modifying configuration and preferences
 */

import { ConfigurationManager } from '../models/configuration-manager';
import { ValidationConfig, UserPreferences } from '../models/interfaces';

/**
 * Settings UI manager for handling user interface interactions
 */
export class SettingsUI {
  private configManager: ConfigurationManager;
  private container: HTMLElement | null = null;

  constructor() {
    this.configManager = ConfigurationManager.getInstance();
  }

  /**
   * Initialize settings UI in the specified container
   */
  public async initialize(containerId: string): Promise<void> {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container element with id '${containerId}' not found`);
    }

    await this.configManager.initialize();
    this.renderSettingsUI();
    this.attachEventListeners();
  }

  /**
   * Render the complete settings UI
   */
  private renderSettingsUI(): void {
    if (!this.container) return;

    const config = this.configManager.getConfig();
    const preferences = this.configManager.getPreferences();

    this.container.innerHTML = `
      <div class="settings-container">
        <h2>Name Validator Settings</h2>
        
        <!-- Validation Configuration Section -->
        <div class="settings-section">
          <h3>Validation Configuration</h3>
          
          <div class="setting-item">
            <label for="confidence-threshold">Minimum Confidence Threshold:</label>
            <input type="range" id="confidence-threshold" min="0.1" max="1.0" step="0.1" 
                   value="${config.minimumConfidenceThreshold}">
            <span class="threshold-value">${config.minimumConfidenceThreshold}</span>
          </div>

          <div class="setting-item">
            <label>
              <input type="checkbox" id="fuzzy-matching" 
                     ${config.enableFuzzyMatching ? 'checked' : ''}>
              Enable fuzzy matching for misspellings
            </label>
          </div>

          <div class="setting-item">
            <label>
              <input type="checkbox" id="exclude-generic" 
                     ${config.excludeGenericEmails ? 'checked' : ''}>
              Exclude generic email addresses (info@, support@, etc.)
            </label>
          </div>

          <div class="setting-item">
            <label for="language-select">Language for greeting detection:</label>
            <select id="language-select">
              <option value="auto" ${config.language === 'auto' ? 'selected' : ''}>Auto-detect</option>
              <option value="en" ${config.language === 'en' ? 'selected' : ''}>English</option>
              <option value="de" ${config.language === 'de' ? 'selected' : ''}>German (Deutsch)</option>
            </select>
          </div>

          <div class="setting-item">
            <label for="greeting-patterns">Greeting Patterns:</label>
            <div class="pattern-list" id="pattern-list">
              ${this.renderGreetingPatterns(config.enabledGreetingPatterns)}
            </div>
            <button type="button" id="add-pattern-btn" class="add-button">Add Pattern</button>
          </div>
        </div>

        <!-- User Preferences Section -->
        <div class="settings-section">
          <h3>User Preferences</h3>
          
          <div class="setting-item">
            <label>
              <input type="checkbox" id="success-notifications" 
                     ${preferences.showSuccessNotifications ? 'checked' : ''}>
              Show notifications when validation passes
            </label>
          </div>

          <div class="setting-item">
            <label>
              <input type="checkbox" id="auto-correct" 
                     ${preferences.autoCorrectSuggestions ? 'checked' : ''}>
              Automatically suggest corrections
            </label>
          </div>

          <div class="setting-item">
            <label for="warning-duration">Warning Display Duration (seconds):</label>
            <input type="number" id="warning-duration" min="1" max="30" 
                   value="${preferences.warningDisplayDuration / 1000}">
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="settings-actions">
          <button type="button" id="save-settings" class="primary-button">Save Settings</button>
          <button type="button" id="reset-settings" class="secondary-button">Reset to Defaults</button>
          <button type="button" id="cancel-settings" class="secondary-button">Cancel</button>
        </div>

        <!-- Status Message -->
        <div id="settings-status" class="status-message" style="display: none;"></div>
      </div>
    `;
  }

  /**
   * Render greeting patterns list
   */
  private renderGreetingPatterns(patterns: string[]): string {
    return patterns.map((pattern, index) => `
      <div class="pattern-item" data-index="${index}">
        <input type="text" class="pattern-input" value="${pattern}" data-index="${index}">
        <button type="button" class="remove-pattern" data-index="${index}">Remove</button>
      </div>
    `).join('');
  }

  /**
   * Attach event listeners to UI elements
   */
  private attachEventListeners(): void {
    if (!this.container) return;

    // Confidence threshold slider
    const thresholdSlider = this.container.querySelector('#confidence-threshold') as HTMLInputElement;
    const thresholdValue = this.container.querySelector('.threshold-value') as HTMLSpanElement;
    
    thresholdSlider?.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      thresholdValue.textContent = target.value;
    });

    // Add pattern button
    const addPatternBtn = this.container.querySelector('#add-pattern-btn');
    addPatternBtn?.addEventListener('click', () => this.addGreetingPattern());

    // Remove pattern buttons (delegated event handling)
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('remove-pattern')) {
        const index = parseInt(target.dataset.index || '0');
        this.removeGreetingPattern(index);
      }
    });

    // Save settings button
    const saveBtn = this.container.querySelector('#save-settings');
    saveBtn?.addEventListener('click', () => this.saveSettings());

    // Reset settings button
    const resetBtn = this.container.querySelector('#reset-settings');
    resetBtn?.addEventListener('click', () => this.resetSettings());

    // Cancel button
    const cancelBtn = this.container.querySelector('#cancel-settings');
    cancelBtn?.addEventListener('click', () => this.cancelSettings());
  }

  /**
   * Add a new greeting pattern input
   */
  private addGreetingPattern(): void {
    const patternList = this.container?.querySelector('#pattern-list');
    if (!patternList) return;

    const newIndex = patternList.children.length;
    const patternDiv = document.createElement('div');
    patternDiv.className = 'pattern-item';
    patternDiv.dataset.index = newIndex.toString();
    patternDiv.innerHTML = `
      <input type="text" class="pattern-input" value="" data-index="${newIndex}" 
             placeholder="Enter regex pattern (e.g., Hi\\s+([A-Za-z]+))">
      <button type="button" class="remove-pattern" data-index="${newIndex}">Remove</button>
    `;
    
    patternList.appendChild(patternDiv);
  }

  /**
   * Remove a greeting pattern
   */
  private removeGreetingPattern(index: number): void {
    const patternItem = this.container?.querySelector(`[data-index="${index}"]`);
    patternItem?.remove();
    
    // Re-index remaining patterns
    const patternItems = this.container?.querySelectorAll('.pattern-item');
    patternItems?.forEach((item, newIndex) => {
      const element = item as HTMLElement;
      element.dataset.index = newIndex.toString();
      const input = element.querySelector('.pattern-input') as HTMLInputElement;
      const button = element.querySelector('.remove-pattern') as HTMLButtonElement;
      if (input) input.dataset.index = newIndex.toString();
      if (button) button.dataset.index = newIndex.toString();
    });
  }

  /**
   * Save current settings
   */
  private async saveSettings(): Promise<void> {
    try {
      const config = this.collectConfigurationData();
      const preferences = this.collectPreferencesData();

      await this.configManager.updateConfig(config);
      await this.configManager.updatePreferences(preferences);

      this.showStatusMessage('Settings saved successfully!', 'success');
    } catch (error) {
      this.showStatusMessage(`Failed to save settings: ${error}`, 'error');
    }
  }

  /**
   * Reset settings to defaults
   */
  private async resetSettings(): Promise<void> {
    try {
      await this.configManager.resetConfig();
      await this.configManager.resetPreferences();
      
      this.renderSettingsUI();
      this.attachEventListeners();
      
      this.showStatusMessage('Settings reset to defaults', 'success');
    } catch (error) {
      this.showStatusMessage(`Failed to reset settings: ${error}`, 'error');
    }
  }

  /**
   * Cancel settings changes
   */
  private cancelSettings(): void {
    this.renderSettingsUI();
    this.attachEventListeners();
    this.showStatusMessage('Changes cancelled', 'info');
  }

  /**
   * Collect configuration data from UI
   */
  private collectConfigurationData(): Partial<ValidationConfig> {
    if (!this.container) throw new Error('Container not initialized');

    const thresholdInput = this.container.querySelector('#confidence-threshold') as HTMLInputElement;
    const fuzzyMatchingInput = this.container.querySelector('#fuzzy-matching') as HTMLInputElement;
    const excludeGenericInput = this.container.querySelector('#exclude-generic') as HTMLInputElement;
    const languageSelect = this.container.querySelector('#language-select') as HTMLSelectElement;
    
    const patternInputs = this.container.querySelectorAll('.pattern-input') as NodeListOf<HTMLInputElement>;
    const patterns = Array.from(patternInputs)
      .map(input => input.value.trim())
      .filter(pattern => pattern.length > 0);

    return {
      minimumConfidenceThreshold: parseFloat(thresholdInput.value),
      enableFuzzyMatching: fuzzyMatchingInput.checked,
      excludeGenericEmails: excludeGenericInput.checked,
      enabledGreetingPatterns: patterns,
      language: languageSelect.value as 'en' | 'de' | 'auto'
    };
  }

  /**
   * Collect preferences data from UI
   */
  private collectPreferencesData(): Partial<UserPreferences> {
    if (!this.container) throw new Error('Container not initialized');

    const successNotificationsInput = this.container.querySelector('#success-notifications') as HTMLInputElement;
    const autoCorrectInput = this.container.querySelector('#auto-correct') as HTMLInputElement;
    const warningDurationInput = this.container.querySelector('#warning-duration') as HTMLInputElement;

    return {
      showSuccessNotifications: successNotificationsInput.checked,
      autoCorrectSuggestions: autoCorrectInput.checked,
      warningDisplayDuration: parseInt(warningDurationInput.value) * 1000
    };
  }

  /**
   * Show status message to user
   */
  private showStatusMessage(message: string, type: 'success' | 'error' | 'info'): void {
    const statusElement = this.container?.querySelector('#settings-status') as HTMLElement;
    if (!statusElement) return;

    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    statusElement.style.display = 'block';

    // Hide message after 3 seconds
    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 3000);
  }
}