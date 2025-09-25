/**
 * Performance monitoring and metrics collection for the Outlook Name Validator
 * Tracks validation performance, memory usage, and provides optimization insights
 */

export interface PerformanceMetrics {
  validationTime: number;
  parseTime: number;
  matchingTime: number;
  memoryUsage: number;
  recipientCount: number;
  contentLength: number;
  cacheHitRate: number;
  timestamp: number;
}

export interface PerformanceThresholds {
  maxValidationTime: number;
  maxMemoryUsage: number;
  maxContentLength: number;
  maxRecipientCount: number;
}

export interface PerformanceReport {
  averageValidationTime: number;
  peakMemoryUsage: number;
  totalValidations: number;
  cacheEfficiency: number;
  slowOperations: PerformanceMetrics[];
  recommendations: string[];
}

/**
 * Performance monitoring class
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetricsHistory = 100;
  private thresholds: PerformanceThresholds;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = {
      maxValidationTime: 2000, // 2 seconds
      maxMemoryUsage: 50 * 1024 * 1024, // 50MB
      maxContentLength: 100000, // 100KB
      maxRecipientCount: 50,
      ...thresholds
    };
  }

  /**
   * Start a performance measurement session
   */
  startMeasurement(): PerformanceMeasurement {
    return new PerformanceMeasurement(this);
  }

  /**
   * Record a completed measurement
   */
  recordMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }

    // Log performance warnings
    this.checkThresholds(metrics);
  }

  /**
   * Record cache hit
   */
  recordCacheHit(): void {
    this.cacheHits++;
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(): void {
    this.cacheMisses++;
  }

  /**
   * Get current cache hit rate
   */
  getCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    return total > 0 ? this.cacheHits / total : 0;
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): PerformanceReport {
    if (this.metrics.length === 0) {
      return {
        averageValidationTime: 0,
        peakMemoryUsage: 0,
        totalValidations: 0,
        cacheEfficiency: 0,
        slowOperations: [],
        recommendations: ['No performance data available yet']
      };
    }

    const averageValidationTime = this.metrics.reduce((sum, m) => sum + m.validationTime, 0) / this.metrics.length;
    const peakMemoryUsage = Math.max(...this.metrics.map(m => m.memoryUsage));
    const slowOperations = this.metrics.filter(m => m.validationTime > this.thresholds.maxValidationTime);
    
    return {
      averageValidationTime,
      peakMemoryUsage,
      totalValidations: this.metrics.length,
      cacheEfficiency: this.getCacheHitRate(),
      slowOperations,
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Get current memory usage estimate
   */
  getCurrentMemoryUsage(): number {
    // Estimate memory usage based on stored metrics and cache
    const metricsMemory = this.metrics.length * 200; // Rough estimate per metric
    const cacheMemory = (this.cacheHits + this.cacheMisses) * 1000; // Rough estimate per cache entry
    return metricsMemory + cacheMemory;
  }

  /**
   * Clear old metrics to free memory
   */
  clearOldMetrics(keepCount: number = 20): void {
    if (this.metrics.length > keepCount) {
      this.metrics = this.metrics.slice(-keepCount);
    }
  }

  /**
   * Reset all performance data
   */
  reset(): void {
    this.metrics = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Check if metrics exceed thresholds and log warnings
   */
  private checkThresholds(metrics: PerformanceMetrics): void {
    if (metrics.validationTime > this.thresholds.maxValidationTime) {
      console.warn(`Validation time exceeded threshold: ${metrics.validationTime}ms > ${this.thresholds.maxValidationTime}ms`);
    }

    if (metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      console.warn(`Memory usage exceeded threshold: ${metrics.memoryUsage} bytes > ${this.thresholds.maxMemoryUsage} bytes`);
    }

    if (metrics.contentLength > this.thresholds.maxContentLength) {
      console.warn(`Content length exceeded threshold: ${metrics.contentLength} chars > ${this.thresholds.maxContentLength} chars`);
    }

    if (metrics.recipientCount > this.thresholds.maxRecipientCount) {
      console.warn(`Recipient count exceeded threshold: ${metrics.recipientCount} > ${this.thresholds.maxRecipientCount}`);
    }
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const report = this.getBasicStats();

    if (report.averageValidationTime > this.thresholds.maxValidationTime * 0.8) {
      recommendations.push('Consider enabling lazy loading for better performance');
    }

    if (this.getCacheHitRate() < 0.5) {
      recommendations.push('Cache hit rate is low, consider increasing cache duration');
    }

    if (report.peakMemoryUsage > this.thresholds.maxMemoryUsage * 0.8) {
      recommendations.push('Memory usage is high, consider clearing old metrics more frequently');
    }

    const slowOperationsCount = this.metrics.filter(m => m.validationTime > this.thresholds.maxValidationTime).length;
    if (slowOperationsCount > this.metrics.length * 0.2) {
      recommendations.push('Many slow operations detected, consider optimizing parsing algorithms');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is within acceptable thresholds');
    }

    return recommendations;
  }

  /**
   * Get basic performance statistics
   */
  private getBasicStats() {
    if (this.metrics.length === 0) {
      return { averageValidationTime: 0, peakMemoryUsage: 0 };
    }

    return {
      averageValidationTime: this.metrics.reduce((sum, m) => sum + m.validationTime, 0) / this.metrics.length,
      peakMemoryUsage: Math.max(...this.metrics.map(m => m.memoryUsage))
    };
  }
}

/**
 * Performance measurement session
 */
export class PerformanceMeasurement {
  private startTime: number;
  private parseStartTime?: number;
  private matchingStartTime?: number;
  private monitor: PerformanceMonitor;
  private metrics: Partial<PerformanceMetrics> = {};

  constructor(monitor: PerformanceMonitor) {
    this.monitor = monitor;
    this.startTime = performance.now();
    this.metrics.timestamp = Date.now();
  }

  /**
   * Mark the start of parsing phase
   */
  startParsing(): void {
    this.parseStartTime = performance.now();
  }

  /**
   * Mark the end of parsing phase
   */
  endParsing(): void {
    if (this.parseStartTime) {
      this.metrics.parseTime = performance.now() - this.parseStartTime;
    }
  }

  /**
   * Mark the start of matching phase
   */
  startMatching(): void {
    this.matchingStartTime = performance.now();
  }

  /**
   * Mark the end of matching phase
   */
  endMatching(): void {
    if (this.matchingStartTime) {
      this.metrics.matchingTime = performance.now() - this.matchingStartTime;
    }
  }

  /**
   * Set content metrics
   */
  setContentMetrics(contentLength: number, recipientCount: number): void {
    this.metrics.contentLength = contentLength;
    this.metrics.recipientCount = recipientCount;
  }

  /**
   * Complete the measurement and record metrics
   */
  complete(): PerformanceMetrics {
    const endTime = performance.now();
    this.metrics.validationTime = endTime - this.startTime;
    this.metrics.memoryUsage = this.monitor.getCurrentMemoryUsage();
    this.metrics.cacheHitRate = this.monitor.getCacheHitRate();

    // Fill in missing values
    const completeMetrics: PerformanceMetrics = {
      validationTime: this.metrics.validationTime,
      parseTime: this.metrics.parseTime || 0,
      matchingTime: this.metrics.matchingTime || 0,
      memoryUsage: this.metrics.memoryUsage,
      recipientCount: this.metrics.recipientCount || 0,
      contentLength: this.metrics.contentLength || 0,
      cacheHitRate: this.metrics.cacheHitRate,
      timestamp: this.metrics.timestamp!
    };

    this.monitor.recordMetrics(completeMetrics);
    return completeMetrics;
  }
}

/**
 * Global performance monitor instance
 */
export const globalPerformanceMonitor = new PerformanceMonitor();