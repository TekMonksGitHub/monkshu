#!/bin/bash

MONKSHU_PATH="$( cd "$( dirname "$0" )" && pwd )"
DATE=$1

# VSCode pattern: \"level\":\"error\",!netcheck,!replicas
cat "$MONKSHU_PATH/backend/server/logs/server.log.ndjson" | grep \"level\":\"error\" | grep -v netcheck | grep -v replicas | grep $DATE
