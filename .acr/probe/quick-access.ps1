[Console]::OutputEncoding = [Text.Encoding]::UTF8
$shell = New-Object -ComObject Shell.Application
$ns = $shell.NameSpace('shell:::{679f85cb-0220-4080-b29b-5540cc05aab6}')
if ($null -eq $ns) { Write-Output 'NO-NAMESPACE'; exit 1 }
$ns.Items() | ForEach-Object { Write-Output ($_.Path + "`t" + $_.Name) }
