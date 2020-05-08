@echo off

set APP_NAME=%1
if not defined APP_NAME GOTO USAGE

git clone https://github.com/TekMonksGitHub/monkshu.git
git clone https://github.com/TekMonksGitHub/%APP_NAME%.git

copy ".\%APP_NAME%\*.*" .\monkshu\

if EXIST ".\%APP_NAME%\backend\apps\%APP_NAME%" move ".\%APP_NAME%\backend\apps\%APP_NAME%" ".\monkshu\backend\apps\%APP_NAME%"

if EXIST ".\%APP_NAME%\frontend\apps\%APP_NAME%" move ".\%APP_NAME%\frontend\apps\%APP_NAME%" ".\monkshu\frontend\apps\%APP_NAME%"

if EXIST ".\%APP_NAME%\install\" move ".\%APP_NAME%\install" ".\monkshu\install"

rmdir /q /s ".\%APP_NAME%"
move .\monkshu ".\%APP_NAME%"

if EXIST ".\%APP_NAME%\install\install.bat" call ".\%APP_NAME%\install\install.bat"

echo Done.
goto END

:USAGE
echo Usage: installApp.bat [name of the application]

:END