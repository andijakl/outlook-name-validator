/**
 * Name Matching Engine for validating greeting names against recipient email addresses
 * Implements exact, partial, and fuzzy matching algorithms with confidence scoring
 */

import { GreetingMatch, ParsedRecipient, ValidationResult, MatchResult } from './interfaces';

/**
 * Main engine for matching names from greetings with recipient names
 */
export class NameMatchingEngine {
  private readonly fuzzyMatchingEnabled: boolean;
  private readonly minimumConfidenceThreshold: number;

  constructor(
    fuzzyMatchingEnabled: boolean = true,
    minimumConfidenceThreshold: number = 0.6
  ) {
    this.fuzzyMatchingEnabled = fuzzyMatchingEnabled;
    this.minimumConfidenceThreshold = minimumConfidenceThreshold;
  }

  /**
   * Validates all greeting names against all recipients
   * @param greetings Array of greeting matches from email content
   * @param recipients Array of parsed recipients
   * @returns Array of validation results
   */
  public validateNames(greetings: GreetingMatch[], recipients: ParsedRecipient[]): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    // Filter out generic recipients if needed
    const validRecipients = recipients.filter(recipient => !recipient.isGeneric);
    
    for (const greeting of greetings) {
      const matchResult = this.findBestMatch(greeting.extractedName, validRecipients);
      
      const validationResult: ValidationResult = {
        greetingName: greeting.extractedName,
        isValid: matchResult.matchType !== 'none' && matchResult.confidence >= this.minimumConfidenceThreshold,
        suggestedRecipient: matchResult.matchType !== 'none' ? matchResult.recipient : undefined,
        confidence: matchResult.confidence
      };
      
      results.push(validationResult);
    }
    
    return results;
  }

  /**
   * Finds the best matching recipient for a given greeting name
   * @param greetingName Name extracted from greeting
   * @param recipients Array of recipients to match against
   * @returns Best match result
   */
  public findBestMatch(greetingName: string, recipients: ParsedRecipient[]): MatchResult {
    let bestMatch: MatchResult = {
      recipient: recipients[0] || { email: '', extractedNames: [], isGeneric: false },
      matchType: 'none',
      confidence: 0
    };

    const normalizedGreeting = this.normalizeName(greetingName);

    for (const recipient of recipients) {
      // Try exact matching first
      const exactMatch = this.tryExactMatch(normalizedGreeting, recipient);
      if (exactMatch.confidence > bestMatch.confidence) {
        bestMatch = exactMatch;
      }

      // Try partial matching
      const partialMatch = this.tryPartialMatch(normalizedGreeting, recipient);
      if (partialMatch.confidence > bestMatch.confidence) {
        bestMatch = partialMatch;
      }

      // Try fuzzy matching if enabled
      if (this.fuzzyMatchingEnabled) {
        const fuzzyMatch = this.tryFuzzyMatch(normalizedGreeting, recipient);
        if (fuzzyMatch.confidence > bestMatch.confidence) {
          bestMatch = fuzzyMatch;
        }
      }
    }

    return bestMatch;
  }

  /**
   * Attempts exact matching between greeting name and recipient names
   */
  private tryExactMatch(greetingName: string, recipient: ParsedRecipient): MatchResult {
    const normalizedRecipientNames = recipient.extractedNames.map(name => this.normalizeName(name));
    
    // Check display name if available
    if (recipient.displayName) {
      const displayNameParts = this.extractNameParts(recipient.displayName);
      normalizedRecipientNames.push(...displayNameParts.map(name => this.normalizeName(name)));
    }

    for (const recipientName of normalizedRecipientNames) {
      if (greetingName === recipientName) {
        return {
          recipient,
          matchType: 'exact',
          confidence: 1.0
        };
      }
    }

    return {
      recipient,
      matchType: 'none',
      confidence: 0
    };
  }

  /**
   * Attempts partial matching for first/last name components
   */
  private tryPartialMatch(greetingName: string, recipient: ParsedRecipient): MatchResult {
    const normalizedRecipientNames = recipient.extractedNames.map(name => this.normalizeName(name));
    
    // Check display name if available
    if (recipient.displayName) {
      const displayNameParts = this.extractNameParts(recipient.displayName);
      normalizedRecipientNames.push(...displayNameParts.map(name => this.normalizeName(name)));
    }

    let bestConfidence = 0;

    for (const recipientName of normalizedRecipientNames) {
      // Check if greeting name is a substring of recipient name
      if (recipientName.includes(greetingName) || greetingName.includes(recipientName)) {
        const confidence = Math.min(greetingName.length, recipientName.length) / 
                          Math.max(greetingName.length, recipientName.length);
        bestConfidence = Math.max(bestConfidence, confidence * 0.8); // Partial match penalty
      }
    }

    return {
      recipient,
      matchType: bestConfidence > 0 ? 'partial' : 'none',
      confidence: bestConfidence
    };
  }

  /**
   * Attempts fuzzy matching for common misspellings
   */
  private tryFuzzyMatch(greetingName: string, recipient: ParsedRecipient): MatchResult {
    const normalizedRecipientNames = recipient.extractedNames.map(name => this.normalizeName(name));
    
    // Check display name if available
    if (recipient.displayName) {
      const displayNameParts = this.extractNameParts(recipient.displayName);
      normalizedRecipientNames.push(...displayNameParts.map(name => this.normalizeName(name)));
    }

    let bestConfidence = 0;

    for (const recipientName of normalizedRecipientNames) {
      const similarity = this.calculateLevenshteinSimilarity(greetingName, recipientName);
      
      // Only consider it a fuzzy match if similarity is above threshold
      if (similarity > 0.7) {
        bestConfidence = Math.max(bestConfidence, similarity * 0.6); // Fuzzy match penalty
      }
    }

    return {
      recipient,
      matchType: bestConfidence > 0 ? 'fuzzy' : 'none',
      confidence: bestConfidence
    };
  }

  /**
   * Normalizes a name for comparison (lowercase, trim, handle German characters)
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      // Normalize German umlauts for better matching
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]/g, ''); // Remove non-alphanumeric characters
  }

  /**
   * Extracts name parts from a display name string
   */
  private extractNameParts(displayName: string): string[] {
    return displayName
      .split(/[\s,.-]+/) // Split on common separators
      .filter(part => part.length > 1) // Filter out single characters
      .map(part => part.trim());
  }

  /**
   * Calculates Levenshtein distance-based similarity between two strings
   */
  private calculateLevenshteinSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    if (maxLength === 0) return 1;
    
    return 1 - (distance / maxLength);
  }

  /**
   * Calculates Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    // Initialize matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}