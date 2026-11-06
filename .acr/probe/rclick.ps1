param([string]$Needle = "FastViewer")
$sig = @'
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
public struct RECT { public int Left, Top, Right, Bottom; }
public static class RC {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int max);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder s, int max);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, IntPtr e);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  static IntPtr found = IntPtr.Zero;
  public static string Go(string needle) {
    SetProcessDPIAware();
    EnumProc cb = delegate(IntPtr h, IntPtr l) {
      var sb = new StringBuilder(512); GetWindowText(h, sb, 512);
      if (IsWindowVisible(h) && sb.ToString().Contains(needle)) { found = h; return false; }
      return true;
    };
    EnumWindows(cb, IntPtr.Zero);
    if (found == IntPtr.Zero) return "not found";
    SetForegroundWindow(found);
    Thread.Sleep(400);
    RECT r; GetWindowRect(found, out r);
    int cx = (r.Left + r.Right) / 2, cy = (r.Top + r.Bottom) / 2;
    SetCursorPos(cx, cy);
    Thread.Sleep(200);
    mouse_event(0x0008, 0, 0, 0, IntPtr.Zero);
    mouse_event(0x0010, 0, 0, 0, IntPtr.Zero);
    Thread.Sleep(900);
    var sb2 = new StringBuilder();
    int menus = 0;
    EnumProc cb2 = delegate(IntPtr h, IntPtr l) {
      if (!IsWindowVisible(h)) return true;
      var cls = new StringBuilder(256); GetClassName(h, cls, 256);
      if (cls.ToString() == "#32768") {
        menus++;
        var t = new StringBuilder(256); GetWindowText(h, t, 256);
        sb2.Append("menu:" + t.ToString() + " ");
      }
      return true;
    };
    EnumWindows(cb2, IntPtr.Zero);
    return "clicked=(" + cx + "," + cy + ") popupMenus=" + menus + " " + sb2.ToString();
  }
}
'@
Add-Type -TypeDefinition $sig
[RC]::Go($Needle)
