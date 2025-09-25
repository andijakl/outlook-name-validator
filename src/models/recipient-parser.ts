/**
 * RecipientParser - Extracts and normalizes names from email addresses
 */

import { ParsedRecipient } from './interfaces';

/**
 * Parser for extracting names from email addresses and recipient information
 */
export class RecipientParser {
  private static readonly GENERIC_EMAIL_PATTERNS = [
    /^info@/i,
    /^support@/i,
    /^help@/i,
    /^contact@/i,
    /^admin@/i,
    /^noreply@/i,
    /^no-reply@/i,
    /^donotreply@/i,
    /^sales@/i,
    /^marketing@/i,
    /^service@/i,
    /^team@/i,
    /^office@/i,
    /^hello@/i,
    /^hi@/i,
    /^mail@/i,
    /^webmaster@/i,
    /^postmaster@/i,
    /^abuse@/i,
    /^security@/i,
    /^privacy@/i,
    /^legal@/i,
    /^billing@/i,
    /^accounts@/i,
    /^hr@/i,
    /^jobs@/i,
    /^careers@/i,
    /^press@/i,
    /^media@/i,
    /^news@/i,
    /^newsletter@/i,
    /^notifications@/i,
    /^alerts@/i,
    /^updates@/i,
    /^feedback@/i,
    /^suggestions@/i,
    /^complaints@/i,
    /^orders@/i,
    /^shipping@/i,
    /^returns@/i,
    /^invoices@/i,
    /^payments@/i,
    /^api@/i,
    /^dev@/i,
    /^developer@/i,
    /^tech@/i,
    /^technical@/i,
    /^it@/i,
    /^system@/i,
    /^root@/i,
    /^www@/i,
    /^ftp@/i,
    /^mail@/i,
    /^smtp@/i,
    /^pop@/i,
    /^imap@/i
  ];

  /**
   * Parses a single email address to extract name components
   * @param email The email address to parse
   * @param displayName Optional display name from email client
   * @returns ParsedRecipient object with extracted information
   */
  public parseEmailAddress(email: string, displayName?: string): ParsedRecipient {
    if (!email || typeof email !== 'string') {
      throw new Error('Email address is required and must be a string');
    }

    const normalizedEmail = email.trim().toLowerCase();
    
    // Check if this is a generic email address
    const isGeneric = this.isGenericEmail(normalizedEmail);
    
    // Extract names from display name if available
    const displayNameExtracted = displayName ? this.extractNamesFromDisplayName(displayName) : [];
    
    // Extract names from email address local part (use original case for camelCase detection)
    const emailExtracted = this.extractNamesFromEmailAddress(email.trim());
    
    // Combine and deduplicate names
    const allNames = [...displayNameExtracted, ...emailExtracted];
    const extractedNames = this.deduplicateNames(allNames);

    return {
      email: normalizedEmail,
      displayName: displayName?.trim(),
      extractedNames,
      isGeneric
    };
  }

  /**
   * Extracts recipients from Office.js EmailAddressDetails array
   * @param recipients Array of email address details from Office.js
   * @returns Array of ParsedRecipient objects
   */
  public extractAllRecipients(recipients: { emailAddress: string; displayName?: string }[]): ParsedRecipient[] {
    if (!Array.isArray(recipients)) {
      return [];
    }

    return recipients
      .filter(recipient => recipient && recipient.emailAddress)
      .map(recipient => this.parseEmailAddress(
        recipient.emailAddress,
        recipient.displayName
      ));
  }

