BeforeAll {
  $script:packageJson = Get-Content -Path "$PSScriptRoot\..\package.json" | ConvertFrom-Json

  $changelogPath = Join-Path -Path "$PSScriptRoot\.." -Child 'CHANGELOG.md'
  $script:changelogVersion = Get-Content $changelogPath | ForEach-Object {
    if ($_ -match "^##\s\[(?<Version>(\d+\.){1,3}\d+)\]") {
      $script:changelogVersion = $matches.Version
      break
    }
  }
}
Describe 'Package.json' {

  Context 'Validation' {

    It 'Has a valid package.json' {
      $script:packageJson | Should -Not -BeNullOrEmpty
    }

    It 'Has a valid version in the package.json' {
      $script:packageJson.version -as [Version] | Should -Not -BeNullOrEmpty
    }

    It 'Has a valid description' {
      $script:packageJson.description | Should -Not -BeNullOrEmpty
    }

    It 'Has a valid author' {
      $script:packageJson.author | Should -Not -BeNullOrEmpty
    }

    It 'Has a valid version in the changelog' {
      $script:changelogVersion | Should -Not -BeNullOrEmpty
      $script:changelogVersion -as [Version] | Should -Not -BeNullOrEmpty
    }

    It 'Changelog and package.json versions are the same' {
      $script:changelogVersion -as [Version] | Should -Be ( $script:packageJson.version -as [Version] )
    }
  }
}