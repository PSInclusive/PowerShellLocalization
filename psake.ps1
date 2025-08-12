# psake build script for PowerShellLocalization
# See https://psake.dev/ for syntax and usage
#requires -Version 7
Properties {
  $script:extensionName = 'PowerShellLocalization'
  $script:vsixPattern = '*.vsix'
  $script:outDir = 'out'
  $script:scriptDir = $PSScriptRoot

  $script:PesterConfiguration = [PesterConfiguration]@{}
  $script:PesterConfiguration.Output.CIFormat = 'Auto'
  $script:PesterConfiguration.Run.Path = ".\tests\"
}

Task Default -Depends Test
Task Test -Depends Lint, VscodeTest, Pester

Task Clean {
  Write-Host '🧹 Cleaning previous builds...'
  if (Test-Path $script:outDir) {
    Remove-Item -Recurse -Force $script:outDir
    Write-Host "✅ Cleaned '$script:outDir' directory"
  }
  $vsixFiles = Get-ChildItem -Path $script:scriptDir -Filter $script:vsixPattern -ErrorAction SilentlyContinue
  if ($vsixFiles) {
    $vsixFiles | Remove-Item -Force
    Write-Host '✅ Cleaned previous .vsix files'
  }
}


Task InstallVsce {
  Write-Host '🔍 Checking for vsce (Visual Studio Code Extension manager)...'
  try {
    $null = vsce --version 2>$null
    Write-Host '✅ vsce is already installed'
  } catch {
    Write-Host '⚠️  vsce not found. Installing vsce globally...'
    npm install -g @vscode/vsce
    Write-Host '✅ vsce installed successfully'
  }
}

Task InstallDependencies -Depends InstallVsce {
  Write-Host '📥 Installing dependencies...'
  yarn install
  Write-Host '✅ Dependencies installed successfully'
}

Task Compile -Depends InstallDependencies {
  Write-Host '🔨 Compiling TypeScript...'
  yarn run compile
  Write-Host '✅ TypeScript compiled successfully'
}

Task Lint {
  Write-Host '🔍 Running linter...'
  try {
    yarn run lint
    Write-Host '✅ Linting passed'
  } catch {
    Write-Warning '⚠️  Linting issues found, but continuing with packaging...'
  }
}

Task VscodeTest -Depends InstallDependencies {
  Write-Host '🔍 Running VS Code tests...'
  try {
    yarn run vscode:test
    Write-Host '✅ VS Code tests passed'
  } catch {
    Write-Error '❌ VS Code tests failed. Please fix the issues before packaging.'
    exit 1
  }
}

Task Pester {
  Write-Host '🧪 Running Pester tests...'
  try {
    $results = Invoke-Pester -Configuration $script:PesterConfiguration -PassThru
    if ($results.FailedCount -gt 0) {
      Write-Error '❌ Pester tests failed. Please fix the issues before packaging.'
      exit 1
    }
    Write-Host '✅ Pester tests passed'
  } catch {
    Write-Error '❌ Pester tests failed. Please fix the issues before packaging.'
    exit 1
  }
}

Task Package -Depends Clean, Compile, Test {
  Write-Host '📦 Packaging extension...'
  $packageResult = Write-Output 'y' | vsce package --allow-missing-repository --out $script:outDir
  $vsixFiles = Get-ChildItem -Path $script:outDir -Filter $script:vsixPattern | Sort-Object LastWriteTime -Descending
  if (-not $vsixFiles) {
    throw '❌ No .vsix file was generated'
  }
  $script:vsixFile = $vsixFiles[0].FullName
  Write-Host "✅ Extension packaged successfully: $($vsixFiles[0].Name)"
}

Task Install -Depends Package {
  Write-Host '🚀 Installing extension in VS Code...'
  $command = @('code', '--install-extension', $script:vsixFile, '--force')
  & $command
  Write-Host '✅ Extension installed successfully!'
  Write-Host '🔄 Please reload VS Code to activate the extension.'
}

# CI task for GitHub Actions
Task CI -Depends Package {
  Write-Host '🏗️ Running CI task for GitHub Actions...'
  if ($env:GITHUB_OUTPUT) {
    Write-Host 'GITHUB_OUTPUT environment variable is set. Writing output...'
    $outputFile = $env:GITHUB_OUTPUT
  } else {
    $outputFile = (New-TemporaryFile).FullName
    Write-Warning "GITHUB_OUTPUT environment variable is not set. Writing to temp file: $outputFile"
  }
  $vsixFiles = Get-ChildItem -Path $script:outDir -Filter $script:vsixPattern | Sort-Object LastWriteTime -Descending
  if (-not $vsixFiles) {
    throw '❌ No .vsix file was generated'
  }
  $vsixFile = $vsixFiles[0].FullName
  Add-Content -Path $outputFile -Value "vsix_path=$vsixFile"
  Add-Content -Path $outputFile -Value "vsix_name=$($vsixFiles[0].Name)"
  Write-Host "::notice::VSIX path: $vsixFile"
  Write-Host "::notice::VSIX name: $($vsixFiles[0].Name)"
  # Output the version
  $version = (Get-Content -Path "$PSScriptRoot/package.json" | ConvertFrom-Json).version
  Write-Host "::notice::VSIX version: $version"
  Add-Content -Path $outputFile -Value "vsix_version=$version"
  $ChangeLogPath = Join-Path -Path "$PSScriptRoot" -Child 'CHANGELOG.md'
  $md = ConvertFrom-Markdown $ChangeLogPath
  $content = Get-Content $ChangeLogPath
  # Get level 2 headers
  $headers = $md.Tokens | Where-Object { $_.GetType() -eq [Markdig.Syntax.HeadingBlock] -and $_.Level -eq 2 }
  # Grab the first header line
  $firstHeaderLine = $headers[0].Line

  # The header is made up of a few component. We have to loop and convert each to string and join them
  $title = ($headers[0].Inline | ForEach-Object { $_.ToString() }) -join ''
  if ($headers.Count -eq 1) {
    # If there is only one header, then the content is from the first header to the end of the file
    $body = $content[$($firstHeaderLine + 1)..($content.Count - 1)] -join "`n"
  } else {
    $secondHeaderLine = $headers[1].Line
    # Content is the lines between the first and second header
    $body = $content[$($firstHeaderLine + 1)..$($secondHeaderLine - 1)] -join "`n"
  }
  Write-Host "::notice::Changelog title: $title"
  Write-Host "::notice::Changelog body: $body"
  Add-Content -Path $outputFile -Value "changelog_title=$title"
  Add-Content -Path $outputFile -Value "changelog_body=$body"
}
