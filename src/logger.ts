import * as vscode from 'vscode';
import { EXTENSION_NAME, Utils } from './utils';
import { LogLevel } from './types';
import { ConfigurationManager } from './configuration';

/**
 * Logging utility for the PowerShell Localization extension
 */
export class Logger {
  private static instance: Logger;
  private outputChannel: vscode.OutputChannel;
  private static readonly LOG_LEVELS: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
  };

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel(EXTENSION_NAME);
  }

  /**
   * Gets the singleton instance of the logger
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Checks if a message should be logged based on the current log level
   */
  private shouldLog(messageLevel: LogLevel): boolean {
    const currentLevel = ConfigurationManager.getLogLevel();
    return Logger.LOG_LEVELS[messageLevel] <= Logger.LOG_LEVELS[currentLevel];
  }

  /**
   * Logs an informational message
   */
  public info(message: string): void {
    if (this.shouldLog('info')) {
      this.outputChannel.appendLine(`[INFO] ${Utils.formatTimestamp()}: ${message}`);
    }
  }

  /**
   * Logs an error message
   */
  public error(message: string, error?: Error): void {
    if (this.shouldLog('error')) {
      const errorMessage = error ? `${message}: ${error.message}` : message;
      this.outputChannel.appendLine(`[ERROR] ${Utils.formatTimestamp()}: ${errorMessage}`);
      if (error?.stack) {
        this.outputChannel.appendLine(`Stack trace: ${error.stack}`);
      }
    }
  }

  /**
   * Logs a warning message
   */
  public warn(message: string): void {
    if (this.shouldLog('warn')) {
      this.outputChannel.appendLine(`[WARN] ${Utils.formatTimestamp()}: ${message}`);
    }
  }

  /**
   * Logs a debug message
   */
  public debug(message: string): void {
    if (this.shouldLog('debug')) {
      this.outputChannel.appendLine(`[DEBUG] ${Utils.formatTimestamp()}: ${message}`);
    }
  }

  /**
   * Shows the output channel
   */
  public show(): void {
    this.outputChannel.show();
  }

  /**
   * Disposes of the output channel
   */
  public dispose(): void {
    this.outputChannel.dispose();
  }
}
