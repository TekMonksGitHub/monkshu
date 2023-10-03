:<<"::CMDLITERAL"
@ECHO OFF
GOTO :CMDSCRIPT
::CMDLITERAL

/sbin/ifconfig  | grep -i mask | grep -v "127.0.0" | head -1 | awk '{$1=$1;print}' | cut -d" " -f2 | awk '{$1=$1;print}'
exit 0

:CMDSCRIPT
@echo off & for /f \"tokens=3 delims=: \" %i  in ('netsh interface ip show config ^| findstr \"IP Address\"') do echo %i

