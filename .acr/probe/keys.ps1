param([string]$Needle = "FastViewer", [string]$Keys = "{F12}")
$sig = @'
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
public struct RECT { public int Left, Top, Right, Bottom; }
public static class KEY {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int max);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  static IntPtr found = IntPtr.Zero;
  public static string Focus(string needle) {
    SetProcessDPIAware();
    EnumProc cb = delegate(IntPtr h, IntPtr l) {
      var sb = new StringBuilder(512); GetWindowText(h, sb, 512);
      if (IsWindowVisible(h) && sb.ToString().Contains(needle)) { found = h; return false; }
      return true;
    };
    EnumWindows(cb, IntPtr.Zero);
    if (found == IntPtr.Zero) return "not found";
    if (IsIconic(found)) { ShowWindow(found, 9); Thread.Sleep(500); }
    SetForegroundWindow(found);
    Thread.Sleep(400);
    RECT r; GetWindowRect(found, out r);
    return "focused=" + r.Left + "," + r.Top + ".." + r.Right + "," + r.Bottom;
  }
  public static string Windows(string needle) {
    var sb2 = new StringBuilder();
    EnumProc cb = delegate(IntPtr h, IntPtr l) {
      var sb = new StringBuilder(512); GetWindowText(h, sb, 512);
      if (IsWindowVisible(h) && sb.ToString().Contains(needle)) {
        RECT r; GetWindowRect(h, out r);
        sb2.Append(sb.ToString() + " [" + (r.Right - r.Left) + "x" + (r.Bottom - r.Top) + "] ");
      }
      return true;
    };
    EnumWindows(cb, IntPtr.Zero);
    return sb2.ToString().Trim();
  }
}
'@
Add-Type -TypeDefinition $sig
$focused = [KEY]::Focus($Needle)
Start-Sleep -Milliseconds 200
$wsh = New-Object -ComObject WScript.Shell
$wsh.SendKeys($Keys)
Start-Sleep -Milliseconds 1800
Write-Output ("before: " + $focused)
Write-Output ("after-visible-windows: " + [KEY]::Windows($Needle))
