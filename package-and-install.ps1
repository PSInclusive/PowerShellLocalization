#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Packages and installs the PowerShell Localization VS Code extension.

.DESCRIPTION
    This script compiles, packages, and installs the PowerShell Localization extension.
    It will:
    1. Install vsce if not already available
    2. Clean any existing builds
    3. Compile the TypeScript code
    4. Package the extension into a .vsix file
    5. Install the extension in VS Code

.PARAMETER SkipInstall
    If specified, only packages the extension without installing it.

.PARAMETER Force
    If specified, forces installation even if the extension is already installed.

.EXAMPLE
    .\package-and-install.ps1
    Packages and installs the extension.

.EXAMPLE
    .\package-and-install.ps1 -SkipInstall
    Only packages the extension without installing it.
#>

[CmdletBinding()]
param(
  [switch]$SkipInstall,
  [switch]$Force
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Get the script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "📦 PowerShell Localization Extension Packager" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Step 1: Check if vsce is installed
Write-Host "🔍 Checking for vsce (Visual Studio Code Extension manager)..." -ForegroundColor Yellow

try {
  $vsceVersion = & vsce --version 2>$null
  Write-Host "✅ vsce is already installed (version: $vsceVersion)" -ForegroundColor Green
} catch {
  Write-Host "⚠️  vsce not found. Installing vsce globally..." -ForegroundColor Yellow
  try {
    & npm install -g @vscode/vsce
    Write-Host "✅ vsce installed successfully" -ForegroundColor Green
  } catch {
    Write-Error "❌ Failed to install vsce. Please install it manually: npm install -g @vscode/vsce"
    exit 1
  }
}

# Step 2: Install dependencies
Write-Host "📥 Installing dependencies..." -ForegroundColor Yellow
try {
  & yarn install
  Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
} catch {
  Write-Error "❌ Failed to install dependencies. Make sure yarn is installed."
  exit 1
}

# Step 3: Clean previous builds
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "out") {
  Remove-Item -Recurse -Force "out"
  Write-Host "✅ Cleaned 'out' directory" -ForegroundColor Green
}

if (Test-Path "*.vsix") {
  Remove-Item -Force "*.vsix"
  Write-Host "✅ Cleaned previous .vsix files" -ForegroundColor Green
}

# Step 4: Compile TypeScript
Write-Host "🔨 Compiling TypeScript..." -ForegroundColor Yellow
try {
  & yarn run compile
  Write-Host "✅ TypeScript compiled successfully" -ForegroundColor Green
} catch {
  Write-Error "❌ TypeScript compilation failed"
  exit 1
}

# Step 5: Run linting
Write-Host "🔍 Running linter..." -ForegroundColor Yellow
try {
  & yarn run lint
  Write-Host "✅ Linting passed" -ForegroundColor Green
} catch {
  Write-Warning "⚠️  Linting issues found, but continuing with packaging..."
}

# Step 6: Package the extension
Write-Host "📦 Packaging extension..." -ForegroundColor Yellow
try {
  # Use echo to automatically answer 'y' to the license question
  $packageResult = Write-Output "y" | vsce package --allow-missing-repository
    
  # Find the generated .vsix file
  $vsixFiles = Get-ChildItem -Filter "*.vsix" | Sort-Object LastWriteTime -Descending
  if ($vsixFiles.Count -eq 0) {
    Write-Error "❌ No .vsix file was generated"
    exit 1
  }
    
  $vsixFile = $vsixFiles[0].Name
  Write-Host "✅ Extension packaged successfully: $vsixFile" -ForegroundColor Green
} catch {
  Write-Error "❌ Failed to package extension: $($_.Exception.Message)"
  exit 1
}

# Step 7: Install the extension (if not skipped)
if (-not $SkipInstall) {
  Write-Host "🚀 Installing extension in VS Code..." -ForegroundColor Yellow
    
  try {
    if ($Force) {
      & code --install-extension $vsixFile --force
    } else {
      & code --install-extension $vsixFile
    }
    Write-Host "✅ Extension installed successfully!" -ForegroundColor Green
    Write-Host "🔄 Please reload VS Code to activate the extension." -ForegroundColor Cyan
  } catch {
    Write-Error "❌ Failed to install extension. You can manually install it using: code --install-extension $vsixFile"
    exit 1
  }
} else {
  Write-Host "⏭️  Skipping installation as requested" -ForegroundColor Yellow
  Write-Host "📋 To install manually, run: code --install-extension $vsixFile" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "🎉 Process completed successfully!" -ForegroundColor Green
Write-Host "📁 Extension package location: $((Get-Location).Path)\$vsixFile" -ForegroundColor Cyan

if (-not $SkipInstall) {
  Write-Host "💡 Next steps:" -ForegroundColor Yellow
  Write-Host "   1. Reload VS Code (Ctrl+Shift+P -> 'Developer: Reload Window')" -ForegroundColor White
  Write-Host "   2. Open a PowerShell file to test the extension" -ForegroundColor White
  Write-Host "   3. Check that localization variables are displayed inline" -ForegroundColor White
}
