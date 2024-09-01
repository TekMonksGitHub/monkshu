#!/bin/bash

if [ -z "$*" ]; then 
	echo "Usage: $0 [app_name]"
	exit 1
fi

APP_NAME=$1
MONKSHU_PATH="$( cd "$( dirname "$0" )" && pwd )"
APP_ROOT="$( cd "$MONKSHU_PATH"/../ && pwd )"
pushd ./
TEMPDIR=`mktemp -d` 

echo Cloning.
git clone https://github.com/TekMonksGitHub/starterapp.git "$TEMPDIR"/starterapp

echo Setting up links.
mv "$TEMPDIR"/starterapp "$APP_ROOT/$APP_NAME"
rm -rf "$APP_ROOT/$APP_NAME/.git"
mv "$APP_ROOT/$APP_NAME/frontend/apps/starterapp" "$APP_ROOT/$APP_NAME/frontend/apps/$APP_NAME"
mv "$APP_ROOT/$APP_NAME/backend/apps/starterapp" "$APP_ROOT/$APP_NAME/backend/apps/$APP_NAME"
"$MONKSHU_PATH"/mklink.sh $APP_NAME

echo Cleaning up.
rm -rf "$TEMPDIR"
echo Done.
