param([int]$Seconds = 30)
$sig = @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class WW {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int max);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  public static string Titles() {
    var all = new System.Collections.Generic.List<string>();
    EnumWindows(delegate(IntPtr h, IntPtr l) {
      if (!IsWindowVisible(h)) return true;
      var sb = new StringBuilder(512); GetWindowText(h, sb, 512);
      if (sb.Length > 0) all.Add(sb.ToString());
      return true;
    }, IntPtr.Zero);
    return string.Join(" | ", all);
  }
  public static bool Has(string needle) {
    EnumWindows(delegate(IntPtr h, IntPtr l) {
      if (!IsWindowVisible(h)) return true;
      var sb = new StringBuilder(512); GetWindowText(h, sb, 512);
      if (sb.ToString().Contains(needle)) { found = true; return false; }
      return true;
    }, IntPtr.Zero);
    return found;
  }
  static bool found = false;
}
'@
Add-Type -TypeDefinition $sig
for ($i = 0; $i -lt $Seconds; $i += 2) {
  if ([WW]::Has("FastViewer")) { Write-Output "found after ${i}s"; exit 0 }
  Start-Sleep -Seconds 2
}
Write-Output ("NOT found. visible titles: " + [WW]::Titles())
exit 1
