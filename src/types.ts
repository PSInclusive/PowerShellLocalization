/**
 * Type definitions for the PowerShell Localization extension
 */

export interface LocalizationData {
  [variableName: string]: {
    [key: string]: string;
  };
}

export interface PowerShellModuleInfo {
  filePath: string;
  hasImportLocalizedData: boolean;
}

export interface ExtensionConfig {
  enableInlineValues: boolean;
  enableDecorations: boolean;
  searchExclude: string[];
  logLevel: LogLevel;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
