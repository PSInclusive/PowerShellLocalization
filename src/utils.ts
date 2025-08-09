/**
 * Constants and utility functions for the PowerShell Localization extension
 */

import * as path from 'path';

export const EXTENSION_NAME = 'PowerShell Localization';
export const POWERSHELL_LANGUAGE_ID = 'powershell';
export const POWERSHELL_MODULE_EXTENSION = '.psm1';
export const POWERSHELL_DATA_EXTENSION = '.psd1';
export const POWERSHELL_SCRIPT_EXTENSION = '.ps1';

export const CONFIGURATION_SECTION = 'Powershell Localization';
export const CONFIGURATION_BASENAME = 'powershellLocalization';

export const REGEX_PATTERNS = {
  IMPORT_LOCALIZED_DATA: /Import-LocalizedData/i,
  VARIABLE_OR_PROPERTY: /\$([A-Za-z_][A-Za-z0-9_]*)(?:\.([A-Za-z_][A-Za-z0-9_]*))?/g,
} as const;

/**
 * Utility functions
 */
export class Utils {
  /**
   * Checks if a file path has a PowerShell extension
   */
  public static isPowerShellFile(filePath: string): boolean {
    const extensions = [
      POWERSHELL_MODULE_EXTENSION,
      POWERSHELL_DATA_EXTENSION,
      POWERSHELL_SCRIPT_EXTENSION
    ];

    return extensions.some(ext => filePath.toLowerCase().endsWith(ext));
  }

  /**
   * Checks if a file is a PowerShell module
   */
  public static isPowerShellModule(filePath: string): boolean {
    return filePath.toLowerCase().endsWith(POWERSHELL_MODULE_EXTENSION);
  }

  /**
   * Safely parses JSON with error handling
   */
  public static safeJsonParse<T>(jsonString: string): T | null {
    try {
      return JSON.parse(jsonString) as T;
    } catch {
      return null;
    }
  }

  /**
   * Formats a timestamp for logging
   */
  public static formatTimestamp(date: Date = new Date()): string {
    return date.toISOString();
  }

  /**
   * Truncates a string to a maximum length
   */
  public static truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
      return str;
    }
    return str.substring(0, maxLength - 3) + '...';
  }

  /**
   * Checks if a file path should be excluded based on glob patterns
   */
  public static isPathExcluded(filePath: string, excludePatterns: string[]): boolean {
    if (excludePatterns.length === 0) {
      return false;
    }

    // Normalize the path using Node.js path module for robust cross-platform handling
    // Convert to forward slashes for consistent glob pattern matching
    //const normalizedPath = path.parse(filePath);

    return excludePatterns.some(pattern => {
      return path.matchesGlob(filePath, pattern);
    });
  }
}
