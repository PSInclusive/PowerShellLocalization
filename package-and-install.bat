@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo PowerShell Localization Extension Build
echo ========================================
echo.

:: Check if PowerShell is available
where pwsh >nul 2>&1
if %errorlevel% neq 0 (
    echo PowerShell Core not found. Trying Windows PowerShell...
    where powershell >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: No PowerShell found. Please install PowerShell Core.
        pause
        exit /b 1
    )
    set PWSH_CMD=powershell
) else (
    set PWSH_CMD=pwsh
)

:: Run the PowerShell script
echo Running packaging script...
%PWSH_CMD% -ExecutionPolicy Bypass -File "%~dp0package-and-install.ps1" %*

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Packaging failed!
    pause
    exit /b %errorlevel%
)

echo.
echo SUCCESS: Extension packaged and installed!
pause
