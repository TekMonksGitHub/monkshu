#!/bin/bash
CURPATH="$( cd "$( dirname "$0" )" && pwd )"

pushd .
cd "$CURPATH"
mkdir node_modules
call npm install mustache

call npm install sqlite3
call npm install terser
call npm install uglify-js
call npm install html-minifier
call npm install clean-css

npm install --save-dev electron
popd