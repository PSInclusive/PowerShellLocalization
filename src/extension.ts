// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ExtensionManager } from './extensionManager';
import { Logger } from './logger';

let extensionManager: ExtensionManager | undefined;

/**
 * This method is called when your extension is activated
 * Your extension is activated the very first time the command is executed
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const logger = Logger.getInstance();

  try {
    logger.info(`Activating PowerShell Localization extension version ${context.extension.packageJSON.version}...`);

    // Create and initialize the extension manager
    extensionManager = new ExtensionManager(context);
    await extensionManager.initialize();

    logger.info('PowerShell Localization extension activated successfully');
  } catch (error) {
    logger.error('Failed to activate extension', error as Error);
    vscode.window.showErrorMessage(
      `PowerShell Localization: Activation failed: ${(error as Error).message}`
    );
  }
}

/**
 * This method is called when your extension is deactivated
 */
export function deactivate(): void {
  const logger = Logger.getInstance();
  logger.info('Deactivating PowerShell Localization extension...');

  if (extensionManager) {
    extensionManager.dispose();
    extensionManager = undefined;
  }

  logger.info('PowerShell Localization extension deactivated');
}
