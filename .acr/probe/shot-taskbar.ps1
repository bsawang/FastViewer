param([string]$Out = "E:\work\ai\FastViewer\.acr\icon-drafts\taskbar.png")
$sig = @'
using System;
using System.Runtime.InteropServices;
public static class DP {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern int GetSystemMetrics(int i);
}
'@
Add-Type -TypeDefinition $sig
Add-Type -AssemblyName System.Drawing
[DP]::SetProcessDPIAware() | Out-Null
$w = [DP]::GetSystemMetrics(0)
$h = [DP]::GetSystemMetrics(1)
$strip = 56
$bmp = New-Object System.Drawing.Bitmap($w, $strip)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen(0, $h - $strip, 0, 0, $bmp.Size)
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output ("saved $Out " + $w + "x" + $strip)
