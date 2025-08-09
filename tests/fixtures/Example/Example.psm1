# This is a fake psm1
Import-LocalizedData -FileName 'Example.psd1' -BindingVariable 'LocalizedData'

$withSplat = @{
  FileName = 'Example.psd1'
  BindingVariable = 'AsSplat'
}
Import-LocalizedData @withSplat