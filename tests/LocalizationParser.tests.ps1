Describe 'LocalizationParser' {
  BeforeAll {
    # Arrange
    $script:fixturesFolder = Join-Path -Path $PSScriptRoot -ChildPath 'fixtures'
    $exampleFolder = Join-Path -Path $script:fixturesFolder -ChildPath 'Example'
    $psm1Files = Get-ChildItem -Path $exampleFolder -Filter '*.psm1' -Recurse
    function Get-LocalizedText {
      param (
        [string]$ModuleFile,
        [string]$UICulture
      )
      & "$PSScriptRoot\..\resources\LocalizationParser.ps1" -ModuleFile $ModuleFile -UICulture $UICulture
    }

    # Act
    $script:localizedText = Get-LocalizedText -ModuleFile $psm1Files.FullName | ConvertFrom-Json -AsHashtable
  }
  It 'Can Parse the Example folder' {
    # Assert
    $script:localizedText | Should -Not -BeNullOrEmpty
    $script:localizedText | Should -BeOfType [hashtable]
  }

  It 'Can parse the output' {
    $script:localizedText.ContainsKey('LocalizedData') | Should -BeTrue
    $script:localizedText['LocalizedData'] | Should -BeOfType [hashtable]
    $script:localizedText['LocalizedData']['Key1'] | Should -Be 'Value1'
    $script:localizedText['LocalizedData']['Key2'] | Should -Be 'Value2'
    $script:localizedText['LocalizedData']['Key3'] | Should -Be 'Value3'
  }

  It 'Can parse the splatted version' {
    $script:localizedText.ContainsKey('AsSplat') | Should -BeTrue
    $script:localizedText['AsSplat']['Key1'] | Should -Be 'Value1'
    $script:localizedText['AsSplat']['Key2'] | Should -Be 'Value2'
    $script:localizedText['AsSplat']['Key3'] | Should -Be 'Value3'
  }

  Context 'When UICulture is set' {
    BeforeAll {
      $script:frText = Get-LocalizedText -ModuleFile $psm1Files.FullName -UICulture "fr-FR" | ConvertFrom-Json -AsHashtable
    }

    It 'Can parse the output in French' {
      $script:frText.ContainsKey('LocalizedData') | Should -BeTrue
      $script:frText['LocalizedData'] | Should -BeOfType [hashtable]
      $script:frText['LocalizedData']['Key1'] | Should -Be 'Valeur1'
      $script:frText['LocalizedData']['Key2'] | Should -Be 'Valeur2'
      $script:frText['LocalizedData']['Key3'] | Should -Be 'Valeur3'
    }

    It 'Can parse the splatted version in French' {
      $script:frText.ContainsKey('AsSplat') | Should -BeTrue
      $script:frText['AsSplat']['Key1'] | Should -Be 'Valeur1'
      $script:frText['AsSplat']['Key2'] | Should -Be 'Valeur2'
      $script:frText['AsSplat']['Key3'] | Should -Be 'Valeur3'
    }
  }

}