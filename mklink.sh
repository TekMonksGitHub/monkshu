#!/bin/bash

shopt -s nullglob 							# skip empty folders
MONKSHU_DIR="$( cd "$( dirname "$0" )" && pwd )"
pushd . > /dev/null
cd "$MONKSHU_DIR/../"
APP_DIR=$PWD
popd > /dev/null

if [ "$1" == "" ]; then
	echo "Usage: $0 [name of the application]"
	exit 1
fi
APP_NAME=$1

function createAppLinkOfType {
	local APP_TYPE="$1"
	local APPS_BASE="$APP_DIR/$APP_NAME/$APP_TYPE/apps"
	local DEST_DIR="$MONKSHU_DIR/$APP_TYPE/apps"

	local DIRS=( "$APPS_BASE"/* )								# Find all files & directories using * and a / in the end
	if [[ ${#DIRS[@]} -eq 0 ]]; then return 0; fi				# Nothing found

	mkdir -p "$DEST_DIR"										# Create the destination link holder if it doesn't exist

	for SRC_DIR_ENTRY in "${DIRS[@]}"; do
		local DETECTED_NAME=$(basename "$SRC_DIR_ENTRY")		# Just the name
		ln -sf "$SRC_DIR_ENTRY" "$DEST_DIR/$DETECTED_NAME"
	done
}

createAppLinkOfType "backend"
createAppLinkOfType "frontend"
createAppLinkOfType "desktop"

echo Done.
