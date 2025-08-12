# Change Log

All notable changes to the "powershelllocalization" extension will be documented
in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how
to structure this file.

## [0.2.0]

### Added
- Windows PowerShell fallback support for better compatibility
  - Extension now automatically detects and uses available PowerShell executable
  - Tries PowerShell 7+ (`pwsh`) first, then falls back to Windows PowerShell 5.1 (`powershell`)
  - Enables extension to work in enterprise environments where only Windows PowerShell is available
  - Caches detected executable to avoid repeated detection calls
  - Enhanced error handling with clearer error messages when no PowerShell is found
- Changelog update instructions to Copilot instructions
  - Clear process for updating CHANGELOG.md for every PR
  - Guidelines for using Keep a Changelog format categories
  - Examples and validation checklist for changelog entries
- Configurable logging levels to control debug message visibility
  - New `powershellLocalization.logLevel` setting with four hierarchical levels:
    - `error` - Only error messages
    - `warn` - Error and warning messages
    - `info` - Error, warning, and info messages (default)
    - `debug` - All messages including debug output
  - Smart log filtering that respects the configured log level
  - Debug messages are now filtered out by default, providing cleaner output

## [0.1.0] Initial Release

- Foundational script `LocalizationParser` looks for `psm1` that container
  `Import-LocalizedData` and using the AST attempt to execute a similar command.
- Initial configuration options configured:
  - `enableInlineValues`: False by default. This renders localization variables
    during debugging.
  - `enableDecorations`: Shows inline decorators while you write code so you can
    see the localized text while you work.
  - `searchExclude`: A list of globs of folders to ignore. This is useful if
    your module builds output and you don't want to parse it.
- The extension turns on when it detects PowerShell files.
- The localized data is cached for efficiency and is reloaded when the psm1 or
  psd1 files are modified.
