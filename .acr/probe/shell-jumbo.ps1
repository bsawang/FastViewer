param([string]$Path, [string]$Out)
$sig = @'
using System;
using System.Runtime.InteropServices;
public static class SJ {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public struct SHFILEINFO {
    public IntPtr hIcon; public int iIcon; public uint dwAttributes;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst=260)] public string szDisplayName;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst=80)] public string szTypeName;
  }
  [ComImport, Guid("46eb5926-582e-4017-9fdf-e8998daa0950"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  public interface IImageList {
    [PreserveSig] int Add(IntPtr hbmImage, IntPtr hbmMask, out int pi);
    [PreserveSig] int ReplaceIcon(int i, IntPtr hicon, out int pi);
    [PreserveSig] int SetOverlayImage(int iImage, int iOverlay);
    [PreserveSig] int Replace(int i, IntPtr hbmImage, IntPtr hbmMask);
    [PreserveSig] int AddMasked(IntPtr hbmImage, int crMask, out int pi);
    [PreserveSig] int Draw(IntPtr pimldp);
    [PreserveSig] int Remove(int i);
    [PreserveSig] int GetIcon(int i, int flags, out IntPtr picon);
  }
  [DllImport("shell32.dll", CharSet=CharSet.Unicode)]
  public static extern IntPtr SHGetFileInfo(string pszPath, uint dwFileAttributes, ref SHFILEINFO psfi, uint cbFileInfo, uint uFlags);
  [DllImport("comctl32.dll")]
  public static extern int SHGetImageList(int iImageList, ref Guid riid, out IImageList ppv);
}
'@
Add-Type -TypeDefinition $sig
Add-Type -AssemblyName System.Drawing
$fi = New-Object SJ+SHFILEINFO
$SHGFI_SYSICONINDEX = 0x4000
$r = [SJ]::SHGetFileInfo($Path, 0, [ref]$fi, [uint32][System.Runtime.InteropServices.Marshal]::SizeOf($fi), $SHGFI_SYSICONINDEX)
if ($r -eq 0) { Write-Output "SHGetFileInfo failed"; exit 1 }
$iid = [Guid]"46eb5926-582e-4017-9fdf-e8998daa0950"
$iml = $null
# SHIL_JUMBO = 4 (256px) on Vista+
$hr = [SJ]::SHGetImageList(4, [ref]$iid, [ref]$iml)
if ($hr -ne 0) { Write-Output ("SHGetImageList hr=" + $hr); exit 1 }
$h = [IntPtr]::Zero
$hr = $iml.GetIcon($fi.iIcon, 1, [ref]$h)   # ILD_TRANSPARENT = 1
if ($hr -ne 0 -or $h -eq [IntPtr]::Zero) { Write-Output ("GetIcon hr=" + $hr); exit 1 }
$ico = [System.Drawing.Icon]::FromHandle($h)
$bmp = $ico.ToBitmap()
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output ("jumbo index=" + $fi.iIcon + " size=" + $ico.Width + "x" + $ico.Height + " -> " + $Out)
