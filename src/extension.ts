// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { InlineValue, InlineValuesProvider, ProviderResult } from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
let hasLocalizedDataModule = false;
const outputChannel = vscode.window.createOutputChannel('PowerShell Localization');

export function activate(context: vscode.ExtensionContext) {
  outputChannel.appendLine('Extension activated. Scanning for .psm1 files...');
  (async () => {
    try {
      const psm1Files = await vscode.workspace.findFiles('**/*.psm1');
      outputChannel.appendLine(`Found ${psm1Files.length} .psm1 file(s).`);
      for (const file of psm1Files) {
        outputChannel.appendLine(`Scanning file: ${file.fsPath}`);
        const content = await vscode.workspace.fs.readFile(file);
        // Convert Uint8Array to string
        const text = Buffer.from(content).toString('utf8');
        if (text.includes('Import-LocalizedData')) {
          hasLocalizedDataModule = true;
          outputChannel.appendLine(`Detected Import-LocalizedData in: ${file.fsPath}`);
          break;
        }
      }
      outputChannel.appendLine(`hasLocalizedDataModule: ${hasLocalizedDataModule}`);

      if (hasLocalizedDataModule && psm1Files.length > 0) {
        const { registerInlineValuesProvider } = vscode.languages;
        const child_process = require('child_process');

        const provider: InlineValuesProvider = {
          provideInlineValues: async (
            document: vscode.TextDocument,
            viewPort: vscode.Range,
            context: vscode.InlineValueContext,
            token: vscode.CancellationToken
          ): Promise<InlineValue[]> => {
            // For demonstration, use the first .psm1 file found
            const psm1Path = psm1Files[0].fsPath;
            return new Promise<InlineValue[]>((resolve) => {
              // Run the PowerShell script
              const ps = child_process.spawn(
                'pwsh',
                [
                  '-File',
                  require('path').join(__dirname, 'LocalizationParser.ps1'),
                  psm1Path
                ],
                { shell: true }
              );

              let output = '';
              ps.stdout.on('data', (data: Buffer) => {
                output += data.toString();
              });

              ps.stderr.on('data', (data: Buffer) => {
                outputChannel.appendLine(`PowerShell error: ${data}`);
              });

              ps.on('close', (code: number) => {
                try {
                  const parsed = JSON.parse(output);
                  outputChannel.appendLine(`Parsed JSON from LocalizationParser.ps1: ${JSON.stringify(parsed, null, 2)}`);

                  // Find all variable and property usages in the visible range
                  const inlineValues: InlineValue[] = [];
                  // Matches $var or $var.key (property access)
                  const varOrPropRegex = /\$([A-Za-z_][A-Za-z0-9_]*)(?:\.([A-Za-z_][A-Za-z0-9_]*))?/g;

                  for (let line = viewPort.start.line; line <= viewPort.end.line; line++) {
                    const textLine = document.lineAt(line);
                    let match: RegExpExecArray | null;
                    while ((match = varOrPropRegex.exec(textLine.text)) !== null) {
                      const varName = match[1];
                      const propName = match[2];
                      if (propName) {
                        // Property access: $var.key
                        if (
                          parsed[varName] &&
                          typeof parsed[varName] === 'object' &&
                          parsed[varName] !== null &&
                          Object.prototype.hasOwnProperty.call(parsed[varName], propName)
                        ) {
                          const value = parsed[varName][propName];
                          const propRange = new vscode.Range(
                            line,
                            match.index,
                            line,
                            match.index + match[0].length
                          );
                          inlineValues.push(new vscode.InlineValueText(propRange, String(value)));
                        }
                      } else {
                        // Plain variable usage: $var
                        if (
                          parsed[varName] &&
                          typeof parsed[varName] === 'object' &&
                          parsed[varName] !== null
                        ) {
                          // Show all key-value pairs for this variable as a string
                          const localizedValue = Object.entries(parsed[varName])
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(', ');
                          const varRange = new vscode.Range(
                            line,
                            match.index,
                            line,
                            match.index + match[0].length
                          );
                          inlineValues.push(new vscode.InlineValueText(varRange, localizedValue));
                        }
                      }
                    }
                  }
                  resolve(inlineValues);
                } catch (err) {
                  outputChannel.appendLine(`Failed to parse JSON: ${err}`);
                }
                resolve([]);
              });
            });
          }
        };

        context.subscriptions.push(
          registerInlineValuesProvider('powershell', provider)
        );
        outputChannel.appendLine('Registered PowerShell inline values provider.');
      }
    } catch (err) {
      outputChannel.appendLine(`Error scanning for Import-LocalizedData: ${err}`);
    }
  })();
}

// This method is called when your extension is deactivated
export function deactivate() { }
