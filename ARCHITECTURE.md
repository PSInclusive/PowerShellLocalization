# PowerShell Localization Extension - Architecture

This document describes the restructured architecture of the PowerShell Localization VS Code extension.

## Architecture Overview

The extension has been restructured following best practices with a modular, maintainable design. The main components are:

### Core Components

#### 1. ExtensionManager (`extensionManager.ts`)

- **Purpose**: Main orchestrator that coordinates all extension components
- **Responsibilities**:
  - Extension initialization and cleanup
  - Component lifecycle management
  - Configuration change handling
  - File system watching setup

#### 2. Logger (`logger.ts`)

- **Purpose**: Centralized logging utility
- **Features**:
  - Singleton pattern for consistent logging
  - Multiple log levels (info, error, warn, debug)
  - Timestamped messages
  - VS Code output channel integration

#### 3. ConfigurationManager (`configuration.ts`)

- **Purpose**: Manages extension configuration
- **Features**:
  - Configuration reading and validation
  - Change event handling
  - Type-safe configuration access

#### 4. PowerShellModuleScanner (`moduleScanner.ts`)

- **Purpose**: Scans and analyzes PowerShell module files
- **Responsibilities**:
  - Workspace scanning for .psm1 files
  - Import-LocalizedData detection
  - Module information caching

#### 5. PowerShellExecutor (`powershellExecutor.ts`)

- **Purpose**: Executes PowerShell scripts and processes
- **Features**:
  - PowerShell process management
  - Error handling and logging
  - JSON parsing of script output
  - PowerShell availability checking

#### 6. LocalizationInlineValuesProvider (`inlineValuesProvider.ts`)

- **Purpose**: Provides inline values for localization variables
- **Features**:
  - Variable and property detection
  - Localization data caching
  - Inline value generation
  - Performance optimization

### Supporting Files

#### 7. Types (`types.ts`)

- **Purpose**: TypeScript type definitions
- **Contents**:
  - Interface definitions
  - Type aliases
  - Data structure contracts

#### 8. Utils (`utils.ts`)

- **Purpose**: Constants and utility functions
- **Contents**:
  - Extension constants
  - File type checking utilities
  - Common helper functions
  - Regex patterns

#### 9. Extension Entry Point (`extension.ts`)

- **Purpose**: VS Code extension entry point
- **Responsibilities**:
  - Extension activation/deactivation
  - Error handling
  - ExtensionManager initialization

## Design Principles

### 1. Single Responsibility Principle

Each class has a single, well-defined responsibility:

- Logger handles only logging
- ConfigurationManager handles only configuration
- PowerShellExecutor handles only PowerShell execution

### 2. Dependency Injection

Components receive their dependencies through constructors or method parameters, making testing easier and reducing coupling.

### 3. Error Handling

Comprehensive error handling at each layer:

- Try-catch blocks with proper logging
- Graceful degradation when components fail
- User-friendly error messages

### 4. Caching Strategy

- Localization data is cached to improve performance
- Cache invalidation on file changes
- Memory-efficient cache management

### 5. Configuration-Driven

- All behaviors can be controlled through VS Code settings
- Runtime configuration changes are supported
- Type-safe configuration access

## File Structure

```
src/
├── extension.ts              # Entry point
├── extensionManager.ts       # Main coordinator
├── types.ts                  # Type definitions
├── utils.ts                  # Constants and utilities
├── logger.ts                 # Logging utility
├── configuration.ts          # Configuration management
├── moduleScanner.ts          # PowerShell module scanning
├── powershellExecutor.ts     # PowerShell execution
├── inlineValuesProvider.ts   # Inline values provider
└── LocalizationParser.ps1   # PowerShell script
```

## Benefits of This Architecture

### 1. Maintainability

- Clear separation of concerns
- Easy to understand and modify
- Consistent code patterns

### 2. Testability

- Each component can be unit tested independently
- Dependency injection enables mocking
- Clear interfaces for testing

### 3. Extensibility

- Easy to add new features
- Minimal impact when changing existing functionality
- Well-defined extension points

### 4. Performance

- Efficient caching strategies
- Lazy loading where appropriate
- Resource cleanup and disposal

### 5. Robustness

- Comprehensive error handling
- Graceful degradation
- Resource management

## Usage Patterns

### Adding New Features

1. Define types in `types.ts`
2. Add constants to `utils.ts`
3. Create new service classes following existing patterns
4. Register with `ExtensionManager`
5. Add configuration options if needed

### Debugging

- Use the Logger singleton for consistent logging
- Check the "PowerShell Localization" output channel
- Enable debug logging for detailed information

### Configuration

- All settings are in the `powershelllocalization` section
- Changes are automatically detected and applied
- Type-safe access through `ConfigurationManager`
