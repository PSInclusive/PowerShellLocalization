# Change Log

All notable changes to the "powershelllocalization" extension will be documented
in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how
to structure this file.

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
