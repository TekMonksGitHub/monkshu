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
        for APP in "$SRC"/*; do
            [ -d "$APP" ] || continue
            rm -f "$CURPATH/$TYPE/apps/$(basename "$APP")"
        done
    fi
done

SRC="$APP_DIR/$APP_NAME/desktop/app"
if [ -d "$SRC" ]; then
    for APP in "$SRC"/*; do
        [ -d "$APP" ] || continue
        rm -f "$CURPATH/desktop/app/$(basename "$APP")"
    done
fi

# Remove empty directories if they exist
for DIR in \
    "$CURPATH/backend/apps" \
    "$CURPATH/frontend/apps" \
    "$CURPATH/desktop/app"
do
    if [ -d "$DIR" ] && [ -z "$(ls -A "$DIR" 2>/dev/null)" ]; then
        rmdir "$DIR"
    fi
done

echo Done.

echo Done.