@echo off
set CURPATH=%~dp0

pushd .
cd "%CURPATH%"
mkdir node_modules
call npm install mustache

call npm install sqlite3
call npm install terser
call npm install uglify-js
call npm install html-minifier
call npm install clean-css

npm install --save-dev electron
popd