@echo off
setlocal enabledelayedexpansion

set "CURPATH=%~dp0"
pushd .
cd "%CURPATH%\..\"
set "APP_DIR=%cd%"
popd

set "APP_NAME=%1"

call :removeAppLinkOfType "backend"
call :removeAppLinkOfType "frontend"
call :removeAppLinkOfType "desktop"

echo Done.
goto END

:removeAppLinkOfType
set "APP_TYPE=%~1"
set "TARGET_DIR=%CURPATH%\%APP_TYPE%\apps"

if not exist "%TARGET_DIR%\" exit /b 0

:: If an APP_NAME was provided, perform a targeted application removal
if not "%APP_NAME%"=="" (
    set "SRC_BASE=%APP_DIR%\%APP_NAME%\%APP_TYPE%\apps"
    
    :: Loops and removes EVERYTHING matching this specific application's source list
    for %%i in ("!SRC_BASE!\*") do (
        set "DETECTED_NAME=%%~nxi"
        
        if exist "%TARGET_DIR%\!DETECTED_NAME!" (
            if exist "%TARGET_DIR%\!DETECTED_NAME!\" (
                rmdir "%TARGET_DIR%\!DETECTED_NAME!"
            ) else (
                del /f /q "%TARGET_DIR%\!DETECTED_NAME!"
            )
        )
    )
    call :removeDirIfEmpty "%TARGET_DIR%"
    exit /b 0
)

:: FALLBACK SWEEP: Clears all items in the target dir if no specific arg matches
for %%i in ("%TARGET_DIR%\*") do (
    if exist "%%~fi\" (
        rmdir "%%~fi"
    ) else (
        del /f /q "%%~fi"
    )
)

call :removeDirIfEmpty "%TARGET_DIR%"
exit /b 0

:removeDirIfEmpty
set "DIR_TO_CHECK=%~1"
set "EMPTY=true"
for /f "delims=" %%a in ('dir /b /a "%DIR_TO_CHECK%" 2^>nul') do (
    set "EMPTY=false"
)
if "!EMPTY!"=="true" rmdir "%DIR_TO_CHECK%" 2>nul
exit /b 0

:END
endlocal