  /**
   * Normalizes a name for case-insensitive comparison
   * @param name The name to normalize
   * @returns Normalized name string
   */
  public normalizeName(name: string): string {
    if (!name || typeof name !== 'string') {
      return '';
    }

    return name
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-']/g, '') // Remove special characters except hyphens and apostrophes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Checks if an email address is a generic/system email
   * @param email The email address to check
   * @returns True if the email is generic
   */
  private isGenericEmail(email: string): boolean {
    return RecipientParser.GENERIC_EMAIL_PATTERNS.some(pattern => pattern.test(email));
  }

  /**
   * Extracts names from display name string
   * @param displayName The display name to parse
   * @returns Array of extracted names
   */
  private extractNamesFromDisplayName(displayName: string): string[] {
    if (!displayName) {
      return [];
    }

    // Remove common titles and honorifics
    const cleanedName = displayName
      .replace(/\b(mr|mrs|ms|miss|dr|prof|professor|sir|madam|lord|lady|rev|father|sister|brother)\b\.?\s*/gi, '')
      .trim();

    // Split on common separators and filter out empty strings
    const nameParts = cleanedName
      .split(/[\s,]+/)
      .map(part => part.trim())
      .filter(part => part.length > 0)
      .map(part => this.normalizeName(part))
      .filter(part => part.length > 0);

    return nameParts;
  }

  /**
   * Extracts names from the local part of an email address
   * @param email The email address to parse
   * @returns Array of extracted names
   */
  private extractNamesFromEmailAddress(email: string): string[] {
    // Extract the local part (before @)
    const atIndex = email.indexOf('@');
    if (atIndex === -1) {
      return [];
    }

    // Get the original case local part for camelCase detection
    const originalLocalPart = email.substring(0, atIndex);
    
    // Handle common email formats
    const names: string[] = [];

    // Split on common separators: dots, underscores, hyphens, plus signs
    const parts = originalLocalPart.split(/[._\-+]/);
    
    for (const part of parts) {
      if (part.length === 0) {
        continue;
      }

      // Handle camelCase names (e.g., johnDoe -> john, doe)
      // Do this BEFORE normalization to preserve case information
      const camelCaseParts = this.splitCamelCase(part);
      
      for (const camelPart of camelCaseParts) {
        const normalized = this.normalizeName(camelPart);
        if (normalized.length > 1) { // Only include names with more than 1 character
          names.push(normalized);
        }
      }
    }

    return names;
  }

  /**
   * Splits camelCase strings into separate words
   * @param text The text to split
   * @returns Array of split words
   */
  private splitCamelCase(text: string): string[] {
    // Use a simpler approach that works with older JavaScript engines
    const result: string[] = [];
    let currentWord = '';
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const isUpperCase = char >= 'A' && char <= 'Z';
      const isLowerCase = char >= 'a' && char <= 'z';
      const isDigit = char >= '0' && char <= '9';
      
      if (i === 0) {
        // First character always starts a new word
        currentWord = char;
      } else {
        const prevChar = text[i - 1];
        const prevIsLowerCase = prevChar >= 'a' && prevChar <= 'z';
        const prevIsDigit = prevChar >= '0' && prevChar <= '9';
        
        // Start new word if:
        // 1. Current char is uppercase and previous was lowercase or digit
        // 2. Current char is digit and previous was letter
        // 3. Current char is letter and previous was digit
        if ((isUpperCase && (prevIsLowerCase || prevIsDigit)) ||
            (isDigit && (prevIsLowerCase || (prevChar >= 'A' && prevChar <= 'Z'))) ||
            ((isLowerCase || isUpperCase) && prevIsDigit)) {
          if (currentWord.length > 0) {
            result.push(currentWord);
          }
          currentWord = char;
        } else {
          currentWord += char;
        }
      }
    }
    
    // Add the last word
    if (currentWord.length > 0) {
      result.push(currentWord);
    }
    
    return result
      .map(part => part.trim())
      .filter(part => part.length > 0);
  }

  /**
   * Removes duplicate names from an array (case-insensitive)
   * @param names Array of names to deduplicate
   * @returns Array with duplicates removed
   */
  private deduplicateNames(names: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const name of names) {
      const normalized = this.normalizeName(name);
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized);
        result.push(normalized);
      }
    }

    return result;
  }
}