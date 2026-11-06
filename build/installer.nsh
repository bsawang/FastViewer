!macro fvDropExt EXT PROGID
  ReadRegStr $0 HKCU "Software\Classes\${EXT}" ""
  StrCmp $0 "${PROGID}" 0 +2
    DeleteRegValue HKCU "Software\Classes\${EXT}" ""
!macroend

!macro customUnInstall
  !insertmacro fvDropExt ".jpg" "FastViewer.Image"
  !insertmacro fvDropExt ".jpeg" "FastViewer.Image"
  !insertmacro fvDropExt ".jfif" "FastViewer.Image"
  !insertmacro fvDropExt ".png" "FastViewer.Image"
  !insertmacro fvDropExt ".apng" "FastViewer.Image"
  !insertmacro fvDropExt ".gif" "FastViewer.Image"
  !insertmacro fvDropExt ".webp" "FastViewer.Image"
  !insertmacro fvDropExt ".avif" "FastViewer.Image"
  !insertmacro fvDropExt ".bmp" "FastViewer.Image"
  !insertmacro fvDropExt ".ico" "FastViewer.Image"
  !insertmacro fvDropExt ".svg" "FastViewer.Image"
  !insertmacro fvDropExt ".mp4" "FastViewer.Video"
  !insertmacro fvDropExt ".m4v" "FastViewer.Video"
  !insertmacro fvDropExt ".webm" "FastViewer.Video"
  !insertmacro fvDropExt ".ogv" "FastViewer.Video"
  !insertmacro fvDropExt ".ogg" "FastViewer.Video"
  !insertmacro fvDropExt ".mov" "FastViewer.Video"
  !insertmacro fvDropExt ".mkv" "FastViewer.Video"
!macroend
