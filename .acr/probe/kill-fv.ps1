$procs = Get-CimInstance Win32_Process -Filter "Name='electron.exe'" |
  Where-Object { $_.CommandLine -like '*E:\work\ai\FastViewer*' -and $_.CommandLine -notlike '*--type=*' }
if (-not $procs) {
  Write-Output 'no fastviewer electron main process'
  exit 0
}
foreach ($p in $procs) {
  Write-Output ("killing main pid=" + $p.ProcessId)
  taskkill.exe /PID $p.ProcessId /T /F | Out-Null
}
