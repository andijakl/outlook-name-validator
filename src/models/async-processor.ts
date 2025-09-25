/**
 * Asynchronous processing system for large email content
 * Handles email parsing and validation in chunks to prevent UI blocking
 */

export interface ProcessingChunk<T> {
  data: T;
  index: number;
  total: number;
}

export interface ProcessingResult<T, R> {
  results: R[];
  processingTime: number;
  chunksProcessed: number;
  errors: Error[];
}

export interface ProcessingOptions {
  chunkSize?: number;
  maxConcurrency?: number;
  yieldInterval?: number;
  timeoutMs?: number;
}

/**
 * Asynchronous processor for handling large operations
 */
export class AsyncProcessor {
  private readonly defaultOptions: Required<ProcessingOptions> = {
    chunkSize: 1000,
    maxConcurrency: 3,
    yieldInterval: 10,
    timeoutMs: 30000
  };

  /**
   * Process large email content in chunks
   */
  async processEmailContent(
    content: string,
    processor: (chunk: string) => Promise<any>,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult<string, any>> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = performance.now();
    
    // Split content into chunks
    const chunks = this.chunkString(content, opts.chunkSize);
    const results: any[] = [];
    const errors: Error[] = [];
    
    // Process chunks with concurrency control
    const semaphore = new Semaphore(opts.maxConcurrency);
    const promises = chunks.map(async (chunk, index) => {
      await semaphore.acquire();
      
      try {
        // Yield control periodically
        if (index % opts.yieldInterval === 0) {
          await this.yield();
        }
        
        const result = await this.withTimeout(
          processor(chunk.data),
          opts.timeoutMs
        );
        
        results[chunk.index] = result;
      } catch (error) {
        errors.push(error as Error);
        results[chunk.index] = null;
      } finally {
        semaphore.release();
      }
    });
    
    await Promise.all(promises);
    
    return {
      results: results.filter(r => r !== null),
      processingTime: performance.now() - startTime,
      chunksProcessed: chunks.length,
      errors
    };
  }

