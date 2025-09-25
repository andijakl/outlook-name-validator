/**
 * Performance optimization tests
 * Tests lazy loading, async processing, memory optimization, and performance monitoring
 */

import { 
  PerformanceMonitor, 
  PerformanceMeasurement,
  globalPerformanceMonitor 
} from '../models/performance-monitor';
import { 
  LazyLoader, 
  LazyEmailContentParser,
  LazyRecipientParser,
  LazyNameMatchingEngine,
  globalLazyLoader 
} from '../models/lazy-loader';
import { 
  AsyncProcessor,
  WorkerProcessor,
  globalAsyncProcessor 
} from '../models/async-processor';
import { 
  OptimizedCache,
  RecipientCache,
  ValidationResultsCache,
  MemoryMonitor,
  globalRecipientCache,
  globalValidationCache,
  globalMemoryMonitor 
} from '../models/memory-optimizer';

describe('Performance Monitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  test('should track performance metrics', () => {
    const measurement = monitor.startMeasurement();
    
    measurement.startParsing();
    // Simulate parsing work
    measurement.endParsing();
    
    measurement.startMatching();
    // Simulate matching work
    measurement.endMatching();
    
    measurement.setContentMetrics(1000, 5);
    const metrics = measurement.complete();

    expect(metrics.validationTime).toBeGreaterThan(0);
    expect(metrics.contentLength).toBe(1000);
    expect(metrics.recipientCount).toBe(5);
    expect(metrics.timestamp).toBeGreaterThan(0);
  });

  test('should generate performance report', () => {
    // Record some test metrics
    const measurement1 = monitor.startMeasurement();
    measurement1.setContentMetrics(500, 3);
    measurement1.complete();

    const measurement2 = monitor.startMeasurement();
    measurement2.setContentMetrics(1500, 7);
    measurement2.complete();

    const report = monitor.getPerformanceReport();
    
    expect(report.totalValidations).toBe(2);
    expect(report.averageValidationTime).toBeGreaterThan(0);
    expect(report.recommendations).toBeInstanceOf(Array);
    expect(report.recommendations.length).toBeGreaterThan(0);
  });

  test('should track cache hit rate', () => {
    monitor.recordCacheHit();
    monitor.recordCacheHit();
    monitor.recordCacheMiss();

    expect(monitor.getCacheHitRate()).toBeCloseTo(0.67, 2);
  });

  test('should clear old metrics to manage memory', () => {
    // Add many metrics
    for (let i = 0; i < 50; i++) {
      const measurement = monitor.startMeasurement();
      measurement.complete();
    }

    monitor.clearOldMetrics(10);
    const report = monitor.getPerformanceReport();
    
    expect(report.totalValidations).toBe(10);
  });
});

describe('Lazy Loader', () => {
  let loader: LazyLoader;

  beforeEach(() => {
    loader = new LazyLoader();
  });

  test('should register and load components lazily', async () => {
    const mockFactory = {
      create: jest.fn().mockResolvedValue({ test: 'component' })
    };

    loader.register('testComponent', mockFactory);
    
    expect(loader.isLoaded('testComponent')).toBe(false);
    
    const component = await loader.load('testComponent');
    
    expect(mockFactory.create).toHaveBeenCalledTimes(1);
    expect(component).toEqual({ test: 'component' });
    expect(loader.isLoaded('testComponent')).toBe(true);
  });

  test('should return cached component on subsequent loads', async () => {
    const mockFactory = {
      create: jest.fn().mockResolvedValue({ test: 'component' })
    };

    loader.register('testComponent', mockFactory);
    
    const component1 = await loader.load('testComponent');
    const component2 = await loader.load('testComponent');
    
    expect(mockFactory.create).toHaveBeenCalledTimes(1);
    expect(component1).toBe(component2);
  });

  test('should handle loading errors', async () => {
    const mockFactory = {
      create: jest.fn().mockRejectedValue(new Error('Load failed'))
    };

    loader.register('testComponent', mockFactory);
    
    await expect(loader.load('testComponent')).rejects.toThrow('Load failed');
    expect(loader.isLoaded('testComponent')).toBe(false);
  });

  test('should unload components', async () => {
    const mockComponent = { dispose: jest.fn() };
    const mockFactory = {
      create: jest.fn().mockResolvedValue(mockComponent)
    };

    loader.register('testComponent', mockFactory);
    await loader.load('testComponent');
    
    expect(loader.isLoaded('testComponent')).toBe(true);
    
    loader.unload('testComponent');
    
    expect(loader.isLoaded('testComponent')).toBe(false);
    expect(mockComponent.dispose).toHaveBeenCalled();
  });
});

