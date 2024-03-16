@echo off
start "Monkshu Backend" node --preserve-symlinks --trace-warnings "%~dp0\server.js" %*
