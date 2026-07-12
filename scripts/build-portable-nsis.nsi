Unicode true
RequestExecutionLevel user
Name "MediaCompressor Portable"
OutFile "MediaCompressor-Portable.exe"
InstallDir "$TEMP\\MediaCompressor-Portable"
AutoCloseWindow true
ShowInstDetails nevershow

Section
  SetOutPath "$INSTDIR"
  File /r "payload\\*"
  ExecWait '"$INSTDIR\\MediaCompressor.exe"'
  RMDir /r "$INSTDIR"
SectionEnd
