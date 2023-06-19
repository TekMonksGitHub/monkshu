#!/bin/bash
MONKSHU_PATH="$( cd "$( dirname "$(readlink -f "$0")" )" && pwd )"
MONKSHU_CERTBOT_RENEWAL_LOG=/tmp/monkshu_certbot_renewal.log

echo "Starting Certbot Renewal Script for Monkshu" >> $MONKSHU_CERTBOT_RENEWAL_LOG
"$MONKSHU_PATH/preLetsEncrypt.sh"
certbot renew
"$MONKSHU_PATH/postLetsEncrypt.sh"