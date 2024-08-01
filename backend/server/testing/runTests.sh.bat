:; 
:<<"::CMDLITERAL"
echo off
@node --preserve-symlinks --preserve-symlinks-main --max-old-space-size=8192 .\testMain.js %*
::CMDLITERAL

node --preserve-symlinks --preserve-symlinks-main --max-old-space-size=8192 ./testMain.js "$@"
EXIT_STATUS=$?
exit $EXIT_STATUS
