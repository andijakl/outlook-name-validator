/**
 * Memory usage optimization for recipient caching and data management
 * Implements intelligent caching strategies and memory cleanup
 */

import { ParsedRecipient, ValidationResult } from './interfaces';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  oldestEntry: number;
  newestEntry: number;
}

export interface MemoryOptimizationConfig {
  maxCacheSize: number;
  maxEntries: number;
  ttlMs: number;
  cleanupIntervalMs: number;
  compressionThreshold: number;
  enableCompression: boolean;
}

/**
 * Intelligent cache with memory optimization
 */
export class OptimizedCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private config: MemoryOptimizationConfig;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };
  private cleanupTimer?: number;

  constructor(config: Partial<MemoryOptimizationConfig> = {}) {
    this.config = {
      maxCacheSize: 10 * 1024 * 1024, // 10MB
      maxEntries: 1000,
      ttlMs: 5 * 60 * 1000, // 5 minutes
      cleanupIntervalMs: 60 * 1000, // 1 minute
      compressionThreshold: 1024, // 1KB
      enableCompression: true,
      ...config
    };

    this.startCleanupTimer();
  }

  /**
   * Get item from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;

    return this.decompressData(entry.data);
  }

  /**
   * Set item in cache
   */
  set(key: string, data: T): void {
    const now = Date.now();
    const compressedData = this.compressData(data);
    const size = this.estimateSize(compressedData);

    const entry: CacheEntry<T> = {
      data: compressedData,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now,
      size
    };

    // Check if we need to make space
    this.ensureSpace(size);

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const timestamps = entries.map(e => e.timestamp);

    return {
      totalEntries: this.cache.size,
      totalSize,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      missRate: this.stats.misses / (this.stats.hits + this.stats.misses) || 0,
      evictionCount: this.stats.evictions,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0
    };
  }

  /**
   * Force cleanup of expired entries
   */
  cleanup(): number {
    const before = this.cache.size;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
      }
    }

    return before - this.cache.size;
  }

  /**
   * Optimize cache by removing least recently used entries
   */
  optimize(): number {
    const entries = Array.from(this.cache.entries());
    const totalSize = entries.reduce((sum, [, entry]) => sum + entry.size, 0);

    if (totalSize <= this.config.maxCacheSize && entries.length <= this.config.maxEntries) {
      return 0;
    }

    // Sort by access score (combination of recency and frequency)
    entries.sort(([, a], [, b]) => {
      const scoreA = this.calculateAccessScore(a);
      const scoreB = this.calculateAccessScore(b);
      return scoreA - scoreB; // Ascending order (lowest scores first)
    });

    let removedCount = 0;
    let currentSize = totalSize;

    // Remove entries until we're under limits
    for (const [key, entry] of entries) {
      if (currentSize <= this.config.maxCacheSize * 0.8 && 
          this.cache.size <= this.config.maxEntries * 0.8) {
        break;
      }

      this.cache.delete(key);
      currentSize -= entry.size;
      removedCount++;
      this.stats.evictions++;
    }

    return removedCount;
  }

  /**
   * Dispose of cache and cleanup resources
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > this.config.ttlMs;
  }

  /**
   * Ensure there's space for new entry
   */
  private ensureSpace(newEntrySize: number): void {
    const currentSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);

    if (currentSize + newEntrySize > this.config.maxCacheSize || 
        this.cache.size >= this.config.maxEntries) {
      this.optimize();
    }
  }

  /**
   * Calculate access score for LRU eviction
   */
  private calculateAccessScore(entry: CacheEntry<T>): number {
    const now = Date.now();
    const recencyScore = (now - entry.lastAccessed) / this.config.ttlMs;
    const frequencyScore = 1 / (entry.accessCount + 1);
    return recencyScore + frequencyScore;
  }

  /**
   * Compress data if enabled and above threshold
   */
  private compressData(data: T): T {
    if (!this.config.enableCompression) {
      return data;
    }

    const size = this.estimateSize(data);
    if (size < this.config.compressionThreshold) {
      return data;
    }

    // Simple compression simulation (in real implementation, use actual compression)
    try {
      const jsonString = JSON.stringify(data);
      if (jsonString.length > this.config.compressionThreshold) {
        // Placeholder for actual compression logic
        return data;
      }
    } catch {
      // If serialization fails, return original data
    }

    return data;
  }

  /**
   * Decompress data if needed
   */
  private decompressData(data: T): T {
    // Placeholder for decompression logic
    return data;
  }

  /**
   * Estimate memory size of data
   */
  private estimateSize(data: T): number {
    try {
      const jsonString = JSON.stringify(data);
      return jsonString.length * 2; // Rough estimate (UTF-16)
    } catch {
      return 1000; // Default estimate
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = window.setInterval(() => {
      this.cleanup();
      this.optimize();
    }, this.config.cleanupIntervalMs);
  }
}

