:<<"::CMDLITERAL"
@ECHO OFF
GOTO :CMDSCRIPT
::CMDLITERAL

IPADDRESS=`/sbin/ifconfig  | grep -i mask | grep -v "127.0.0" | head -1 | awk '{$1=$1;print}' | cut -d" " -f2 | awk '{$1=$1;print}'`
if [ -z $IPADDRESS ]; then IPADDRESS=127.0.0.1; fi
echo $IPADDRESS
exit 0

:CMDSCRIPT
for /f "tokens=3 delims=: " %%i  in ('netsh interface ip show config ^| findstr "IP Address"') do echo %%i
