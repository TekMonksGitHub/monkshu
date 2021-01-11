#!/bin/sh

CURPATH="$( cd "$( dirname "$0" )" && pwd )"
pushd .
cd "$CURPATH/../"
APP_DIR=$PWD
popd
if [ "$1" == "" ]; then
	echo Usage: $0 [name of the application]
	exit 1
fi
APP_NAME=$1

ln -s "$APP_DIR/$APP_NAME/backend/apps/$APP_NAME" "$CURPATH/backend/apps/$APP_NAME" 
ln -s "$APP_DIR/$APP_NAME/frontend/apps/$APP_NAME" "$CURPATH/frontend/apps/$APP_NAME"

echo Done.
