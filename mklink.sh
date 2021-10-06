#!/bin/bash

CURPATH="$( cd "$( dirname "$0" )" && pwd )"
pushd . > /dev/null
cd "$CURPATH/../"
APP_DIR=$PWD
popd > /dev/null
if [ "$1" == "" ]; then
	echo Usage: $0 [name of the application]
	exit 1
fi
APP_NAME=$1

ln -s "$APP_DIR/$APP_NAME/backend/apps" "$CURPATH/backend/apps" 
ln -s "$APP_DIR/$APP_NAME/frontend/apps" "$CURPATH/frontend/apps"
ln -s "$APP_DIR/$APP_NAME/desktop/app" "$CURPATH/desktop/app"

echo Done.