describe('Lazy Components', () => {
  test('LazyEmailContentParser should load and parse content', async () => {
    const parser = new LazyEmailContentParser();
    
    expect(parser.isLoaded()).toBe(false);
    
    // Mock the import
    jest.doMock('../models/email-content-parser', () => ({
      EmailContentParserImpl: class {
        parseEmailContent(content: string) {
          return { greetings: [{ extractedName: 'John' }], hasValidContent: true };
        }
      }
    }));

    const result = await parser.parseEmailContent('Hi John, how are you?');
    
    expect(parser.isLoaded()).toBe(true);
    expect(result.hasValidContent).toBe(true);
    expect(result.greetings).toHaveLength(1);
  });

  test('LazyRecipientParser should load and parse recipients', async () => {
    const parser = new LazyRecipientParser();
    
    expect(parser.isLoaded()).toBe(false);
    
    // Mock the import
    jest.doMock('../models/recipient-parser', () => ({
      RecipientParser: class {
        parseEmailAddress(email: string) {
          return { email, extractedNames: ['john'], isGeneric: false };
        }
      }
    }));

    const result = await parser.parseEmailAddress('john.doe@example.com');
    
    expect(parser.isLoaded()).toBe(true);
    expect(result.email).toBe('john.doe@example.com');
    expect(result.extractedNames).toContain('john');
  });

  test('LazyNameMatchingEngine should load and validate names', async () => {
    const engine = new LazyNameMatchingEngine();
    
    expect(engine.isLoaded()).toBe(false);
    
    // Mock the import
    jest.doMock('../models/name-matching-engine', () => ({
      NameMatchingEngine: class {
        validateNames(greetings: any[], recipients: any[]) {
          return [{ greetingName: 'John', isValid: true, confidence: 0.9 }];
        }
      }
    }));

    const result = await engine.validateNames(
      [{ extractedName: 'John' }],
      [{ extractedNames: ['john'] }]
    );
    
    expect(engine.isLoaded()).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].isValid).toBe(true);
  });
});

describe('Async Processor', () => {
  let processor: AsyncProcessor;

  beforeEach(() => {
    processor = new AsyncProcessor();
  });

  test('should process email content in chunks', async () => {
    const content = 'A'.repeat(5000); // 5KB content
    const mockProcessor = jest.fn().mockResolvedValue({ processed: true });

    const result = await processor.processEmailContent(
      content,
      mockProcessor,
      { chunkSize: 1000 }
    );

    expect(result.chunksProcessed).toBe(5);
    expect(result.results).toHaveLength(5);
    expect(result.processingTime).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
    expect(mockProcessor).toHaveBeenCalledTimes(5);
  });

  test('should process recipients with concurrency control', async () => {
    const recipients = Array.from({ length: 10 }, (_, i) => ({ email: `user${i}@example.com` }));
    const mockProcessor = jest.fn().mockImplementation(async (recipient) => {
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate async work
      return { processed: recipient.email };
    });

    const result = await processor.processRecipients(
      recipients,
      mockProcessor,
      { maxConcurrency: 3 }
    );

    expect(result.results).toHaveLength(10);
    expect(result.processingTime).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
    expect(mockProcessor).toHaveBeenCalledTimes(10);
  });

  test('should handle processing errors gracefully', async () => {
    const recipients = [
      { email: 'good@example.com' },
      { email: 'bad@example.com' },
      { email: 'good2@example.com' }
    ];
    
    const mockProcessor = jest.fn().mockImplementation(async (recipient) => {
      if (recipient.email === 'bad@example.com') {
        throw new Error('Processing failed');
      }
      return { processed: recipient.email };
    });

    const result = await processor.processRecipients(recipients, mockProcessor);

    expect(result.results).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toBe('Processing failed');
  });

  test('should timeout long-running operations', async () => {
    const content = 'test content';
    const mockProcessor = jest.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      return { processed: true };
    });

    const result = await processor.processEmailContent(
      content,
      mockProcessor,
      { timeoutMs: 500 } // 500ms timeout
    );

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toBe('Operation timed out');
  });
});

describe('Worker Processor', () => {
  let workerProcessor: WorkerProcessor;

  beforeEach(() => {
    workerProcessor = new WorkerProcessor();
  });

  afterEach(() => {
    workerProcessor.terminate();
  });

  test('should process content in web worker', async () => {
    const content = 'Hi John, how are you doing today?';
    
    const result = await workerProcessor.processInWorker('parseContent', content);
    
    expect(result.greetings).toBeInstanceOf(Array);
    expect(result.hasValidContent).toBe(true);
    if (result.greetings.length > 0) {
      expect(result.greetings[0]).toHaveProperty('extractedName');
      expect(result.greetings[0]).toHaveProperty('confidence');
    }
  });

  test('should match names in web worker', async () => {
    const data = {
      greetings: [{ extractedName: 'John' }],
      recipients: [{ extractedNames: ['john', 'doe'] }]
    };
    
    const result = await workerProcessor.processInWorker('matchNames', data);
    
    expect(result).toBeInstanceOf(Array);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('greetingName');
    expect(result[0]).toHaveProperty('isValid');
    expect(result[0]).toHaveProperty('confidence');
  });

  test('should handle worker errors', async () => {
    await expect(
      workerProcessor.processInWorker('invalidOperation', {})
    ).rejects.toThrow('Unknown operation type');
  });
});

