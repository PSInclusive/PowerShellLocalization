# PowerShell Localization VS Code Extension

A Visual Studio Code extension that displays PowerShell localization variable values as decorations in your editor, making it easier to develop and debug internationalized PowerShell modules.

**Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

**CRITICAL: NEVER CANCEL ANY BUILD OR TEST COMMANDS. All build times and timeouts have been measured and validated. Builds may take several minutes but will complete successfully if you wait.**

## Working Effectively

### Bootstrap, Build, and Test the Repository

**NEVER CANCEL any of these commands - all have been validated to complete successfully:**

1. **Install dependencies** (takes ~30 seconds):
   ```bash
   yarn install
   ```

2. **Compile TypeScript** (takes ~3 seconds, NEVER CANCEL - use 60+ second timeout):
   ```bash
   yarn run compile
   ```

3. **Run linting** (takes ~1 second):
   ```bash
   yarn run lint
   ```

4. **Install Visual Studio Code Extension manager** (takes ~90 seconds, NEVER CANCEL):
   ```bash
   npm install -g @vscode/vsce
   ```

5. **Package the extension** (takes ~5 seconds):
   ```bash
   echo 'y' | vsce package --allow-missing-repository
   ```

6. **Complete build and validation** (total time ~2-3 minutes, NEVER CANCEL - use 300+ second timeout):
   ```bash
   yarn install && yarn run compile && yarn run lint && vsce package --allow-missing-repository
   ```

### Alternative PowerShell-based Build (Optional)

The repository includes PowerShell-based build scripts, but they require PowerShell Gallery access which may not be available in all environments:

```powershell
# If PowerShell Gallery is available
./build.ps1 -Bootstrap -Task Test

# List available build tasks
./build.ps1 -Help
```

**Note**: In environments without PowerShell Gallery access, use the yarn-based build commands above instead.

### Manual Validation and Testing

**VALIDATION SCENARIOS**: Always run these manual validation steps after making changes:

1. **Test PowerShell localization parsing** (works immediately):
   ```bash
   pwsh -File ./resources/LocalizationParser.ps1 -ModuleFile ./tests/fixtures/Example/Example.psm1 -UICulture en-US -Verbose
   ```
   Should output JSON with `LocalizedData` and `AsSplat` keys containing English values (Key1: "Value1", etc.).

2. **Test French localization parsing** (validate multi-language support):
   ```bash
   pwsh -File ./resources/LocalizationParser.ps1 -ModuleFile ./tests/fixtures/Example/Example.psm1 -UICulture fr-FR
   ```
   Should output JSON with French values (Key1: "Valeur1", etc.).

3. **Verify extension package creation**:
   ```bash
   ls -la *.vsix
   ```
   Should show a `.vsix` file (e.g., `powershelllocalization-0.2.0.vsix`) approximately 225KB in size.

4. **Check compiled output**:
   ```bash
   ls -la out/
   ```
   Should contain 10 compiled JavaScript files including `extension.js`, `extensionManager.js`, `powershellExecutor.js`, etc.

5. **Validate TypeScript compilation produces source maps**:
   ```bash
   ls out/*.js.map | wc -l
   ```
   Should show 10 source map files for debugging support.

6. **Test incremental development workflow**:
   ```bash
   # Make a trivial change
   echo "// Test comment" >> src/utils.ts
   # Compile and lint
   yarn run compile && yarn run lint
   # Revert change
   git checkout src/utils.ts
   ```
   Should complete without errors and revert cleanly.

### VS Code Testing Limitations

**IMPORTANT**: VS Code extension tests (`yarn run vscode:test`) cannot run in environments without internet access to download VS Code. This is normal and expected. The extension functionality can be validated through:
- Successful compilation and packaging
- Manual testing of the PowerShell localization parser
- Linting validation
- Review of compiled output files

## Development Workflow

### Making Code Changes

1. **Always run the complete build chain first** to ensure starting state is clean
2. **Make your changes** to TypeScript files in `src/`
3. **Compile immediately** after each change: `yarn run compile`
4. **Run linting** to catch issues early: `yarn run lint`
5. **Test the PowerShell parser** if you modify localization logic
6. **Package the extension** to ensure no packaging issues: `vsce package --allow-missing-repository`
7. **Update the changelog** for every PR (see Changelog Updates section below)

### Changelog Updates

