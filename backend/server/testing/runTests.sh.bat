:; 
:<<"::CMDLITERAL"
echo off
@node --preserve-symlinks --preserve-symlinks-main --max-old-space-size=8192 .\testMain.js %*
set EXIT_STATUS=%errorlevel%
exit /b %EXIT_STATUS%
::CMDLITERAL

node --preserve-symlinks --preserve-symlinks-main --max-old-space-size=8192 ./testMain.js "$@"
EXIT_STATUS=$?
exit $EXIT_STATUS
