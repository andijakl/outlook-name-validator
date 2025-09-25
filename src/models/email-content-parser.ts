/**
 * Email Content Parser for extracting greetings and names from email content
 * Supports multiple languages including English and German
 */

import { GreetingMatch, ParsedContent } from './interfaces';

/**
 * Supported languages for greeting detection
 */
export type SupportedLanguage = 'en' | 'de' | 'auto';

/**
 * Language-specific greeting patterns
 */
interface LanguagePatterns {
  greetingPatterns: RegExp[];
  titlePatterns: RegExp;
  commonWords: Set<string>;
}

/**
 * Interface for email content parsing functionality
 */
export interface EmailContentParser {
  extractGreetings(emailBody: string): GreetingMatch[];
  parseEmailContent(content: string): ParsedContent;
}

/**
 * Implementation of EmailContentParser for extracting greetings and names from email content
 */
export class EmailContentParserImpl implements EmailContentParser {
  private readonly language: SupportedLanguage;
  private readonly languagePatterns: Map<string, LanguagePatterns>;

  constructor(language: SupportedLanguage = 'auto') {
    this.language = language;
    this.languagePatterns = this.initializeLanguagePatterns();
  }

  /**
   * Initializes language-specific patterns for greeting detection
   */
  private initializeLanguagePatterns(): Map<string, LanguagePatterns> {
    const patterns = new Map<string, LanguagePatterns>();

    // English patterns
    patterns.set('en', {
      greetingPatterns: [
        // Hi/Hello with names - capture until end punctuation (but not comma followed by name), end of line, or common sentence starters
        /\b(?:hi|hello|hey)\s+([a-zA-ZäöüßÄÖÜ\s,'-]+?)(?=\s*[.!?;:]|\s*,\s*$|\s*$|\s*\n|\s+(?:how|hope|i|thank|please|let|can|would|will|the|this|that)\s)/gi,
        
        // Dear with name (with optional titles) - separate pattern for titles
        /\bdear\s+(?:mr\.?|mrs\.?|ms\.?|miss|dr\.?|prof\.?|professor|sir|madam|lord|lady)\s+([a-zA-ZäöüßÄÖÜ\s,'-]+?)(?=\s*[,.!?;:]|\s*$|\s*\n)/gi,
        
        // Dear without title (but avoid matching the title patterns)
        /\bdear\s+(?!(?:mr\.?|mrs\.?|ms\.?|miss|dr\.?|prof\.?|professor|sir|madam|lord|lady)\s)([a-zA-ZäöüßÄÖÜ\s,'-]+?)(?=\s*[,.!?;:]|\s*$|\s*\n)/gi,
        
        // Good morning/afternoon/evening with name
        /\bgood\s+(?:morning|afternoon|evening)\s+([a-zA-ZäöüßÄÖÜ\s,'-]+?)(?=\s*[,.!?;:]|\s*$|\s*\n)/gi,
        
        // Greetings with name
        /\bgreetings\s+([a-zA-ZäöüßÄÖÜ\s,'-]+?)(?=\s*[,.!?;:]|\s*$|\s*\n)/gi
      ],
      titlePatterns: /\b(?:mr\.?|mrs\.?|ms\.?|miss|dr\.?|prof\.?|professor|sir|madam|lord|lady)\s*/gi,
      commonWords: new Set([
        'and', 'or', 'the', 'a', 'an', 'to', 'from', 'with', 'by', 'for',
        'all', 'everyone', 'team', 'folks', 'guys', 'there', 'you'
      ])
    });

    // German patterns
    patterns.set('de', {
      greetingPatterns: [
        // Hallo/Hi with names
        /\b(?:hallo|hi|hey)\s+([a-zA-ZäöüßÄÖÜ\s,'-]+?)(?=\s*[.!?;:,]|\s*$|\s*\n|\s+(?:wie|ich|danke|bitte|lass|kann|würde|wird|der|die|das|dies)\s)/gi,
        
        // Liebe/Lieber with names (German equivalent of "Dear")
        /\b(?:liebe[rs]?)\s+(?:herr|frau|dr\.?|prof\.?|professor)\s+([a-zA-ZäöüßÄÖÜ\s,'-]+?)(?=\s*[,.!?;:]|\s*$|\s*\n)/gi,
        
        // Liebe/Lieber without title
        /\b(?:liebe[rs]?)\s+(?!(?:herr|frau|dr\.?|prof\.?|professor)\s)([a-zA-ZäöüßÄÖÜ\s,'-]+?)(?=\s*[,.!?;:]|\s*$|\s*\n)/gi,
        
        // Sehr geehrte/geehrter (formal German greeting)
        /\bsehr\s+geehrte[rs]?\s+(?:herr|frau|dr\.?|prof\.?|professor)?\s*([a-zA-ZäöüßÄÖÜ\s,'-]+?)(?=\s*[,.!?;:]|\s*$|\s*\n)/gi,
        
        // Guten Morgen/Tag/Abend with name
        /\bguten\s+(?:morgen|tag|abend)\s+([a-zA-ZäöüßÄÖÜ\s,'-]+?)(?=\s*[,.!?;:]|\s*$|\s*\n)/gi,
        
        // Moin (Northern German greeting)
        /\bmoin\s+([a-zA-ZäöüßÄÖÜ\s,'-]+?)(?=\s*[,.!?;:]|\s*$|\s*\n)/gi
      ],
      titlePatterns: /\b(?:herr|frau|dr\.?|prof\.?|professor)\s*/gi,
      commonWords: new Set([
        'und', 'oder', 'der', 'die', 'das', 'ein', 'eine', 'zu', 'von', 'mit', 'durch', 'für',
        'alle', 'jeder', 'team', 'leute', 'ihr', 'sie', 'du'
      ])
    });

    return patterns;
  }

  /**
   * Detects the language of the email content
   */
  private detectLanguage(emailBody: string): string {
    if (this.language !== 'auto') {
      return this.language;
    }

    // Simple language detection based on common words and patterns
    const germanIndicators = [
      /\b(?:hallo|liebe[rs]?|sehr\s+geehrte[rs]?|guten\s+(?:morgen|tag|abend)|moin|danke|bitte|mit\s+freundlichen\s+grüßen)\b/gi,
      /\b(?:und|oder|der|die|das|ein|eine|zu|von|mit|durch|für|alle|jeder)\b/gi
    ];

    const englishIndicators = [
      /\b(?:hi|hello|dear|good\s+(?:morning|afternoon|evening)|greetings|thank|please|best\s+regards)\b/gi,
      /\b(?:and|or|the|a|an|to|from|with|by|for|all|everyone)\b/gi
    ];

    let germanScore = 0;
    let englishScore = 0;

    for (const pattern of germanIndicators) {
      const matches = emailBody.match(pattern);
      if (matches) germanScore += matches.length;
    }

    for (const pattern of englishIndicators) {
      const matches = emailBody.match(pattern);
      if (matches) englishScore += matches.length;
    }

    return germanScore > englishScore ? 'de' : 'en';
  }

  /**
   * Gets the appropriate language patterns for processing
   */
  private getLanguagePatterns(emailBody: string): LanguagePatterns {
    const detectedLanguage = this.detectLanguage(emailBody);
    return this.languagePatterns.get(detectedLanguage) || this.languagePatterns.get('en')!;
  }

  /**
   * Extracts greetings and names from email body content
   */
  public extractGreetings(emailBody: string): GreetingMatch[] {
    if (!emailBody || typeof emailBody !== 'string') {
      return [];
    }

    const matches: GreetingMatch[] = [];
    const processedPositions = new Set<number>();
    const langPatterns = this.getLanguagePatterns(emailBody);

    // Process each greeting pattern
    for (const pattern of langPatterns.greetingPatterns) {
      // Reset regex lastIndex to ensure proper matching
      pattern.lastIndex = 0;
      
      let match;
      while ((match = pattern.exec(emailBody)) !== null) {
        const position = match.index;
        
        // Skip if we've already processed a match at this position
        if (processedPositions.has(position)) {
          continue;
        }

        const fullMatch = match[0].replace(/[,.!?;:]+$/, ''); // Remove trailing punctuation
        const namesPart = match[1];
        
        if (namesPart) {
          // Extract individual names from the names part
          const extractedNames = this.extractNamesFromText(namesPart, langPatterns);
          
          for (const name of extractedNames) {
            if (name.trim().length > 0) {
              const confidence = this.calculateConfidence(fullMatch, name);
              
              matches.push({
                fullMatch,
                extractedName: name.trim(),
                position,
                confidence
              });
            }
          }
          
          processedPositions.add(position);
        }
      }
    }

    // Sort matches by position and remove duplicates
    return this.deduplicateMatches(matches);
  }

  /**
   * Extracts individual names from text that may contain multiple names
   */
  private extractNamesFromText(text: string, langPatterns: LanguagePatterns): string[] {
    if (!text) return [];

    // Remove titles and honorifics first
    let cleanText = text.replace(langPatterns.titlePatterns, '').trim();
    
    const names: string[] = [];
    
    // Handle "and"/"und" separator (John and Jane / Hans und Maria)
    const andPattern = cleanText.includes(' und ') ? ' und ' : ' and ';
    if (cleanText.includes(andPattern)) {
      const andSplit = cleanText.split(andPattern);
      for (const part of andSplit) {
        names.push(...this.splitNamePart(part.trim()));
      }
    }
    // Handle comma separator (John, Jane)
    else if (cleanText.includes(',')) {
      const commaSplit = cleanText.split(',');
      for (const part of commaSplit) {
        names.push(...this.splitNamePart(part.trim()));
      }
    }
    // Single name or space-separated names
    else {
      names.push(...this.splitNamePart(cleanText));
    }

    // Filter out empty names and common words, then normalize
    return names
      .filter(name => name.length > 0)
      .filter(name => !this.isCommonWord(this.normalizeName(name), langPatterns.commonWords))
      .map(name => this.normalizeName(name));
  }

  /**
   * Splits a name part into individual names (handles first/last names)
   */
  private splitNamePart(part: string): string[] {
    if (!part) return [];
    
    const trimmed = part.trim();
    if (trimmed.length === 0) return [];
    
    // Split by spaces to get individual name components
    const words = trimmed.split(/\s+/);
    return words.filter(word => word.length > 0);
  }

  /**
   * Checks if a word is a common word that shouldn't be treated as a name
   */
  private isCommonWord(word: string, commonWords: Set<string>): boolean {
    return commonWords.has(word.toLowerCase().trim());
  }

  /**
   * Normalizes a name for consistent processing
   */
  private normalizeName(name: string): string {
    return name.trim()
      .replace(/[^\w\s\-']/g, '') // Remove special characters except hyphens and apostrophes
      .replace(/\s+/g, '') // Remove all whitespace for single name tokens
      .toLowerCase(); // Convert to lowercase for case-insensitive matching
  }

  /**
   * Calculates confidence score for a greeting match
   */
  private calculateConfidence(fullMatch: string, extractedName: string): number {
    let confidence = 0.8; // Base confidence
    
    // Higher confidence for more formal greetings
    if (fullMatch.toLowerCase().includes('dear')) {
      confidence += 0.1;
    }
    
    // Lower confidence for very short names
    if (extractedName.length <= 2) {
      confidence -= 0.3;
    }
    
    // Higher confidence for names with multiple parts
    if (extractedName.includes(' ')) {
      confidence += 0.1;
    }
    
    // Ensure confidence is between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Removes duplicate matches and sorts by position
   */
  private deduplicateMatches(matches: GreetingMatch[]): GreetingMatch[] {
    const seen = new Set<string>();
    const unique: GreetingMatch[] = [];
    
    // Sort by position first
    matches.sort((a, b) => a.position - b.position);
    
    for (const match of matches) {
      // Use just the extracted name for deduplication (case-insensitive)
      const key = match.extractedName.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(match);
      }
    }
    
    return unique;
  }

  /**
   * Parses email content and returns structured result
   */
  public parseEmailContent(content: string): ParsedContent {
    if (!content || typeof content !== 'string') {
      return {
        greetings: [],
        hasValidContent: false
      };
    }

    const greetings = this.extractGreetings(content);
    
    return {
      greetings,
      hasValidContent: content.trim().length > 0
    };
  }
}