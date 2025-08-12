import * as vscode from 'vscode';
import { LocalizationData } from './types';
import { Logger } from './logger';
import { PowerShellExecutor } from './powershellExecutor';
import { ConfigurationManager } from './configuration';
import { POWERSHELL_LANGUAGE_ID } from './utils';
import path from 'path/win32';
import fs from 'fs';

/**
 * Provides decorations for PowerShell localization variables in real-time
 */
export class LocalizationDecorationProvider {
  private logger: Logger;
  private powershellExecutor: PowerShellExecutor;
  private localizationCache: Map<string, LocalizationData> = new Map();
  private decorationType: vscode.TextEditorDecorationType;
  private disposables: vscode.Disposable[] = [];
  private timeout: NodeJS.Timeout | undefined;

  constructor() {
    this.logger = Logger.getInstance();
    this.powershellExecutor = new PowerShellExecutor();

    // Create decoration type for localization hints
    this.decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        margin: '0 0 0 1rem',
        color: new vscode.ThemeColor('editorCodeLens.foreground'),
        fontStyle: 'italic',
        fontWeight: 'normal'
      },
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
    });

    this.logger.info('LocalizationDecorationProvider initialized');
  }

  /**
   * Activates the decoration provider
   */
  public activate(): void {
    // Listen to active editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        this.triggerUpdateDecorations();
      })
    );

    // Listen to document changes
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (vscode.window.activeTextEditor && event.document === vscode.window.activeTextEditor.document) {
          this.triggerUpdateDecorations();
        }
      })
    );

    // Update decorations for the currently active editor
    this.triggerUpdateDecorations();
  }

  /**
   * Triggers decoration updates with debouncing
   */
  private triggerUpdateDecorations(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.timeout = setTimeout(() => {
      this.updateDecorations();
    }, 500); // 500ms debounce
  }

  /**
   * Updates decorations for the active editor
   */
  private async updateDecorations(): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return;
    }

    try {
      // Check if decorations are enabled
      if (!ConfigurationManager.isDecorationEnabled()) {
        activeEditor.setDecorations(this.decorationType, []);
        return;
      }

      // Only process PowerShell files
      if (activeEditor.document.languageId !== POWERSHELL_LANGUAGE_ID) {
        return;
      }

      this.logger.debug(`Updating decorations for: ${activeEditor.document.uri.fsPath}`);

      const localizationData = await this.getLocalizationData(activeEditor.document.uri.fsPath);
      if (!localizationData || Object.keys(localizationData).length === 0) {
        activeEditor.setDecorations(this.decorationType, []);
        return;
      }

      const decorations = this.createDecorations(activeEditor.document, localizationData);
      activeEditor.setDecorations(this.decorationType, decorations);

      this.logger.debug(`Applied ${decorations.length} decorations`);
    } catch (error) {
      this.logger.error('Failed to update decorations', error as Error);
    }
  }

  /**
   * Creates decorations for localization variables in the document
   */
  private createDecorations(
    document: vscode.TextDocument,
    localizationData: LocalizationData
  ): vscode.DecorationOptions[] {
    const decorations: vscode.DecorationOptions[] = [];

    // Get the binding variable names from localization data
    const bindingVariableNames = Object.keys(localizationData);

    if (bindingVariableNames.length === 0) {
      return [];
    }

    // Create regex pattern that specifically matches the binding variables
    const escapedVarNames = bindingVariableNames.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const bindingVarPattern = `\\$(${escapedVarNames.join('|')})(?:\\.([A-Za-z_][A-Za-z0-9_]*))?`;
    const bindingVarRegex = new RegExp(bindingVarPattern, 'g');

    for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
      const textLine = document.lineAt(lineIndex);
      let match: RegExpExecArray | null;

      // Reset regex lastIndex for each line
      bindingVarRegex.lastIndex = 0;

      while ((match = bindingVarRegex.exec(textLine.text)) !== null) {
        const varName = match[1];
        const propName = match[2];

        let value: string | null = null;
        let hintText = '';

        if (propName) {
          // Property access: $bindingVar.key
          value = this.getPropertyValue(localizationData, varName, propName);
          if (value !== null) {
            hintText = `"${value}"`;
          }
        } else {
          // Plain binding variable usage: $bindingVar
          const varValue = this.getVariableValue(localizationData, varName);
          if (varValue !== null) {
            hintText = `{${varValue}}`;
          }
        }

        if (hintText) {
          const range = new vscode.Range(
            lineIndex,
            match.index + match[0].length,
            lineIndex,
            match.index + match[0].length
          );

          decorations.push({
            range,
            renderOptions: {
              after: {
                contentText: ` // ${hintText}`,
                color: new vscode.ThemeColor('editorCodeLens.foreground')
              }
            }
          });
        }
      }
    }

    return decorations;
  }

  /**
   * Gets localization data for the given file path, using cache when available
   */
  private async getLocalizationData(filePath: string): Promise<LocalizationData | null> {
    // Cache key should be the parent directory
    const cacheKey = path.dirname(filePath);

    // Check cache first
    if (this.localizationCache.has(cacheKey)) {
      this.logger.debug(`Using cached localization data for: ${cacheKey}`);
      return this.localizationCache.get(cacheKey)!;
    }

    try {
      // Find the module file that corresponds to this document
      const modulePath = await this.findModuleForFile(filePath);
      if (!modulePath) {
        this.logger.warn(`No module found for file: ${filePath}`);
        return null;
      }

      const localizationData = await this.powershellExecutor.parseLocalizationData(modulePath, ConfigurationManager.getUICulture());

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

    // Filter to only psm1 with Import-LocalizedData calls
    const filteredPsm1Files = psm1Files.filter(file => {
      const content = fs.readFileSync(file.fsPath, 'utf8');
      return content.includes('Import-LocalizedData');
    });

    // Return the first module file for now
    return filteredPsm1Files[0]?.fsPath || null;
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

    // Limit the display to avoid clutter
    const maxEntries = 3;
    const displayEntries = entries.slice(0, maxEntries);
    const result = displayEntries.map(([k, v]) => `${k}: "${v}"`).join(', ');

    if (entries.length > maxEntries) {
      return `${result}, ...${entries.length - maxEntries} more`;
    }

    return result;
  }

  /**
   * Clears the localization cache
   */
  public clearCache(): void {
    this.localizationCache.clear();
    this.logger.debug('Localization cache cleared');
    this.triggerUpdateDecorations();
  }

  /**
   * Clears cache for a specific file
   */
  public clearCacheForFile(filePath: string): void {
    this.localizationCache.delete(filePath);
    this.logger.debug(`Cleared cache for file: ${filePath}`);
    this.triggerUpdateDecorations();
  }

  /**
   * Disposes of all resources
   */
  public dispose(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.disposables.forEach(disposable => disposable.dispose());
    this.decorationType.dispose();
    this.logger.debug('LocalizationDecorationProvider disposed');
  }
}
