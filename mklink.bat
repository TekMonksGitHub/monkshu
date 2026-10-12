@echo off
setlocal enabledelayedexpansion

set "CURPATH=%~dp0"
pushd .
cd "%CURPATH%\..\"
set "APP_DIR=%cd%"
popd

set "APP_NAME=%1"
if "%APP_NAME%"=="" goto USAGE

call :createAppLinkOfType "backend"
call :createAppLinkOfType "frontend"
call :createAppLinkOfType "desktop"

echo Done.
goto END

:createAppLinkOfType
set "APP_TYPE=%~1"
set "SRC_BASE=%APP_DIR%\%APP_NAME%\%APP_TYPE%\apps"
set "DEST_DIR=%CURPATH%\%APP_TYPE%\apps"

if not exist "%SRC_BASE%\" exit /b 0

:: Loops over EVERYTHING inside the source folder without stopping
for %%i in ("%SRC_BASE%\*") do (
    set "SRC_TARGET=%%~fi"
    set "DETECTED_NAME=%%~nxi"

    if not exist "%DEST_DIR%\" mkdir "%DEST_DIR%"

    :: Clear out an existing target if it's already there to allow overwrite
    if exist "%DEST_DIR%\!DETECTED_NAME!\" (
        rmdir "%DEST_DIR%\!DETECTED_NAME!"
    ) else if exist "%DEST_DIR%\!DETECTED_NAME!" (
        del /f /q "%DEST_DIR%\!DETECTED_NAME!"
    )

    :: Check if the source item is a directory or a file, then link accordingly
    if exist "%%~fi\" (
        mklink /d "%DEST_DIR%\!DETECTED_NAME!" "!SRC_TARGET!"
    ) else (
        mklink "%DEST_DIR%\!DETECTED_NAME!" "!SRC_TARGET!"
    )
)
exit /b 0

:USAGE
echo Usage: %~nx0 [name of the application]
goto END

:END
endlocal