describe('Memory Optimization', () => {
  describe('OptimizedCache', () => {
    let cache: OptimizedCache<string>;

    beforeEach(() => {
      cache = new OptimizedCache<string>({
        maxCacheSize: 1000,
        maxEntries: 5,
        ttlMs: 1000
      });
    });

    afterEach(() => {
      cache.dispose();
    });

    test('should store and retrieve items', () => {
      cache.set('key1', 'value1');
      
      expect(cache.has('key1')).toBe(true);
      expect(cache.get('key1')).toBe('value1');
    });

    test('should handle cache expiration', async () => {
      cache.set('key1', 'value1');
      
      expect(cache.get('key1')).toBe('value1');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(cache.get('key1')).toBeUndefined();
    });

    test('should evict entries when limits are exceeded', () => {
      // Fill cache to capacity
      for (let i = 0; i < 6; i++) {
        cache.set(`key${i}`, `value${i}`);
      }
      
      const stats = cache.getStats();
      expect(stats.totalEntries).toBeLessThanOrEqual(5);
      expect(stats.evictionCount).toBeGreaterThan(0);
    });

    test('should provide accurate statistics', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // hit
      cache.get('key2'); // miss
      
      const stats = cache.getStats();
      expect(stats.totalEntries).toBe(1);
      expect(stats.hitRate).toBe(0.5);
      expect(stats.missRate).toBe(0.5);
    });

    test('should cleanup expired entries', async () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const cleanedCount = cache.cleanup();
      expect(cleanedCount).toBe(2);
      expect(cache.getStats().totalEntries).toBe(0);
    });
  });

  describe('RecipientCache', () => {
    let cache: RecipientCache;

    beforeEach(() => {
      cache = new RecipientCache();
    });

    afterEach(() => {
      cache.dispose();
    });

    test('should cache and retrieve recipients', () => {
      const recipients = [{ email: 'john@example.com' }];
      const parsedRecipients = [{ 
        email: 'john@example.com', 
        extractedNames: ['john'], 
        isGeneric: false 
      }];

      cache.cacheRecipients(recipients, parsedRecipients);
      
      const cached = cache.getCachedRecipients(recipients);
      expect(cached).toEqual(parsedRecipients);
    });

    test('should generate consistent cache keys', () => {
      const recipients1 = [
        { email: 'john@example.com' },
        { email: 'jane@example.com' }
      ];
      const recipients2 = [
        { email: 'jane@example.com' },
        { email: 'john@example.com' }
      ];

      const key1 = cache.generateKey(recipients1);
      const key2 = cache.generateKey(recipients2);
      
      expect(key1).toBe(key2); // Should be same due to sorting
    });
  });

  describe('ValidationResultsCache', () => {
    let cache: ValidationResultsCache;

    beforeEach(() => {
      cache = new ValidationResultsCache();
    });

    afterEach(() => {
      cache.dispose();
    });

    test('should cache and retrieve validation results', () => {
      const content = 'Hi John, how are you?';
      const recipients = [{ email: 'john@example.com', extractedNames: ['john'], isGeneric: false }];
      const results = [{ greetingName: 'John', isValid: true, confidence: 0.9 }];

      cache.cacheValidation(content, recipients, results);
      
      const cached = cache.getCachedValidation(content, recipients);
      expect(cached).toEqual(results);
    });

    test('should generate different keys for different content', () => {
      const recipients = [{ email: 'john@example.com', extractedNames: ['john'], isGeneric: false }];
      
      const key1 = cache.generateKey('Hi John', recipients);
      const key2 = cache.generateKey('Hello John', recipients);
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('MemoryMonitor', () => {
    let monitor: MemoryMonitor;

    beforeEach(() => {
      monitor = new MemoryMonitor();
    });

    test('should record and track memory usage', () => {
      const usage1 = monitor.recordUsage();
      const usage2 = monitor.recordUsage();
      
      expect(usage1).toBeGreaterThan(0);
      expect(usage2).toBeGreaterThan(0);
      
      const stats = monitor.getMemoryStats();
      expect(stats.current).toBe(usage2);
      expect(stats.average).toBeGreaterThan(0);
      expect(stats.peak).toBeGreaterThanOrEqual(stats.average);
    });

    test('should detect memory usage trends', () => {
      // Record increasing memory usage
      for (let i = 0; i < 15; i++) {
        // Mock increasing memory usage
        jest.spyOn(monitor, 'getCurrentMemoryUsage').mockReturnValue(1000000 + i * 100000);
        monitor.recordUsage();
      }
      
      const stats = monitor.getMemoryStats();
      expect(stats.trend).toBe('increasing');
    });

    test('should identify high memory usage', () => {
      jest.spyOn(monitor, 'getCurrentMemoryUsage').mockReturnValue(60 * 1024 * 1024); // 60MB
      monitor.recordUsage();
      
      expect(monitor.isMemoryUsageHigh()).toBe(true);
    });
  });
});

describe('Integration Tests', () => {
  test('should integrate performance monitoring with lazy loading', async () => {
    const monitor = new PerformanceMonitor();
    const loader = new LazyLoader();
    
    // Register a mock component
    loader.register('testComponent', {
      create: async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { loaded: true };
      }
    });
    
    const measurement = monitor.startMeasurement();
    const component = await loader.load('testComponent');
    const metrics = measurement.complete();
    
    expect(component.loaded).toBe(true);
    expect(metrics.validationTime).toBeGreaterThan(90);
    expect(loader.isLoaded('testComponent')).toBe(true);
  });

  test('should integrate caching with performance monitoring', () => {
    const monitor = new PerformanceMonitor();
    const cache = new RecipientCache();
    
    const recipients = [{ email: 'test@example.com' }];
    const parsedRecipients = [{ 
      email: 'test@example.com', 
      extractedNames: ['test'], 
      isGeneric: false 
    }];
    
    // Cache miss
    let cached = cache.getCachedRecipients(recipients);
    expect(cached).toBeUndefined();
    monitor.recordCacheMiss();
    
    // Cache the data
    cache.cacheRecipients(recipients, parsedRecipients);
    
    // Cache hit
    cached = cache.getCachedRecipients(recipients);
    expect(cached).toEqual(parsedRecipients);
    monitor.recordCacheHit();
    
    expect(monitor.getCacheHitRate()).toBe(0.5);
    
    cache.dispose();
  });

  test('should handle large email content with async processing and caching', async () => {
    const processor = new AsyncProcessor();
    const cache = new ValidationResultsCache();
    const monitor = new PerformanceMonitor();
    
    const largeContent = 'Hi John, '.repeat(1000); // Large content
    const recipients = [{ email: 'john@example.com', extractedNames: ['john'], isGeneric: false }];
    
    const measurement = monitor.startMeasurement();
    
    // Process content in chunks
    const result = await processor.processEmailContent(
      largeContent,
      async (chunk) => ({ processed: chunk.length }),
      { chunkSize: 500 }
    );
    
    // Cache the results
    const validationResults = [{ greetingName: 'John', isValid: true, confidence: 0.9 }];
    cache.cacheValidation(largeContent, recipients, validationResults);
    
    const metrics = measurement.complete();
    
    expect(result.chunksProcessed).toBeGreaterThan(1);
    expect(result.errors).toHaveLength(0);
    expect(metrics.validationTime).toBeGreaterThan(0);
    
    // Verify caching works
    const cached = cache.getCachedValidation(largeContent, recipients);
    expect(cached).toEqual(validationResults);
    
    cache.dispose();
  });
});

// Performance benchmarks
describe('Performance Benchmarks', () => {
  test('should handle various email sizes efficiently', async () => {
    const processor = new AsyncProcessor();
    const sizes = [100, 1000, 10000, 50000]; // Different content sizes
    const results: { size: number; time: number }[] = [];
    
    for (const size of sizes) {
      const content = 'A'.repeat(size);
      const startTime = performance.now();
      
      await processor.processEmailContent(
        content,
        async (chunk) => ({ length: chunk.length }),
        { chunkSize: 1000 }
      );
      
      const endTime = performance.now();
      results.push({ size, time: endTime - startTime });
    }
    
    // Verify processing time scales reasonably
    expect(results[0].time).toBeLessThan(results[3].time);
    
    // Log results for analysis
    console.log('Email size performance results:', results);
  });

  test('should handle various recipient counts efficiently', async () => {
    const processor = new AsyncProcessor();
    const counts = [1, 10, 50, 100]; // Different recipient counts
    const results: { count: number; time: number }[] = [];
    
    for (const count of counts) {
      const recipients = Array.from({ length: count }, (_, i) => ({ 
        email: `user${i}@example.com` 
      }));
      
      const startTime = performance.now();
      
      await processor.processRecipients(
        recipients,
        async (recipient) => ({ processed: recipient.email }),
        { maxConcurrency: 5 }
      );
      
      const endTime = performance.now();
      results.push({ count, time: endTime - startTime });
    }
    
    // Verify processing time scales reasonably
    expect(results[0].time).toBeLessThan(results[3].time);
    
    // Log results for analysis
    console.log('Recipient count performance results:', results);
  });
});