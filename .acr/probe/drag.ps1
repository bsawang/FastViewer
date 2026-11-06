param([string]$Needle = "FastViewer", [int]$Dx = 300, [int]$Dy = 20, [int]$MoveX = 100, [int]$MoveY = 0)
$sig = @'
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
public struct RECT { public int Left, Top, Right, Bottom; }
public static class DRG {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int max);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, IntPtr e);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  static IntPtr found = IntPtr.Zero;
  static RECT R(out string s) { RECT r; GetWindowRect(found, out r); s = r.Left + "," + r.Top + ".." + r.Right + "," + r.Bottom; return r; }
  public static string Go(string needle, int dx, int dy, int mx, int my) {
    SetProcessDPIAware();
    EnumProc cb = delegate(IntPtr h, IntPtr l) {
      var sb = new StringBuilder(512); GetWindowText(h, sb, 512);
      if (IsWindowVisible(h) && sb.ToString().Contains(needle)) { found = h; return false; }
      return true;
    };
    EnumWindows(cb, IntPtr.Zero);
    if (found == IntPtr.Zero) return "not found";
    if (IsIconic(found)) { ShowWindow(found, 9); Thread.Sleep(600); }
    SetForegroundWindow(found); Thread.Sleep(500);
    string s1; RECT a = R(out s1);
    int sx = a.Left + dx, sy = a.Top + dy;
    SetCursorPos(sx, sy); Thread.Sleep(250);
    mouse_event(0x0002, 0, 0, 0, IntPtr.Zero);
    Thread.Sleep(250);
    int steps = Math.Max(Math.Abs(mx), Math.Abs(my));
    if (steps < 1) steps = 1;
    for (int i = 1; i <= steps; i++) {
      SetCursorPos(sx + (int)Math.Round((double)mx * i / steps), sy + (int)Math.Round((double)my * i / steps));
      Thread.Sleep(12);
    }
    Thread.Sleep(350);
    mouse_event(0x0004, 0, 0, 0, IntPtr.Zero);
    Thread.Sleep(500);
    string s2; RECT b = R(out s2);
    return string.Format("start={0} grab=({1},{2}) after={3} movedBy={4},{5}", s1, sx, sy, s2, b.Left - a.Left, b.Top - a.Top);
  }
}
'@
Add-Type -TypeDefinition $sig
[DRG]::Go($Needle, $Dx, $Dy, $MoveX, $MoveY)
