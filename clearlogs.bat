@echo off
set CURPATH=%~dp0

del "%CURPATH%\frontend\server\logs\access.log.json"
del "%CURPATH%\frontend\server\logs\error.log.json"

del "%CURPATH%\backend\server\logs\server.log.ndjson"