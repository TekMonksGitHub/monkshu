@echo off

set CURPATH=%~dp0
pushd .
cd %CURPATH%\..\
set APP_DIR=%cd%
popd
set APP_NAME=%1
if not defined APP_NAME GOTO USAGE

mklink /d "%CURPATH%\backend\apps" "%APP_DIR%\%APP_NAME%\backend\apps"
mklink /d "%CURPATH%\frontend\apps" "%APP_DIR%\%APP_NAME%\frontend\apps"
mklink /d "%CURPATH%\desktop\app" "%APP_DIR%\%APP_NAME%\desktop\app"

echo Done.
goto END

:USAGE
echo Usage: mklink.bat [name of the application]

:END
