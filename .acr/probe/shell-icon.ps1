param([string]$Path, [string]$Out)
$sig = @'
using System;
using System.Runtime.InteropServices;
public static class SI {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public struct SHFILEINFO {
    public IntPtr hIcon; public int iIcon; public uint dwAttributes;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst=260)] public string szDisplayName;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst=80)] public string szTypeName;
  }
  [DllImport("shell32.dll", CharSet=CharSet.Unicode)]
  public static extern IntPtr SHGetFileInfo(string pszPath, uint dwFileAttributes, ref SHFILEINFO psfi, uint cbFileInfo, uint uFlags);
}
'@
Add-Type -TypeDefinition $sig
Add-Type -AssemblyName System.Drawing
$fi = New-Object SI+SHFILEINFO
$SHGFI_ICON = 0x100; $SHGFI_LARGEICON = 0x0
$r = [SI]::SHGetFileInfo($Path, 0, [ref]$fi, [uint32][System.Runtime.InteropServices.Marshal]::SizeOf($fi), ($SHGFI_ICON -bor $SHGFI_LARGEICON))
if ($r -eq 0 -or $fi.hIcon -eq [IntPtr]::Zero) { Write-Output "no icon"; exit 1 }
$ico = [System.Drawing.Icon]::FromHandle($fi.hIcon)
$bmp = $ico.ToBitmap()
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output ("shell icon " + $ico.Width + "x" + $ico.Height + " -> " + $Out)
