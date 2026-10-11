#!/bin/bash

shopt -s nullglob 							# skip empty folders
MONKSHU_DIR="$( cd "$( dirname "$0" )" && pwd )"
pushd . > /dev/null
cd "$MONKSHU_DIR/../"
APP_DIR=$PWD
popd > /dev/null

APP_NAME=$1

function removeAppLinkOfType {
    local APP_TYPE="$1"
    local TARGET_DIR="$MONKSHU_DIR/$APP_TYPE/apps"
    if [[ ! -d "$TARGET_DIR" ]]; then return 0; fi

    local DIRS=( "$APP_DIR/$APP_NAME/$APP_TYPE/apps"/*/ )
    if [[ ${#DIRS[@]} -gt 0 ]]; then
        local SRC_DIR="${DIRS[0]%/}"
        local DETECTED_NAME=$(basename "$SRC_DIR")
        if [[ -L "$TARGET_DIR/$DETECTED_NAME" ]]; then
            rm "$TARGET_DIR/$DETECTED_NAME"
            rmdir "$TARGET_DIR" 2>/dev/null
            return 0
        fi
    fi

    for APP_LINK in "$TARGET_DIR"/*; do     
        if [[ -L "$APP_LINK" ]]; then rm "$APP_LINK"; fi    # only remove if it's a symbolic link
    done
    rmdir "$TARGET_DIR" 2>/dev/null
}

removeAppLinkOfType "backend" 
removeAppLinkOfType "frontend"
removeAppLinkOfType "desktop"

echo Done.
