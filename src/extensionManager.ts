import * as vscode from 'vscode';
import { Logger } from './logger';
import { ConfigurationManager } from './configuration';
import { PowerShellModuleScanner } from './moduleScanner';
import { PowerShellExecutor } from './powershellExecutor';
import { LocalizationDecorationProvider } from './decorationProvider';
import { POWERSHELL_LANGUAGE_ID, POWERSHELL_MODULE_EXTENSION, POWERSHELL_DATA_EXTENSION } from './utils';

/**
 * Main extension manager that coordinates all components
 */
export class ExtensionManager {
  private logger: Logger;
  private moduleScanner: PowerShellModuleScanner;
  private powershellExecutor: PowerShellExecutor;
  private decorationProvider: LocalizationDecorationProvider;
  private disposables: vscode.Disposable[] = [];

  constructor(private context: vscode.ExtensionContext) {
    this.logger = Logger.getInstance();
    this.moduleScanner = new PowerShellModuleScanner();
    this.powershellExecutor = new PowerShellExecutor();
    this.decorationProvider = new LocalizationDecorationProvider();
  }

  /**
   * Initializes the extension
   */
  public async initialize(): Promise<void> {
    this.logger.info('PowerShell Localization extension starting...');

    try {
      // Check if PowerShell is available
      const isPowerShellAvailable = await this.powershellExecutor.isPowerShellAvailable();
      if (!isPowerShellAvailable) {
        this.logger.error('PowerShell is not available on this system');
        vscode.window.showErrorMessage(
          'PowerShell Localization: PowerShell (pwsh) is not available. Please install PowerShell Core.'
        );
        return;
      }

      // Scan for modules with localization
      const hasModulesWithLocalization = await this.moduleScanner.hasAnyModuleWithLocalization();

      if (!hasModulesWithLocalization) {
        this.logger.info('No PowerShell modules with Import-LocalizedData found');
        return;
      }

      // Register the decoration provider
      await this.registerDecorationProvider();

      // Set up configuration change listener
      this.setupConfigurationListener();

      // Set up file system watchers
      this.setupFileSystemWatchers();

      this.logger.info('PowerShell Localization extension activated successfully');

    } catch (error) {
      this.logger.error('Failed to initialize extension', error as Error);
      vscode.window.showErrorMessage(
        `PowerShell Localization: Failed to initialize extension: ${(error as Error).message}`
      );
    }
  }

  /**
   * Registers the decoration provider for PowerShell files
   */
  private async registerDecorationProvider(): Promise<void> {
    this.logger.info('Registering PowerShell decoration provider...');
    if (!ConfigurationManager.isDecorationEnabled()) {
      this.logger.info('Decorations are disabled in configuration');
      return;
    }

    this.decorationProvider.activate();
    this.disposables.push(this.decorationProvider);

    this.logger.info('Registered PowerShell decoration provider');
  }

  /**
   * Sets up configuration change listener
   */
  private setupConfigurationListener(): void {
    const disposable = ConfigurationManager.onConfigurationChanged(() => {
      this.logger.info('Configuration changed, reinitializing...');
      this.handleConfigurationChange();
    });

    this.disposables.push(disposable);
    this.context.subscriptions.push(disposable);
  }

  /**
   * Sets up file system watchers for PowerShell files
   */
  private setupFileSystemWatchers(): void {
    // Watch for changes to .psm1 files
    const psm1Watcher = vscode.workspace.createFileSystemWatcher(`**/*(${POWERSHELL_MODULE_EXTENSION}|${POWERSHELL_LANGUAGE_ID})`);

    psm1Watcher.onDidChange((uri) => {
      this.logger.debug(`PowerShell module file changed: ${uri.fsPath}`);
      this.decorationProvider.clearCacheForFile(uri.fsPath);
    });

    psm1Watcher.onDidCreate((uri) => {
      this.logger.debug(`PowerShell module file created: ${uri.fsPath}`);
      this.handleModuleFileChange();
    });

    psm1Watcher.onDidDelete((uri) => {
      this.logger.debug(`PowerShell module file deleted: ${uri.fsPath}`);
      this.decorationProvider.clearCacheForFile(uri.fsPath);
    });

    // Watch for changes to localization files (.psd1)
    const psd1Watcher = vscode.workspace.createFileSystemWatcher(`**/*${POWERSHELL_DATA_EXTENSION}`);

    psd1Watcher.onDidChange((uri) => {
      this.logger.debug(`Localization file changed: ${uri.fsPath}`);
      this.decorationProvider.clearCache();
    });

    this.disposables.push(psm1Watcher, psd1Watcher);
    this.context.subscriptions.push(psm1Watcher, psd1Watcher);
  }

  /**
   * Handles configuration changes
   */
  private async handleConfigurationChange(): Promise<void> {
    try {
      // Clear cache when configuration changes
      this.decorationProvider.clearCache();

      // Re-register decoration provider if needed
      if (ConfigurationManager.isDecorationEnabled()) {
        await this.registerDecorationProvider();
      }
    } catch (error) {
      this.logger.error('Failed to handle configuration change', error as Error);
    }
  }

  /**
   * Handles module file changes
   */
  private async handleModuleFileChange(): Promise<void> {
    try {
      // Re-scan for modules when files change
      const hasModulesWithLocalization = await this.moduleScanner.hasAnyModuleWithLocalization();

      if (hasModulesWithLocalization) {
        await this.registerDecorationProvider();
      }
    } catch (error) {
      this.logger.error('Failed to handle module file change', error as Error);
    }
  }

  /**
   * Disposes of all resources
   */
  public dispose(): void {
    this.logger.info('Disposing extension resources...');

    this.disposables.forEach(disposable => {
      try {
        disposable.dispose();
      } catch (error) {
        this.logger.error('Error disposing resource', error as Error);
      }
    });

    this.disposables = [];
    this.logger.dispose();
  }
}
