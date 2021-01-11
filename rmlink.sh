#!/bin/sh

if [ "$1" == "" ]; then
	echo Usage: $0 [name of the application]
	exit 1
fi
APP_NAME=$1
CURPATH="$( cd "$( dirname "$0" )" && pwd )"

rm $CURPATH/backend/apps/$APP_NAME
rm $CURPATH/frontend/apps/$APP_NAME

echo Done.
