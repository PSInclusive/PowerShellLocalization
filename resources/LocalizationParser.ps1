<#
This script will take a list of psm1 files that have Import-LocalizedData calls
and attempt to extract the call and get the relevant localization data.
#>
[CmdletBinding()]
param(
  [string]$ModuleFile,
  [CultureInfo]
  $UICulture
)

$resolvedPath = Resolve-Path $ModuleFile
if ($null -eq $resolvedPath.Path) {
  Write-Warning "File not found: $ModuleFile"
  continue
}
$result = @{}
$file = $resolvedPath.Path
$parentDirectory = Split-Path -Path $file -Parent
# Get path variables
if (Test-Path $file) {
  Write-Verbose "Processing file: $file"
  $tokens = $null
  $errors = $null
  $scriptBlock = [System.Management.Automation.Language.Parser]::ParseFile(
    $file,
    [ref]$tokens,
    [ref]$errors
  )
  # Find the Import-LocalizedData calls
  $importLocalizedDataCalls = $scriptBlock.FindAll(
    {
      param($Ast)
      $Ast -is [System.Management.Automation.Language.CommandAst] -and
      $Ast.GetCommandName() -eq 'Import-LocalizedData'
    },
    $true
  )
  if ($importLocalizedDataCalls.Count -eq 0) {
    Write-Warning "No Import-LocalizedData calls found in $file"
    return @{}
  }

  try {
    Write-Verbose "Switching to $parentDirectory"
    Push-Location $parentDirectory
    foreach ($call in $importLocalizedDataCalls) {
      # Here you can add logic to extract and process the localization data
      $splat = @{}

      function Get-VariableFromScriptBlock {
        [CmdletBinding()]
        [OutputType([hashtable])]
        param(
          [System.Management.Automation.Language.ScriptBlockAst]
          $ScriptBlock,
          [PSObject]
          $Element
        )
        $lastAssignment = $ScriptBlock.FindAll(
          {
            param($Ast)
            $Ast -is [System.Management.Automation.Language.AssignmentStatementAst] -and
            $Ast.Left -is [System.Management.Automation.Language.VariableExpressionAst] -and
            $Ast.Left.VariablePath.UserPath -eq $Element.VariablePath.UserPath -and
            $Ast.Extent.StartLineNumber -le $Element.Extent.StartLineNumber
          },
          $true
        ) | Select-Object -Last 1
        if ($lastAssignment) {
          if ($Element.Splatted) {
            $return = @{}
            # Append all the items of the lastAssignment to the current splat
            foreach ($kv in $lastAssignment.Right.Expression.KeyValuePairs) {
              # If the value is a variable, recurse
              if ($kv.Item2.PipelineElements.Expression -is [System.Management.Automation.Language.VariableExpressionAst]) {
                $return[$kv.Item1.Extent.Text] = Get-VariableFromScriptBlock -ScriptBlock $ScriptBlock -Element $kv.Item2.PipelineElements.Expression
              } else {
                $return[$kv.Item1.Extent.Text] = $kv.Item2.Extent.Text.Trim('"').Trim("'")
              }
            }
            return $return
          } else {
            return $Element.Extent.Text.Trim('"').Trim("'")
          }
        }
      }

      # We go over each command element and extract the value
      $parameterName = $null
      foreach ($element in $call.CommandElements[1..$call.CommandElements.Count]) {
        Write-Verbose "Checking: $($element.Extent.Text)"
        switch ($element) {
          { $_ -is [System.Management.Automation.Language.CommandParameterAst] } {
            # This is the command
            $parameterName = $element.Extent.Text.Trim('-')
            continue
          }
          { $_ -is [System.Management.Automation.Language.CommandExpressionAst] } {
            # This is an expression, we can ignore it for now
            continue
          }
          { $_ -is [System.Management.Automation.Language.ParameterAst] } {
            # This is a parameter
            $parameterName = $element.Extent.Text.Trim('-')
            continue
          }
          { $_ -is [System.Management.Automation.Language.StringConstantExpressionAst] } {
            # Handle string constants
            # Remove quotes
            $splat[$parameterName] = $element.Extent.Text.Trim('"').Trim("'")
            continue
          }
          { $_ -is [System.Management.Automation.Language.VariableExpressionAst] } {
            # Handle variables
            $variableValue = Get-VariableFromScriptBlock -ScriptBlock $scriptBlock -Element $element
            if ($variableValue -is [hashtable]) {
              # If the variable is a hashtable, merge it into splat
              $splat += $variableValue
            } else {
              $splat[$parameterName] = $variableValue
            }
            continue
          }
          default {
            # Handle other cases
            throw "Unhandled case: $($element.GetType().Name)"
          }
        }
      }
      # Execute the Import-LocalizedData command with the extracted arguments
      if ($splat.BindingVariable) {
        Write-Verbose "Binding variable found: $($splat.BindingVariable)"
        $bindingVariable = $splat.BindingVariable
        $splat.Remove('BindingVariable')
      }
      if ($null -ne $UICulture -and -not [String]::IsNullOrEmpty($UICulture.Name)) {
        $splat['UICulture'] = $UICulture.Name
      } else {
        # Default to en-US when no UICulture is specified
        $splat['UICulture'] = 'en-US'
      }
      # Override the base directory if its set
      $splat['BaseDirectory'] = $parentDirectory
      # Override error action
      $splat['ErrorAction'] = 'Continue'
      Write-Verbose "Running command with splat: $($splat | ConvertTo-Json)"
      $data = Import-LocalizedData @splat
      $result[$bindingVariable] = $data
    }
    return $result | ConvertTo-Json
  } catch {
    Write-Error "Error processing ${file}: $_"
    throw $_
  } finally {
    # Go back to original directory
    Write-Verbose "Returning to original directory"
    Pop-Location
  }
} else {
  Write-Warning "File not found: $file"
}