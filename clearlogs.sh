#!/bin/bash
CURPATH="$( cd "$( dirname "$0" )" && pwd )"

rm "$CURPATH/frontend/server/logs/access.log.json"
rm "$CURPATH/frontend/server/logs/error.log.json"

rm "%CURPATH%/backend/server/logs/server.log.ndjson"