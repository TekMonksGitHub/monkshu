#!/bin/bash

CURPATH="$( cd "$( dirname "$0" )" && pwd )"

FRONTEND_PROCESS="$( ps -ef | grep -i $CURPATH/frontend/server/server.js | grep -v grep | cut -d" " -f4 )"
BACKEND_PROCESS="$( ps -ef | grep -i $CURPATH/backend/server/server.js | grep -v grep | cut -d" " -f4 )"

kill -9 $FRONTEND_PROCESS
kill -9 $BACKEND_PROCESS

echo Done.
