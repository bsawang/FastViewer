param([string]$Action = "rect", [int]$X = 0, [int]$Y = 0, [int]$W = 1000, [int]$H = 700)
$sig = @'
using System;
using System.Text;
using System.Runtime.InteropServices;
using System.Threading;
public struct RECT { public int Left, Top, Right, Bottom; }
public static class WIN {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int max);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h, int x, int y, int w, int hgt, bool repaint);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern bool IsZoomed(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  static IntPtr found = IntPtr.Zero;
  static IntPtr Find() {
    found = IntPtr.Zero;
    EnumProc cb = delegate(IntPtr h, IntPtr l) {
      var sb = new StringBuilder(512); GetWindowText(h, sb, 512);
      if (IsWindowVisible(h) && sb.ToString().Contains("FastViewer")) { found = h; return false; }
      return true;
    };
    EnumWindows(cb, IntPtr.Zero);
    return found;
  }
  static string R() {
    RECT r; GetWindowRect(found, out r);
    return string.Format("{0},{1},{2},{3}", r.Left, r.Top, r.Right - r.Left, r.Bottom - r.Top);
  }
  public static string Go(string action, int x, int y, int w, int hgt) {
    SetProcessDPIAware();
    if (Find() == IntPtr.Zero) return "not found";
    if (action == "rect") return R();
    if (action == "move") { MoveWindow(found, x, y, w, hgt, true); Thread.Sleep(600); return R(); }
    if (action == "maximize") { ShowWindow(found, 3); Thread.Sleep(700); return R() + " zoomed=" + IsZoomed(found); }
    if (action == "restore") { ShowWindow(found, 9); Thread.Sleep(700); return R() + " zoomed=" + IsZoomed(found); }
    if (action == "zoomed") return R() + " zoomed=" + IsZoomed(found);
    if (action == "activate") { SetForegroundWindow(found); Thread.Sleep(500); return R(); }
    return "unknown action";
  }
}
'@
Add-Type -TypeDefinition $sig
[WIN]::Go($Action, $X, $Y, $W, $H)
