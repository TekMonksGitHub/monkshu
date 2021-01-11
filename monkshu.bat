@echo off

set CURPATH=%~dp0
pushd .
cd %CURPATH%\
call .\frontend\server\server.bat
call .\backend\server\server.bat
popd

echo Done.