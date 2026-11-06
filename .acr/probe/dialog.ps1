param([string]$Action = "list")
$sig = @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class W {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int max);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder s, int max);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint msg, IntPtr w, IntPtr l);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
}
'@
Add-Type -TypeDefinition $sig
$electronIds = @(Get-Process electron -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$found = New-Object System.Collections.ArrayList
$cb = [W+EnumProc]{
  param($h, $l)
  if (-not [W]::IsWindowVisible($h)) { return $true }
  $pid2 = 0
  [void][W]::GetWindowThreadProcessId($h, [ref]$pid2)
  if ($electronIds -notcontains $pid2) { return $true }
  $cls = New-Object System.Text.StringBuilder 256
  [void][W]::GetClassName($h, $cls, 256)
  $txt = New-Object System.Text.StringBuilder 512
  [void][W]::GetWindowText($h, $txt, 512)
  [void]$found.Add([pscustomobject]@{ hwnd = $h.ToInt64(); pid = $pid2; cls = $cls.ToString(); title = $txt.ToString() })
  return $true
}
[void][W]::EnumWindows($cb, [IntPtr]::Zero)
if ($Action -eq "close") {
  foreach ($w in $found) {
    if ($w.cls -eq "#32770") {
      [void][W]::PostMessage([IntPtr]$w.hwnd, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)
    }
  }
}
$found | ForEach-Object { "{0}`t{1}`t{2}`t{3}" -f $_.hwnd, $_.pid, $_.cls, $_.title }
