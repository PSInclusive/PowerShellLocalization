import * as childProcess from 'child_process';
import * as path from 'path';
import { LocalizationData } from './types';
import { Logger } from './logger';

/**
 * Service for executing PowerShell scripts and parsing localization data
 */
export class PowerShellExecutor {
  private logger: Logger;
  private static readonly POWERSHELL_EXECUTABLE = 'pwsh';

  constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Executes the LocalizationParser.ps1 script for a given module
   */
  public async parseLocalizationData(modulePath: string): Promise<LocalizationData> {
    this.logger.debug(`Parsing localization data for module: ${modulePath}`);

    try {
      const scriptPath = path.join(__dirname, '..', 'resources', 'LocalizationParser.ps1');

      // TODO: Add support for loading a specific UICulture
      const args = ['-ModuleFile', modulePath];

      const output = await this.executeScript(scriptPath, args);

      const parsed = JSON.parse(output) as LocalizationData;
      this.logger.debug(`Successfully parsed localization data: ${JSON.stringify(parsed, null, 2)}`);
      return parsed;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Failed to parse JSON')) {
          this.logger.error('JSON parsing failed', error);
        } else {
          this.logger.error('PowerShell script execution failed', error);
        }
      }
      throw error;
    }
  }

  /**
   * Checks if PowerShell is available on the system
   */
  public async isPowerShellAvailable(): Promise<boolean> {
    try {
      const output = await this.executeScript('', ['-Command', 'Write-Host "$($PSVersionTable.PSVersion)"']);
      this.logger.info(`Detected PowerShell version: ${output.trim()}`);
      return true;
    } catch (error) {
      this.logger.warn(`PowerShell not available or failed to execute: ${error}`);
      return false;
    }
  }

  /*
  * Safer and consistent PowerShell execution
  * 
  * @param scriptPath - Path to the PowerShell script file (empty string for command execution)
  * @param args - Array of arguments to pass to PowerShell
  * 
  * Note: This method filters and validates arguments to ensure safe execution:
  * - Only allows standard PowerShell parameters and user-provided arguments
  * - Automatically applies security flags (-NoLogo, -NoProfile, -NonInteractive)
  * - Supports both script file execution and direct command execution
  * - Filters out potentially dangerous arguments for security
  */
  public executeScript(scriptPath: string, args: string[] = []): Promise<string> {
    this.logger.debug(`Executing PowerShell script: ${scriptPath} with args: ${args.join(' ')}`);

    // Filter arguments to prevent potentially dangerous operations
    // Allow only safe PowerShell parameters and user arguments
    const allowedArgPrefixes = [
      '-Command',
      '-File',
      '-ModuleFile',
      '-Path',
      '-Name',
      '-Filter',
      '-Include',
      '-Exclude',
      '-Recurse',
      '-Force',
      '-Confirm',
      '-WhatIf',
      '-Verbose',
      '-Debug'
    ];

    const filteredArgs = args.filter(arg => {
      // Allow non-parameter arguments (values)
      if (!arg.startsWith('-')) {
        return true;
      }
      // Check if the parameter is in our allowed list
      return allowedArgPrefixes.some(prefix => arg.startsWith(prefix));
    });

    if (filteredArgs.length !== args.length) {
      this.logger.warn(`Filtered out ${args.length - filteredArgs.length} potentially unsafe arguments`);
    }

    return new Promise<string>((resolve, reject) => {
      const pwshArguments = [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-OutputFormat',
        'Text'
      ];
      if (scriptPath) {
        pwshArguments.push('-File', scriptPath);
      }
      if (filteredArgs && filteredArgs.length > 0) {
        pwshArguments.push(...filteredArgs);
      }

      const ps = childProcess.spawn(
        PowerShellExecutor.POWERSHELL_EXECUTABLE,
        pwshArguments,
        { shell: true }
      );

      let output = '';
      let errorOutput = '';

      ps.stdout.on('data', (data: Buffer) => {
        // PowerShell returns UTF-16 encoded output, decode appropriately
        output += data.toString();
      });

      ps.stderr.on('data', (data: Buffer) => {
        // PowerShell returns UTF-16 encoded output, decode appropriately
        const errorText = data.toString();
        errorOutput += errorText;
        this.logger.warn(`PowerShell stderr: ${errorText}`);
      });

      ps.on('close', (code: number) => {
        if (code !== 0) {
          const error = new Error(`PowerShell script exited with code ${code}: ${errorOutput}`);
          this.logger.error('PowerShell script execution failed', error);
          reject(error);
          return;
        }

        resolve(output);
      });

      ps.on('error', (error: Error) => {
        this.logger.error('Failed to start PowerShell process', error);
        reject(error);
      });
    });
  }
}