**REQUIRED FOR EVERY PR**: Update the CHANGELOG.md file following the [Keep a Changelog](http://keepachangelog.com/) format.

**Process:**
1. **Add your changes** to the "Unreleased" section at the top of `CHANGELOG.md`
2. **Use appropriate categories** for your changes:
   - **Added** - for new features
   - **Changed** - for changes in existing functionality
   - **Deprecated** - for soon-to-be removed features
   - **Removed** - for now removed features
   - **Fixed** - for any bug fixes
   - **Security** - in case of vulnerabilities
3. **Write clear descriptions** that help users understand the impact of changes
4. **Keep entries concise** but descriptive enough for users to understand what changed

**Example changelog entry:**
```markdown
## [Unreleased]

### Added
- New PowerShell localization parsing feature for multi-language support

### Fixed
- Resolved issue with decoration provider not updating on file changes
```

**Note**: The "Unreleased" section will be converted to a version number during releases. Your job is only to add entries to the "Unreleased" section.

### Key Commands for Development

- **Watch mode for continuous compilation**: `yarn run watch`
- **Clean build**: Remove `out/` directory, then run full build
- **Test localization parser**: Use the validated command above with test fixtures
- **Format code**: Follow the existing ESLint configuration

### Common Validation Steps

Before completing any change, always run:
```bash
yarn run lint && yarn run compile && vsce package --allow-missing-repository
```

**Also verify:**
- [ ] CHANGELOG.md has been updated with your changes in the "Unreleased" section
- [ ] Changelog entries follow Keep a Changelog format with appropriate categories
- [ ] Changelog descriptions are clear and user-focused

## Architecture Overview

### Key Projects and Components

1. **Extension Entry Point** (`src/extension.ts`)
   - Main VS Code extension activation/deactivation logic

2. **Extension Manager** (`src/extensionManager.ts`)
   - Central coordinator for all extension functionality
   - Manages component lifecycle and configuration changes

3. **PowerShell Integration** (`src/powershellExecutor.ts`, `resources/LocalizationParser.ps1`)
   - Executes PowerShell scripts to parse localization data
   - Core functionality for extracting Import-LocalizedData calls

4. **Module Scanner** (`src/moduleScanner.ts`)
   - Scans workspace for PowerShell modules (.psm1 files)
   - Detects Import-LocalizedData usage patterns

5. **Inline Values Provider** (`src/inlineValuesProvider.ts`)
   - Provides inline value display during debugging
   - Integrates with VS Code's debugging API

6. **Decoration Provider** (`src/decorationProvider.ts`)
   - Shows localization values as editor decorations
   - Error Lens style visual feedback

7. **Configuration Manager** (`src/configuration.ts`)
   - Handles VS Code extension settings
   - Type-safe configuration access

### Test Fixtures Location

- **Example PowerShell module**: `tests/fixtures/Example/Example.psm1`
- **English localization**: `tests/fixtures/Example/en-US/Example.psd1`
- **French localization**: `tests/fixtures/Example/fr-FR/Example.psd1`

These fixtures demonstrate the extension's functionality and can be used for manual testing.

## Build Timing and Expectations

- **Dependency installation** (first time): 30 seconds (NEVER CANCEL, use 120+ second timeout)
- **Dependency installation** (subsequent): <1 second (Already up-to-date)
- **TypeScript compilation**: 2-3 seconds (NEVER CANCEL, use 60+ second timeout)
- **Linting**: 1 second (NEVER CANCEL, use 30+ second timeout)
- **Extension packaging**: 3-5 seconds (NEVER CANCEL, use 60+ second timeout)
- **Complete build chain** (yarn install + compile + lint + package): 7-8 seconds when deps exist
- **Total build time from scratch**: 40-50 seconds including first-time dependency installation
- **vsce installation** (one time): 90 seconds (NEVER CANCEL, use 300+ second timeout)
- **PowerShell localization parsing**: < 1 second (instantaneous)

**All commands have been validated and measured. These timings are accurate for the environment.**

## Troubleshooting

### PowerShell Gallery Not Available
If `./build.ps1 -Bootstrap` fails with PSGallery errors:
- Use yarn-based build commands instead
- This is normal in restricted environments
- All functionality can be validated without PowerShell Gallery modules

### VS Code Tests Cannot Run
If `yarn run vscode:test` fails with network errors:
- This is expected in environments without internet access
- Use manual validation methods described above
- The extension can still be fully built and validated

### Build Failures
If any build command fails:
1. Check Node.js version (requires 18+): `node --version` (verified: v20.19.4 works)
2. Check yarn version: `yarn --version` (verified: 1.22.22 works)
3. Check PowerShell version (requires 7+): `pwsh --version` (verified: 7.4.10 works)
4. Try cleaning: `rm -rf out/ node_modules/ && yarn install`
5. Check for file permission issues in the out/ directory

### Cannot Install vsce
If `npm install -g @vscode/vsce` fails:
- Use yarn instead: `yarn global add @vscode/vsce`
- Check npm permissions or use a different package manager
- Verify network connectivity

### Extension Package Size Issues
If the .vsix file is unexpectedly large or small:
- Expected size: approximately 225KB
- Contains 35 files including compiled JavaScript, documentation, and assets
- Check if out/ directory was compiled correctly before packaging

### PowerShell Script Execution Issues
If the LocalizationParser.ps1 script fails:
- Ensure PowerShell execution policy allows script execution
- Check that the test fixtures exist in tests/fixtures/Example/
- Verify PowerShell 7+ is being used (not Windows PowerShell 5.1)

## Extension Settings

This extension contributes these VS Code settings:

- `powershellLocalization.enableDecorations`: Enable/disable decoration display (default: true)
- `powershellLocalization.enableInlineValues`: Enable/disable inline values during debugging (default: false)
- `powershellLocalization.searchExclude`: Configure glob patterns for excluding directories (default: excludes node_modules, out, dist, .git)

## Common File Locations

### Repository Root
```
├── .github/workflows/          # CI/CD workflows
├── src/                       # TypeScript source code
├── out/                       # Compiled JavaScript (after build)
├── tests/                     # Test files and fixtures
├── resources/                 # PowerShell scripts and resources
├── static/                    # Images and static assets
├── package.json              # Extension manifest and npm config
├── tsconfig.json             # TypeScript configuration
├── eslint.config.mjs         # Linting configuration
├── build.ps1                 # PowerShell build script
├── psake.ps1                 # PowerShell build tasks
└── requirements.psd1         # PowerShell module dependencies
```

### Source Code Structure (`src/`)
```
├── extension.ts              # Main entry point
├── extensionManager.ts       # Central coordinator
├── configuration.ts          # Settings management
├── logger.ts                 # Logging utility
├── moduleScanner.ts          # PowerShell module detection
├── powershellExecutor.ts     # PowerShell integration
├── inlineValuesProvider.ts   # Debug inline values
├── decorationProvider.ts     # Editor decorations
├── types.ts                  # TypeScript definitions
├── utils.ts                  # Utility functions
└── test/extension.test.ts    # VS Code extension tests
```

Always check these key files after making changes to understand the extension's behavior and ensure your modifications integrate properly with the existing architecture.