@echo off

set CURPATH=%~dp0

rmdir "%CURPATH%\backend\apps"
rmdir "%CURPATH%\frontend\apps"
rmdir "%CURPATH%\desktop\app"

echo Done.
