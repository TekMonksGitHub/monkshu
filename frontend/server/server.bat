@echo off
pushd .
cd "%~dp0\"
start "Monkshu Frontend" node ".\server.js" %*
popd