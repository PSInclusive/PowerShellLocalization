import * as vscode from 'vscode';
import { PowerShellModuleInfo } from './types';
import { Logger } from './logger';
import { ConfigurationManager } from './configuration';
import { REGEX_PATTERNS, POWERSHELL_MODULE_EXTENSION } from './utils';

/**
 * Service for scanning and managing PowerShell modules
 */
export class PowerShellModuleScanner {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Scans the workspace for PowerShell module files (.psm1)
   */
  public async scanForModules(): Promise<PowerShellModuleInfo[]> {
    this.logger.info('Scanning workspace for .psm1 files...');

    try {
      const excludePatterns = ConfigurationManager.getSearchExcludePatterns();
      const excludePattern = excludePatterns.length > 0 ? `{${excludePatterns.join(',')}}` : undefined;

      this.logger.debug(`Using exclude patterns: ${excludePatterns.join(', ')}`);

      const psm1Files = await vscode.workspace.findFiles(
        `**/*${POWERSHELL_MODULE_EXTENSION}`,
        excludePattern
      );

      this.logger.info(`Found ${psm1Files.length} .psm1 file(s)`);

      if (psm1Files.length === 0) {
        return [];
      }

      const moduleInfos = await Promise.all(
        psm1Files.map(file => this.analyzeModuleFile(file))
      );

      const modulesWithLocalization = moduleInfos.filter(info => info.hasImportLocalizedData);
      this.logger.info(`Found ${modulesWithLocalization.length} module(s) with Import-LocalizedData`);

      return moduleInfos;
    } catch (error) {
      this.logger.error('Error scanning for PowerShell modules', error as Error);
      return [];
    }
  }

  /**
   * Analyzes a single PowerShell module file
   */
  private async analyzeModuleFile(file: vscode.Uri): Promise<PowerShellModuleInfo> {
    this.logger.debug(`Analyzing module file: ${file.fsPath}`);

    try {
      const content = await vscode.workspace.fs.readFile(file);
      const text = Buffer.from(content).toString('utf8');
      const hasImportLocalizedData = REGEX_PATTERNS.IMPORT_LOCALIZED_DATA.test(text);

      if (hasImportLocalizedData) {
        this.logger.info(`Detected Import-LocalizedData in: ${file.fsPath}`);
      }

      return {
        filePath: file.fsPath,
        hasImportLocalizedData
      };
    } catch (error) {
      this.logger.error(`Failed to analyze module file ${file.fsPath}`, error as Error);
      return {
        filePath: file.fsPath,
        hasImportLocalizedData: false
      };
    }
  }

  /**
   * Gets modules that contain Import-LocalizedData calls
   */
  public async getModulesWithLocalization(): Promise<PowerShellModuleInfo[]> {
    const allModules = await this.scanForModules();
    return allModules.filter(module => module.hasImportLocalizedData);
  }

  /**
   * Checks if any module in the workspace has localization
   */
  public async hasAnyModuleWithLocalization(): Promise<boolean> {
    const modulesWithLocalization = await this.getModulesWithLocalization();
    return modulesWithLocalization.length > 0;
  }
}
