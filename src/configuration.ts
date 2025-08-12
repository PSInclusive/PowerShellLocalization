import * as vscode from 'vscode';
import { ExtensionConfig, LogLevel } from './types';
import { CONFIGURATION_BASENAME } from './utils';

/**
 * Configuration manager for the PowerShell Localization extension
 */
export class ConfigurationManager {

  /**
   * Gets the current extension configuration
   */
  public static getConfiguration(): ExtensionConfig {
    const config = vscode.workspace.getConfiguration(CONFIGURATION_BASENAME);
    return {
      enableInlineValues: config.get<boolean>('enableInlineValues', false), // Disabled by default since we're using decorations now
      enableDecorations: config.get<boolean>('enableDecorations', true),
      searchExclude: config.get<string[]>('searchExclude', [
        '**/node_modules/**',
        '**/out/**',
        '**/dist/**',
        '**/.git/**'
      ]),
      logLevel: config.get<LogLevel>('logLevel', 'info'),
      uiCulture: config.get<string>('uiCulture', 'en-US')
    };
  }

  /**
   * Checks if inline values are enabled
   */
  public static isInlineValuesEnabled(): boolean {
    return this.getConfiguration().enableInlineValues;
  }

  /**
   * Checks if decorations are enabled
   */
  public static isDecorationEnabled(): boolean {
    return this.getConfiguration().enableDecorations;
  }

  /**
   * Gets the search exclude patterns
   */
  public static getSearchExcludePatterns(): string[] {
    return this.getConfiguration().searchExclude;
  }

  /**
   * Gets the current log level
   */
  public static getLogLevel(): LogLevel {
    return this.getConfiguration().logLevel;
  }

  /**
   * Gets the current UI culture
   */
  public static getUICulture(): string {
    return this.getConfiguration().uiCulture;
  }

  /**
   * Sets the UI culture
   */
  public static async setUICulture(culture: string): Promise<void> {
    const config = vscode.workspace.getConfiguration(CONFIGURATION_BASENAME);
    await config.update('uiCulture', culture, vscode.ConfigurationTarget.Global);
  }

  /**
   * Registers configuration change listener
   */
  public static onConfigurationChanged(callback: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(CONFIGURATION_BASENAME)) {
        callback();
      }
    });
  }
}
