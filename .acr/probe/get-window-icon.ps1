param([string]$OutDir = "E:\work\ai\FastViewer\.acr\icon-drafts")
$sig = @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class WI {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int max);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, uint msg, IntPtr wp, IntPtr lp);
  [DllImport("user32.dll", EntryPoint="GetClassLongPtrW")] public static extern IntPtr GetClassLongPtr(IntPtr h, int idx);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  static IntPtr found = IntPtr.Zero;
  public static IntPtr Find() {
    found = IntPtr.Zero;
    EnumProc cb = delegate(IntPtr h, IntPtr l) {
      var sb = new StringBuilder(512); GetWindowText(h, sb, 512);
      if (IsWindowVisible(h) && sb.ToString().Contains("FastViewer")) { found = h; return false; }
      return true;
    };
    EnumWindows(cb, IntPtr.Zero);
    return found;
  }
  public static IntPtr Icon(IntPtr h, int which) {
    IntPtr r = SendMessage(h, 0x7F, (IntPtr)which, IntPtr.Zero);
    if (r == IntPtr.Zero) r = GetClassLongPtr(h, which == 0 ? -34 : -14);
    return r;
  }
}
'@
Add-Type -TypeDefinition $sig
Add-Type -AssemblyName System.Drawing
$h = [WI]::Find()
if ($h -eq [IntPtr]::Zero) { Write-Output "window not found"; exit 1 }
foreach ($w in @(0,1)) {
  $ic = [WI]::Icon($h, $w)
  $name = if ($w -eq 0) { "small" } else { "big" }
  if ($ic -eq [IntPtr]::Zero) { Write-Output "$name icon handle: 0"; continue }
  $ico = [System.Drawing.Icon]::FromHandle($ic)
  $bmp = $ico.ToBitmap()
  $path = Join-Path $OutDir "window-icon-$name.png"
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output ("$name " + $ico.Width + "x" + $ico.Height + " -> " + $path)
}
