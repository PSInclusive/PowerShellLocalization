# Extension Packaging and Installation

This document explains how to package and install the PowerShell Localization
extension for development and testing purposes.

> [!NOTE]
> Tasks are split between psake and yarn. This is due to the fact that
> psake can setup more robust dependencies. Several tasks can only be called via
> Node so those calls stay in the package.json

## Quick Start

### Bootstrap

To install all the necessary dependencies ensure that you bootstrap your
environment.

```powershell
.\build.ps1 -Bootstrap
```

### Option 1: PowerShell Build Script (Recommended)

```powershell
# To run through the compile, lint, and test
.\build.ps1 -Task Test
# To run all the tests + Install
.\build.ps1 -Task Install
# To see all the possible tasks
.\build.ps1 -Help
```

This will configure the environment and perform a clean build, compile, lint,
package, and install the extension.

#### To install

### Option 2: NPM Scripts

```bash
# Package (calls psake)
yarn package

# Get a list of packages
yarn run
```

## Script Features

The `build.ps1` script provides the following functionality (via `psake.ps1`):

- ✅ **Dependency Check**: Automatically installs `vsce` if not present
- 🧹 **Clean Build**: Removes previous builds and packages
- 🔨 **Compilation**: Compiles TypeScript source code
- 🔍 **Linting**: Runs ESLint for code quality
- 📦 **Packaging**: Creates a `.vsix` extension package
- 🚀 **Installation**: Installs the extension in VS Code

## Script Parameters

See
[Parameters & Properties](https://psake.dev/docs/tutorial-basics/parameters-properties)
for a more detailed explanation. It is highly unlikely you'll need to modify any
of the properties.

```powershell
# Test (default)
.\build.ps1

# Package only to a different output directory
.\build.ps1 -Task Package -Parameters @{ OutDir = '/path/to/dir' }

# Force installation even if already installed
.\build.ps1 -Parameters @{ Force = $true }

# Combine parameters
.\build.ps1 -Parameters @{ SkipInstall = $true; Force = $true }
```

## Manual Steps

If you prefer to run the steps manually:

1. **Install vsce** (if not already installed):

   ```bash
   npm install -g @vscode/vsce
   ```

2. **Install dependencies**:

   ```bash
   yarn install
   ```

3. **Compile TypeScript**:

   ```bash
   yarn run compile
   ```

4. **Package extension**:

   ```bash
   vsce package --allow-missing-repository --out $script:outDir
   ```

5. **Install extension**:

   ```shell
   code --install-extension powershelllocalization-*.vsix
   ```

## Troubleshooting

### vsce Installation Issues

If `vsce` installation fails, try:

```bash
npm install -g @vscode/vsce --force
```

### PowerShell Execution Policy

If you get execution policy errors, run:

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser
```

### Extension Not Loading

After installation:

1. Reload VS Code (`Ctrl+Shift+P` → "Developer: Reload Window")
2. Open a PowerShell file (`.ps1`, `.psm1`, or `.psd1`)
3. Check that the extension is active in the Extensions panel
4. You should see logs in the Output panel.

### Continuous Integration

For GitHub Actions or other CI systems, use the `CI` task to output build/package information:

```powershell
.\build.ps1 -Task CI
```

This will output the VSIX path, name, and Changelog information to
`$env:GITHUB_OUTPUT` for use in workflows.

## Development Workflow

For active development, you can use the watch mode:

```bash
# Start TypeScript compiler in watch mode
yarn run watch
```

Then use F5 in VS Code to launch the Extension Development Host for testing.

## Files Generated

- `powershelllocalization-*.vsix` - The packaged extension file
- `out/` - Compiled JavaScript output
- Extension logs in VS Code Developer Tools

## Next Steps

After successful installation:

1. Open a PowerShell module with localization files
2. Verify that localization variables show inline values
3. Test the extension configuration in VS Code settings
