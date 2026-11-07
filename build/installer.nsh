!macro fvDropExt EXT PROGID
  ReadRegStr $0 HKCU "Software\Classes\${EXT}" ""
  StrCmp $0 "${PROGID}" 0 +2
    DeleteRegValue HKCU "Software\Classes\${EXT}" ""
!macroend

!macro customUnInstall
  !insertmacro fvDropExt ".jpg" "FastViewer.jpg"
  !insertmacro fvDropExt ".jpeg" "FastViewer.jpeg"
  !insertmacro fvDropExt ".jfif" "FastViewer.jfif"
  !insertmacro fvDropExt ".png" "FastViewer.png"
  !insertmacro fvDropExt ".apng" "FastViewer.apng"
  !insertmacro fvDropExt ".gif" "FastViewer.gif"
  !insertmacro fvDropExt ".webp" "FastViewer.webp"
  !insertmacro fvDropExt ".avif" "FastViewer.avif"
  !insertmacro fvDropExt ".bmp" "FastViewer.bmp"
  !insertmacro fvDropExt ".ico" "FastViewer.ico"
  !insertmacro fvDropExt ".svg" "FastViewer.svg"
  !insertmacro fvDropExt ".mp4" "FastViewer.mp4"
  !insertmacro fvDropExt ".m4v" "FastViewer.m4v"
  !insertmacro fvDropExt ".webm" "FastViewer.webm"
  !insertmacro fvDropExt ".ogv" "FastViewer.ogv"
  !insertmacro fvDropExt ".ogg" "FastViewer.ogg"
  !insertmacro fvDropExt ".mov" "FastViewer.mov"
  !insertmacro fvDropExt ".mkv" "FastViewer.mkv"
!macroend
