#!/bin/bash
MONKSHU_SERVICE_NAME="monkshu"
MONKSHU_PATH="$( cd "$( dirname "$(readlink -f "$0")" )" && pwd )"
MONKSHU_CERTBOT_RENEWAL_LOG=/tmp/monkshu_certbot_renewal.log
MONKSHU_CERTBOT_RENEWAL_PID=/tmp/monkshu_certbot_renewal.pid

rm -rf $MONKSHU_CERTBOT_RENEWAL_LOG
echo Stopping regular Monkshu server and cleanup. > $MONKSHU_CERTBOT_RENEWAL_LOG
systemctl stop $MONKSHU_SERVICE_NAME
RUNNING_MONKSHU_PID=$(ps -ef | grep -i node | grep -i monkshu | tr -s " " | cut -d " " -f2)
if [[ ! -z "$RUNNING_MONKSHU_PID" ]]; then
	echo "Running Monkshu detected on PID $RUNNING_MONKSHU_PID, killing it." >> $MONKSHU_CERTBOT_RENEWAL_LOG
	kill -9 $RUNNING_MONKSHU_PID >> $MONKSHU_CERTBOT_RENEWAL_LOG
fi
rm -rf "$MONKSHU_PATH/frontend/server/certbot_tmp/"
rm -rf $MONKSHU_CERTBOT_RENEWAL_PID
echo Done. >> $MONKSHU_CERTBOT_RENEWAL_LOG

echo Starting Monkshu on port 80 for Certbot challenge. >> $MONKSHU_CERTBOT_RENEWAL_LOG
mkdir "$MONKSHU_PATH/frontend/server/certbot_tmp/"
cp "$MONKSHU_PATH/frontend/server/conf/httpd.json.letsencrypt" "$MONKSHU_PATH/frontend/server/certbot_tmp/httpd.json"
pushd  ./ > /dev/null
cd "$MONKSHU_PATH/frontend/server/" > /dev/null
`which node` "$MONKSHU_PATH/frontend/server/server.js" -standalone -c "$MONKSHU_PATH/frontend/server/certbot_tmp" >> $MONKSHU_CERTBOT_RENEWAL_LOG &
popd > /dev/null
PID_CERTBOT_SERVER=$!
echo $PID_CERTBOT_SERVER > $MONKSHU_CERTBOT_RENEWAL_PID
echo Certbot server started with PID $PID_CERTBOT_SERVER >> $MONKSHU_CERTBOT_RENEWAL_LOG
echo Done. >> $MONKSHU_CERTBOT_RENEWAL_LOG
exit 0