param([string]$Exe, [string]$Out, [int]$Size = 256)
$sig = @'
using System;
using System.Runtime.InteropServices;
public static class PE {
  [DllImport("user32.dll", CharSet=CharSet.Unicode)]
  public static extern uint PrivateExtractIcons(string szFileName, int nIconIndex, int cxIcon, int cyIcon, IntPtr[] phicon, uint[] piconid, uint nIcons, uint flags);
}
'@
Add-Type -TypeDefinition $sig
Add-Type -AssemblyName System.Drawing
$h = New-Object IntPtr[] 1
$id = New-Object uint32[] 1
$n = [PE]::PrivateExtractIcons($Exe, 0, $Size, $Size, $h, $id, 1, 0)
if ($n -eq 0 -or $h[0] -eq [IntPtr]::Zero) { Write-Output "extract failed n=$n"; exit 1 }
$ico = [System.Drawing.Icon]::FromHandle($h[0])
$bmp = $ico.ToBitmap()
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output ("extracted " + $ico.Width + "x" + $ico.Height + " -> " + $Out)
