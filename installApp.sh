#!/bin/bash

APP_NAME=$1
if [ -z "$APP_NAME" ]; then
	echo Usage: installApp.sh [name of the application]
	exit 1
fi


git clone https://github.com/TekMonksGitHub/monkshu.git
git clone https://github.com/TekMonksGitHub/${APP_NAME}.git

find ./${APP_NAME} -maxdepth 1 -type f -exec mv {} ./monkshu/ \;

if [ -d ./${APP_NAME}/backend/apps/${APP_NAME} ]; then
	mv ./${APP_NAME}/backend/apps/${APP_NAME} ./monkshu/backend/apps/
fi

if [ -d ./${APP_NAME}/frontend/apps/${APP_NAME} ]; then
	mv ./${APP_NAME}/frontend/apps/${APP_NAME} ./monkshu/frontend/apps/
fi

if [ -d ./${APP_NAME}/install ]; then
	mv ./${APP_NAME}/install ./monkshu/install
fi

rm -rf ./${APP_NAME}
mv ./monkshu ./${APP_NAME}

if [ -f ./${APP_NAME}/install/install.sh ]; then
	sh ./${APP_NAME}/install/install.sh
fi

echo Done.