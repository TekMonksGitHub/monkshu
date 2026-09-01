#!/bin/bash

CURPATH="$( cd "$( dirname "$0" )" && pwd )"

pushd "$CURPATH/../" > /dev/null
APP_DIR=$PWD
popd > /dev/null

if [ "$1" == "" ]; then
    echo Usage: $0 [name of the application]
    exit 1
fi

APP_NAME=$1

for TYPE in backend frontend; do
    SRC="$APP_DIR/$APP_NAME/$TYPE/apps"

    if [ -d "$SRC" ]; then
        mkdir -p "$CURPATH/$TYPE/apps"

        for APP in "$SRC"/*; do
            [ -d "$APP" ] || continue
            ln -sfn "$APP" "$CURPATH/$TYPE/apps/$(basename "$APP")"
        done
    fi
done

SRC="$APP_DIR/$APP_NAME/desktop/app"
if [ -d "$SRC" ]; then
    mkdir -p "$CURPATH/desktop/app"

    for APP in "$SRC"/*; do
        [ -d "$APP" ] || continue
        ln -sfn "$APP" "$CURPATH/desktop/app/$(basename "$APP")"
    done
fi

echo Done.