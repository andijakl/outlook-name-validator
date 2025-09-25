/**
 * Lazy loading system for validation components
 * Loads validation logic only when needed to improve initial load performance
 */

import { SupportedLanguage } from './email-content-parser';

export interface LazyLoadableComponent {
  isLoaded(): boolean;
  load(): Promise<void>;
  unload(): void;
}

export interface ComponentFactory<T> {
  create(...args: any[]): Promise<T>;
}

/**
 * Lazy loader for validation components
 */
export class LazyLoader {
  private loadedComponents = new Map<string, any>();
  private loadingPromises = new Map<string, Promise<any>>();
  private componentFactories = new Map<string, ComponentFactory<any>>();

  /**
   * Register a component factory for lazy loading
   */
  register<T>(componentName: string, factory: ComponentFactory<T>): void {
    this.componentFactories.set(componentName, factory);
  }

  /**
   * Load a component lazily
   */
  async load<T>(componentName: string, ...args: any[]): Promise<T> {
    // Create a unique key that includes parameters for components that need them
    const componentKey = args.length > 0 ? `${componentName}_${JSON.stringify(args)}` : componentName;
    
    // Return already loaded component
    if (this.loadedComponents.has(componentKey)) {
      return this.loadedComponents.get(componentKey);
    }

    // Return existing loading promise
    if (this.loadingPromises.has(componentKey)) {
      return this.loadingPromises.get(componentKey);
    }

    // Start loading
    const factory = this.componentFactories.get(componentName);
    if (!factory) {
      throw new Error(`Component factory not found: ${componentName}`);
    }

    const loadingPromise = factory.create(...args);
    this.loadingPromises.set(componentKey, loadingPromise);

    try {
      const component = await loadingPromise;
      this.loadedComponents.set(componentKey, component);
      this.loadingPromises.delete(componentKey);
      return component;
    } catch (error) {
      this.loadingPromises.delete(componentKey);
      throw error;
    }
  }

  /**
   * Check if a component is loaded
   */
  isLoaded(componentName: string): boolean {
    return this.loadedComponents.has(componentName);
  }

  /**
   * Unload a component to free memory
   */
  unload(componentName: string): void {
    const component = this.loadedComponents.get(componentName);
    if (component && typeof component.dispose === 'function') {
      component.dispose();
    }
    this.loadedComponents.delete(componentName);
  }

  /**
   * Unload all components
   */
  unloadAll(): void {
    for (const [componentName] of this.loadedComponents) {
      this.unload(componentName);
    }
  }

  /**
   * Get loaded component names
   */
  getLoadedComponents(): string[] {
    return Array.from(this.loadedComponents.keys());
  }

  /**
   * Get loading component names
   */
  getLoadingComponents(): string[] {
    return Array.from(this.loadingPromises.keys());
  }
}

/**
 * Lazy loadable email content parser
 */
export class LazyEmailContentParser implements LazyLoadableComponent {
  private parser?: any;
  private loaded = false;
  private language?: SupportedLanguage;

  constructor(language?: SupportedLanguage) {
    this.language = language;
  }

  async load(): Promise<void> {
    if (this.loaded) return;

    // Dynamically import the parser
    const { EmailContentParserImpl } = await import('./email-content-parser');
    this.parser = new EmailContentParserImpl(this.language);
    this.loaded = true;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  unload(): void {
    this.parser = undefined;
    this.loaded = false;
  }

  async parseEmailContent(content: string): Promise<any> {
    if (!this.loaded) {
      await this.load();
    }
    return this.parser.parseEmailContent(content);
  }

  async extractGreetings(emailBody: string): Promise<any[]> {
    if (!this.loaded) {
      await this.load();
    }
    return this.parser.extractGreetings(emailBody);
  }
}

/**
 * Lazy loadable recipient parser
 */
export class LazyRecipientParser implements LazyLoadableComponent {
  private parser?: any;
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;

    const { RecipientParser } = await import('./recipient-parser');
    this.parser = new RecipientParser();
    this.loaded = true;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  unload(): void {
    this.parser = undefined;
    this.loaded = false;
  }

  async parseEmailAddress(email: string, displayName?: string): Promise<any> {
    if (!this.loaded) {
      await this.load();
    }
    return this.parser.parseEmailAddress(email, displayName);
  }

  async extractAllRecipients(recipients: any[]): Promise<any[]> {
    if (!this.loaded) {
      await this.load();
    }
    return this.parser.extractAllRecipients(recipients);
  }
}

/**
 * Lazy loadable name matching engine
 */
export class LazyNameMatchingEngine implements LazyLoadableComponent {
  private engine?: any;
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;

    const { NameMatchingEngine } = await import('./name-matching-engine');
    this.engine = new NameMatchingEngine();
    this.loaded = true;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  unload(): void {
    this.engine = undefined;
    this.loaded = false;
  }

  async validateNames(greetings: any[], recipients: any[]): Promise<any[]> {
    if (!this.loaded) {
      await this.load();
    }
    return this.engine.validateNames(greetings, recipients);
  }

  async findBestMatch(greetingName: string, recipients: any[]): Promise<any> {
    if (!this.loaded) {
      await this.load();
    }
    return this.engine.findBestMatch(greetingName, recipients);
  }
}

/**
 * Component factories for lazy loading
 */
export const componentFactories = {
  emailParser: {
    create: async (language?: SupportedLanguage): Promise<LazyEmailContentParser> => new LazyEmailContentParser(language)
  },
  recipientParser: {
    create: async (): Promise<LazyRecipientParser> => new LazyRecipientParser()
  },
  nameMatchingEngine: {
    create: async (): Promise<LazyNameMatchingEngine> => new LazyNameMatchingEngine()
  }
};

/**
 * Global lazy loader instance
 */
export const globalLazyLoader = new LazyLoader();

// Register component factories with proper typing
globalLazyLoader.register<LazyEmailContentParser>('emailParser', componentFactories.emailParser);
globalLazyLoader.register<LazyRecipientParser>('recipientParser', componentFactories.recipientParser);
globalLazyLoader.register<LazyNameMatchingEngine>('nameMatchingEngine', componentFactories.nameMatchingEngine);