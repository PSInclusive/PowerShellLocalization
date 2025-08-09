import * as vscode from 'vscode';
import { InlineValue, InlineValuesProvider } from 'vscode';
import { LocalizationData } from './types';
import { Logger } from './logger';
import { PowerShellExecutor } from './powershellExecutor';
import { ConfigurationManager } from './configuration';
import { POWERSHELL_LANGUAGE_ID, REGEX_PATTERNS } from './utils';

/**
 * Provides inline values for PowerShell localization variables
 */
export class LocalizationInlineValuesProvider implements InlineValuesProvider {
  private logger: Logger;
  private powershellExecutor: PowerShellExecutor;
  private localizationCache: Map<string, LocalizationData> = new Map();

  constructor() {
    this.logger = Logger.getInstance();
    this.powershellExecutor = new PowerShellExecutor();
    this.logger.info('LocalizationInlineValuesProvider initialized');
  }

  /**
   * Provides inline values for the given document and viewport
   */
  public async provideInlineValues(
    document: vscode.TextDocument,
    viewPort: vscode.Range,
    context: vscode.InlineValueContext,
    token: vscode.CancellationToken
  ): Promise<InlineValue[]> {
    console.log('provideInlineValues called!'); // This should always appear
    this.logger.debug(`Providing inline values for document: ${document.uri.fsPath}`);

    // Check if inline values are enabled
    if (!ConfigurationManager.isInlineValuesEnabled()) {
      this.logger.debug('Inline values are disabled in configuration');
      return [];
    }

    // Only process PowerShell files
    if (document.languageId !== POWERSHELL_LANGUAGE_ID) {
      this.logger.debug(`Skipping non-PowerShell file: ${document.uri.fsPath}`);
      return [];
    }
    this.logger.debug(`Processing PowerShell file: ${document.uri.fsPath}`);


    try {
      const localizationData = await this.getLocalizationData(document.uri.fsPath);
      if (!localizationData || Object.keys(localizationData).length === 0) {
        return [];
      }

      return this.extractInlineValues(document, viewPort, localizationData);
    } catch (error) {
      this.logger.error('Failed to provide inline values', error as Error);
      return [];
    }
  }

  /**
   * Gets localization data for the given file path, using cache when available
   */
  private async getLocalizationData(filePath: string): Promise<LocalizationData | null> {
    const cacheKey = filePath;

    // Check cache first
    if (this.localizationCache.has(cacheKey)) {
      this.logger.debug(`Using cached localization data for: ${filePath}`);
      return this.localizationCache.get(cacheKey)!;
    }

    try {
      // Find the module file that corresponds to this document
      const modulePath = await this.findModuleForFile(filePath);
      if (!modulePath) {
        this.logger.warn(`No module found for file: ${filePath}`);
        return null;
      }

      const localizationData = await this.powershellExecutor.parseLocalizationData(modulePath);

      // Cache the result
      this.localizationCache.set(cacheKey, localizationData);

      return localizationData;
    } catch (error) {
      this.logger.error(`Failed to get localization data for ${filePath}`, error as Error);
      return null;
    }
  }

  /**
   * Finds the module file (.psm1) that corresponds to the given file
   */
  private async findModuleForFile(filePath: string): Promise<string | null> {
    // For now, use the first .psm1 file found in the workspace
    // This could be enhanced to find the specific module that relates to the current file
    const psm1Files = await vscode.workspace.findFiles('**/*.psm1');

    if (psm1Files.length === 0) {
      this.logger.warn(`No PowerShell module files found in workspace for: ${filePath}`);
      return null;
    }

    // Return the first module file for now
    return psm1Files[0].fsPath;
  }

  /**
   * Extracts inline values from the document text
   */
  private extractInlineValues(
    document: vscode.TextDocument,
    viewPort: vscode.Range,
    localizationData: LocalizationData
  ): InlineValue[] {
    const inlineValues: InlineValue[] = [];

    // Get the binding variable names from localization data
    const bindingVariableNames = Object.keys(localizationData);

    if (bindingVariableNames.length === 0) {
      return [];
    }

    // Create regex pattern that specifically matches the binding variables
    // Escape variable names to handle special regex characters
    const escapedVarNames = bindingVariableNames.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const bindingVarPattern = `\\$(${escapedVarNames.join('|')})(?:\\.([A-Za-z_][A-Za-z0-9_]*))?`;
    const bindingVarRegex = new RegExp(bindingVarPattern, 'g');

    for (let line = viewPort.start.line; line <= viewPort.end.line; line++) {
      if (line >= document.lineCount) {
        break;
      }

      const textLine = document.lineAt(line);
      let match: RegExpExecArray | null;

      // Reset regex lastIndex for each line
      bindingVarRegex.lastIndex = 0;

      while ((match = bindingVarRegex.exec(textLine.text)) !== null) {
        const varName = match[1];
        const propName = match[2];

        if (propName) {
          // Property access: $bindingVar.key
          const value = this.getPropertyValue(localizationData, varName, propName);
          if (value !== null) {
            const propRange = new vscode.Range(
              line,
              match.index,
              line,
              match.index + match[0].length
            );
            inlineValues.push(new vscode.InlineValueText(propRange, String(value)));
          }
        } else {
          // Plain binding variable usage: $bindingVar
          const value = this.getVariableValue(localizationData, varName);
          if (value !== null) {
            const varRange = new vscode.Range(
              line,
              match.index,
              line,
              match.index + match[0].length
            );
            inlineValues.push(new vscode.InlineValueText(varRange, value));
          }
        }
      }
    }

    this.logger.debug(`Generated ${inlineValues.length} inline values for binding variables: ${bindingVariableNames.join(', ')}`);
    return inlineValues;
  }

  /**
   * Gets the value of a property from localization data
   */
  private getPropertyValue(localizationData: LocalizationData, varName: string, propName: string): string | null {
    const variable = localizationData[varName];
    if (!variable || typeof variable !== 'object' || variable === null) {
      return null;
    }

    if (Object.prototype.hasOwnProperty.call(variable, propName)) {
      return variable[propName];
    }

    return null;
  }

  /**
   * Gets the value of a variable from localization data (shows all key-value pairs)
   */
  private getVariableValue(localizationData: LocalizationData, varName: string): string | null {
    const variable = localizationData[varName];
    if (!variable || typeof variable !== 'object' || variable === null) {
      return null;
    }

    // Show all key-value pairs for this variable as a string
    const entries = Object.entries(variable);
    if (entries.length === 0) {
      return null;
    }

    return entries
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
  }

  /**
   * Clears the localization cache
   */
  public clearCache(): void {
    this.localizationCache.clear();
    this.logger.debug('Localization cache cleared');
  }

  /**
   * Clears cache for a specific file
   */
  public clearCacheForFile(filePath: string): void {
    this.localizationCache.delete(filePath);
    this.logger.debug(`Cleared cache for file: ${filePath}`);
  }
}
