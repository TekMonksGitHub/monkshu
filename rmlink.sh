#!/bin/bash
CURPATH="$( cd "$( dirname "$0" )" && pwd )"

rm $CURPATH/backend/apps
rm $CURPATH/frontend/apps
rm $CURPATH/electron/app

echo Done.
