# Extension Packaging and Installation

This document explains how to package and install the PowerShell Localization extension for development and testing purposes.

## Quick Start

### Option 1: PowerShell Script (Recommended)

```powershell
.\package-and-install.ps1
```

### Option 2: Batch File (Windows)

```cmd
package-and-install.bat
```

### Option 3: NPM Scripts

```bash
# Package and install
yarn package-install

# Package only (skip installation)
yarn package-only

# Package using vsce directly
yarn package
```

## Script Features

The `package-and-install.ps1` script provides the following functionality:

- ✅ **Dependency Check**: Automatically installs `vsce` if not present
- 🧹 **Clean Build**: Removes previous builds and packages
- 🔨 **Compilation**: Compiles TypeScript source code
- 🔍 **Linting**: Runs ESLint for code quality
- 📦 **Packaging**: Creates a `.vsix` extension package
- 🚀 **Installation**: Installs the extension in VS Code

## Script Parameters

```powershell
# Package and install (default)
.\package-and-install.ps1

# Package only, skip installation
.\package-and-install.ps1 -SkipInstall

# Force installation even if already installed
.\package-and-install.ps1 -Force

# Combine parameters
.\package-and-install.ps1 -SkipInstall -Force
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
   vsce package
   ```

5. **Install extension**:

   ```bash
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

### Clean Installation

To completely clean and reinstall:

```powershell
# Remove old packages
Remove-Item *.vsix -Force

# Clean compiled output
Remove-Item -Recurse out -Force

# Run full package and install
.\package-and-install.ps1 -Force
```

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
