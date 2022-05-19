#!/bin/bash
MONKSHU_SERVICE_NAME="monkshu"
MONKSHU_PATH="$( cd "$( dirname "$0" )" && pwd )"
MONKSHU_CERTBOT_RENEWAL_LOG=/tmp/monkshu_certbot_renewal.log
MONKSHU_CERTBOT_RENEWAL_PID=/tmp/monkshu_certbot_renewal.pid
DOMAIN=${1:-`hostname --fqdn`}

PID_CERTBOT_SERVER=$( cat $MONKSHU_CERTBOT_RENEWAL_PID )

echo Killing special CERTBOT renewal server. >> $MONKSHU_CERTBOT_RENEWAL_LOG
kill -9 $PID_CERTBOT_SERVER
echo Cleaning up. >> $MONKSHU_CERTBOT_RENEWAL_LOG
rm -rf "$MONKSHU_PATH/frontend/server/certbot_tmp"
chmod 644 /etc/letsencrypt/live/$DOMAIN/privkey.pem
chmod 755 /etc/letsencrypt/archive/
chmod 755 /etc/letsencrypt/live/

echo Restarting Monkshu service. >> $MONKSHU_CERTBOT_RENEWAL_LOG
systemctl start $MONKSHU_SERVICE_NAME