  /**
   * Process recipients asynchronously
   */
  async processRecipients<T, R>(
    recipients: T[],
    processor: (recipient: T) => Promise<R>,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult<T, R>> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = performance.now();
    
    const chunks = this.chunkArray(recipients, opts.chunkSize);
    const results: R[] = [];
    const errors: Error[] = [];
    
    // Process chunks with concurrency control
    const semaphore = new Semaphore(opts.maxConcurrency);
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.data.map(async (recipient, index) => {
        await semaphore.acquire();
        
        try {
          // Yield control periodically
          if ((chunk.index * opts.chunkSize + index) % opts.yieldInterval === 0) {
            await this.yield();
          }
          
          const result = await this.withTimeout(
            processor(recipient),
            opts.timeoutMs
          );
          
          return result;
        } catch (error) {
          errors.push(error as Error);
          return null;
        } finally {
          semaphore.release();
        }
      });
      
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults.filter(r => r !== null));
    }
    
    return {
      results,
      processingTime: performance.now() - startTime,
      chunksProcessed: chunks.length,
      errors
    };
  }

  /**
   * Process validation results asynchronously
   */
  async processValidation(
    greetings: any[],
    recipients: any[],
    validator: (greeting: any, recipients: any[]) => Promise<any>,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult<any, any>> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = performance.now();
    
    const results: any[] = [];
    const errors: Error[] = [];
    
    // Process greetings with concurrency control
    const semaphore = new Semaphore(opts.maxConcurrency);
    const promises = greetings.map(async (greeting, index) => {
      await semaphore.acquire();
      
      try {
        // Yield control periodically
        if (index % opts.yieldInterval === 0) {
          await this.yield();
        }
        
        const result = await this.withTimeout(
          validator(greeting, recipients),
          opts.timeoutMs
        );
        
        results[index] = result;
      } catch (error) {
        errors.push(error as Error);
        results[index] = null;
      } finally {
        semaphore.release();
      }
    });
    
    await Promise.all(promises);
    
    return {
      results: results.filter(r => r !== null),
      processingTime: performance.now() - startTime,
      chunksProcessed: greetings.length,
      errors
    };
  }

  /**
   * Split string into chunks
   */
  private chunkString(str: string, chunkSize: number): ProcessingChunk<string>[] {
    const chunks: ProcessingChunk<string>[] = [];
    const totalChunks = Math.ceil(str.length / chunkSize);
    
    for (let i = 0; i < str.length; i += chunkSize) {
      chunks.push({
        data: str.slice(i, i + chunkSize),
        index: Math.floor(i / chunkSize),
        total: totalChunks
      });
    }
    
    return chunks;
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(arr: T[], chunkSize: number): ProcessingChunk<T[]>[] {
    const chunks: ProcessingChunk<T[]>[] = [];
    const totalChunks = Math.ceil(arr.length / chunkSize);
    
    for (let i = 0; i < arr.length; i += chunkSize) {
      chunks.push({
        data: arr.slice(i, i + chunkSize),
        index: Math.floor(i / chunkSize),
        total: totalChunks
      });
    }
    
    return chunks;
  }

  /**
   * Yield control to the event loop
   */
  private async yield(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  /**
   * Add timeout to a promise
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
    });
    
    return Promise.race([promise, timeoutPromise]);
  }
}

/**
 * Semaphore for controlling concurrency
 */
class Semaphore {
  private permits: number;
  private waitQueue: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise<void>(resolve => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!;
      resolve();
    } else {
      this.permits++;
    }
  }
}

/**
 * Web Worker wrapper for CPU-intensive operations
 */
export class WorkerProcessor {
  private worker?: Worker;
  private messageId = 0;
  private pendingMessages = new Map<number, { resolve: Function; reject: Function }>();

  /**
   * Initialize worker for processing
   */
  async initializeWorker(): Promise<void> {
    if (this.worker) return;

    // Create worker from inline script
    const workerScript = `
      self.onmessage = function(e) {
        const { id, type, data } = e.data;
        
        try {
          let result;
          
          switch (type) {
            case 'parseContent':
              result = parseContentInWorker(data);
              break;
            case 'matchNames':
              result = matchNamesInWorker(data);
              break;
            default:
              throw new Error('Unknown operation type: ' + type);
          }
          
          self.postMessage({ id, result });
        } catch (error) {
          self.postMessage({ id, error: error.message });
        }
      };
      
      function parseContentInWorker(content) {
        // Basic content parsing logic
        const greetingPatterns = [
          /\\b(hi|hello|dear)\\s+([a-zA-Z]+)/gi,
          /\\b(good\\s+morning|good\\s+afternoon|good\\s+evening)\\s+([a-zA-Z]+)/gi
        ];
        
        const matches = [];
        for (const pattern of greetingPatterns) {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            matches.push({
              fullMatch: match[0],
              extractedName: match[2],
              position: match.index,
              confidence: 0.8
            });
          }
        }
        
        return {
          greetings: matches,
          hasValidContent: matches.length > 0
        };
      }
      
      function matchNamesInWorker(data) {
        const { greetings, recipients } = data;
        const results = [];
        
        for (const greeting of greetings) {
          let bestMatch = null;
          let bestScore = 0;
          
          for (const recipient of recipients) {
            for (const name of recipient.extractedNames || []) {
              const score = calculateSimilarity(greeting.extractedName.toLowerCase(), name.toLowerCase());
              if (score > bestScore) {
                bestScore = score;
                bestMatch = recipient;
              }
            }
          }
          
          results.push({
            greetingName: greeting.extractedName,
            isValid: bestScore > 0.8,
            suggestedRecipient: bestMatch,
            confidence: bestScore
          });
        }
        
        return results;
      }
      
      function calculateSimilarity(str1, str2) {
        if (str1 === str2) return 1;
        if (str1.includes(str2) || str2.includes(str1)) return 0.9;
        
        // Simple Levenshtein distance approximation
        const maxLen = Math.max(str1.length, str2.length);
        const distance = levenshteinDistance(str1, str2);
        return 1 - (distance / maxLen);
      }
      
      function levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
          matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
          matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
          for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
              matrix[i][j] = matrix[i - 1][j - 1];
            } else {
              matrix[i][j] = Math.min(
                matrix[i - 1][j - 1] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j] + 1
              );
            }
          }
        }
        
        return matrix[str2.length][str1.length];
      }
    `;

    const blob = new Blob([workerScript], { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));

    this.worker.onmessage = (e) => {
      const { id, result, error } = e.data;
      const pending = this.pendingMessages.get(id);
      
      if (pending) {
        this.pendingMessages.delete(id);
        if (error) {
          pending.reject(new Error(error));
        } else {
          pending.resolve(result);
        }
      }
    };

    this.worker.onerror = (error) => {
      console.error('Worker error:', error);
    };
  }

  /**
   * Process content in worker
   */
  async processInWorker(type: string, data: any): Promise<any> {
    if (!this.worker) {
      await this.initializeWorker();
    }

    const id = ++this.messageId;
    
    return new Promise((resolve, reject) => {
      this.pendingMessages.set(id, { resolve, reject });
      this.worker!.postMessage({ id, type, data });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingMessages.has(id)) {
          this.pendingMessages.delete(id);
          reject(new Error('Worker operation timed out'));
        }
      }, 30000);
    });
  }

  /**
   * Terminate worker
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = undefined;
      this.pendingMessages.clear();
    }
  }
}

/**
 * Global async processor instance
 */
export const globalAsyncProcessor = new AsyncProcessor();

/**
 * Global worker processor instance
 */
export const globalWorkerProcessor = new WorkerProcessor();