:; @echo off
:<<"::CMDLITERAL"
@node  --preserve-symlinks .\testMain.js %*
::CMDLITERAL

:; node --preserve-symlinks ./testMain.js $* 
:; exit