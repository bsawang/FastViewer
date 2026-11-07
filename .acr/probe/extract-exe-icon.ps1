param([string]$Exe, [string]$Out)
Add-Type -AssemblyName System.Drawing
$ico = [System.Drawing.Icon]::ExtractAssociatedIcon($Exe)
$bmp = $ico.ToBitmap()
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
"$($ico.Width)x$($ico.Height) -> $Out"
