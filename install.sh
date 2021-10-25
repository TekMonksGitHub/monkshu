#!/bin/bash
CURPATH="$( cd "$( dirname "$0" )" && pwd )"

pushd .
cd "$CURPATH"
mkdir node_modules
npm install mustache

npm install sqlite3
npm install terser
npm install uglify-js
npm install html-minifier
npm install clean-css

npm install --save-dev electron
popd