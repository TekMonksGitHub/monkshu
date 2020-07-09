@echo off

set APP_NAME=%1
if not defined APP_NAME GOTO USAGE

rmdir .\backend\apps\%APP_NAME%
rmdir .\frontend\apps\%APP_NAME%

echo Done.
goto END

:USAGE
echo Usage: rmlink.bat [name of the application]

:END
