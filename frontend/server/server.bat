@echo off
pushd .
cd "%~dp0\"
start node ".\server.js" %*
popd