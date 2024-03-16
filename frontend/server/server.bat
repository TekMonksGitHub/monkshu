@echo off
pushd .
cd "%~dp0\"
start "Monkshu Frontend" node --preserve-symlinks --trace-warnings ".\server.js" %*
popd
