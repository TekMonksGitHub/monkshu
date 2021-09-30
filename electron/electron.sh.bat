#!/bin/bash
echo >/dev/null # >nul & GOTO WINDOWS & rem ^


CURPATH="$( cd "$( dirname "$0" )" && pwd )"

"$CURPATH/../node_modules/.bin/electron" $*

exit 0

:WINDOWS
@echo off
set CURPATH=%~dp0

"%CURPATH%"\..\node_modules\.bin\electron.cmd %*