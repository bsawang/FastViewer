param([string]$Out = "E:\work\ai\FastViewer\.acr\probe\window.png", [int]$Pad = 24)
$sig = @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public struct RECT { public int Left, Top, Right, Bottom; }
public static class WIN {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int max);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
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
  public static RECT Rect() { RECT r; GetWindowRect(found, out r); return r; }
}
'@
Add-Type -TypeDefinition $sig
Add-Type -AssemblyName System.Drawing
[WIN]::SetProcessDPIAware() | Out-Null
if ([WIN]::Find() -eq [IntPtr]::Zero) { Write-Output "not found"; exit 1 }
$r = [WIN]::Rect()
$x = $r.Left - $Pad
$y = $r.Top - $Pad
$w = ($r.Right - $r.Left) + 2 * $Pad
$h = ($r.Bottom - $r.Top) + 2 * $Pad
$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($x, $y, 0, 0, $bmp.Size)
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output ("saved " + $Out + " rect=" + $r.Left + "," + $r.Top + "," + ($r.Right - $r.Left) + "," + ($r.Bottom - $r.Top))
