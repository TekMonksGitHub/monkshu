@echo off
pushd .
cd "%~dp0\"
start "Monkshu Frontend Cluster" node ".\cluster.js" %*
popd