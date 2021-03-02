#!/bin/bash

CURPATH="$( cd "$( dirname "$0" )" && pwd )"
pushd . > /dev/null
cd "$CURPATH"
$PWD/frontend/server/server.sh &
$PWD/backend/server/server.sh &
popd > /dev/null