/**
 * Memory-optimized recipient cache
 */
export class RecipientCache extends OptimizedCache<ParsedRecipient[]> {
  constructor() {
    super({
      maxCacheSize: 5 * 1024 * 1024, // 5MB for recipients
      maxEntries: 500,
      ttlMs: 10 * 60 * 1000, // 10 minutes
      enableCompression: true
    });
  }

  /**
   * Generate cache key for recipients
   */
  generateKey(recipients: any[]): string {
    const emails = recipients.map(r => r.email || r.emailAddress).sort();
    return `recipients:${emails.join(',')}`;
  }

  /**
   * Cache recipients with automatic key generation
   */
  cacheRecipients(recipients: any[], parsedRecipients: ParsedRecipient[]): void {
    const key = this.generateKey(recipients);
    this.set(key, parsedRecipients);
  }

  /**
   * Get cached recipients
   */
  getCachedRecipients(recipients: any[]): ParsedRecipient[] | undefined {
    const key = this.generateKey(recipients);
    return this.get(key);
  }
}

/**
 * Memory-optimized validation results cache
 */
export class ValidationResultsCache extends OptimizedCache<ValidationResult[]> {
  constructor() {
    super({
      maxCacheSize: 2 * 1024 * 1024, // 2MB for validation results
      maxEntries: 200,
      ttlMs: 5 * 60 * 1000, // 5 minutes
      enableCompression: false // Results are usually small
    });
  }

  /**
   * Generate cache key for validation
   */
  generateKey(content: string, recipients: ParsedRecipient[]): string {
    const contentHash = this.simpleHash(content.substring(0, 500)); // First 500 chars
    const recipientEmails = recipients.map(r => r.email).sort().join(',');
    return `validation:${contentHash}:${this.simpleHash(recipientEmails)}`;
  }

  /**
   * Cache validation results
   */
  cacheValidation(content: string, recipients: ParsedRecipient[], results: ValidationResult[]): void {
    const key = this.generateKey(content, recipients);
    this.set(key, results);
  }

  /**
   * Get cached validation results
   */
  getCachedValidation(content: string, recipients: ParsedRecipient[]): ValidationResult[] | undefined {
    const key = this.generateKey(content, recipients);
    return this.get(key);
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
}

/**
 * Memory monitor for tracking usage
 */
export class MemoryMonitor {
  private measurements: number[] = [];
  private readonly maxMeasurements = 100;

  /**
   * Record current memory usage
   */
  recordUsage(): number {
    const usage = this.getCurrentMemoryUsage();
    this.measurements.push(usage);
    
    if (this.measurements.length > this.maxMeasurements) {
      this.measurements.shift();
    }
    
    return usage;
  }

  /**
   * Get current memory usage estimate
   */
  getCurrentMemoryUsage(): number {
    // Use performance.memory if available (Chrome)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize || 0;
    }
    
    // Fallback estimation
    return this.estimateMemoryUsage();
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): {
    current: number;
    average: number;
    peak: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  } {
    if (this.measurements.length === 0) {
      return { current: 0, average: 0, peak: 0, trend: 'stable' };
    }

    const current = this.measurements[this.measurements.length - 1];
    const average = this.measurements.reduce((sum, m) => sum + m, 0) / this.measurements.length;
    const peak = Math.max(...this.measurements);
    
    // Calculate trend
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (this.measurements.length >= 10) {
      const recent = this.measurements.slice(-10);
      const older = this.measurements.slice(-20, -10);
      
      if (older.length > 0) {
        const recentAvg = recent.reduce((sum, m) => sum + m, 0) / recent.length;
        const olderAvg = older.reduce((sum, m) => sum + m, 0) / older.length;
        
        if (recentAvg > olderAvg * 1.1) {
          trend = 'increasing';
        } else if (recentAvg < olderAvg * 0.9) {
          trend = 'decreasing';
        }
      }
    }

    return { current, average, peak, trend };
  }

  /**
   * Check if memory usage is high
   */
  isMemoryUsageHigh(): boolean {
    const stats = this.getMemoryStats();
    const threshold = 50 * 1024 * 1024; // 50MB threshold
    return stats.current > threshold || stats.trend === 'increasing';
  }

  /**
   * Estimate memory usage (fallback method)
   */
  private estimateMemoryUsage(): number {
    // Very rough estimation based on DOM elements and known objects
    const domElements = document.querySelectorAll('*').length;
    const estimatedDomMemory = domElements * 100; // ~100 bytes per element
    
    // Add some base memory for scripts and other objects
    const baseMemory = 5 * 1024 * 1024; // 5MB base
    
    return baseMemory + estimatedDomMemory;
  }
}

/**
 * Global memory optimizer instances
 */
export const globalRecipientCache = new RecipientCache();
export const globalValidationCache = new ValidationResultsCache();
export const globalMemoryMonitor = new MemoryMonitor();