@echo off

set CURPATH=%~dp0
pushd .
cd %CURPATH%\..\
set APP_DIR=%cd%
popd
set APP_NAME=%1
if not defined APP_NAME GOTO USAGE

mklink /d "%CURPATH%\backend\apps\%APP_NAME%" "%APP_DIR%\%APP_NAME%\backend\apps\%APP_NAME%"
mklink /d "%CURPATH%\frontend\apps\%APP_NAME%" "%APP_DIR%\%APP_NAME%\frontend\apps\%APP_NAME%"

echo Done.
goto END

:USAGE
echo Usage: mklink.bat [name of the application]

:END
