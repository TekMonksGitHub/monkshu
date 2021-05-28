#!/bin/bash
PFXPASS="[Add your preferred pfx password here]"
APP_NAME="xbin.app"
MONKSHU_SERVICE_NAME="monkshu"

pushd ./
cd "/etc/letsencrypt/live/$APP_NAME/"
openssl pkcs12 -inkey privkey.pem -in cert.pem -export -out cert.pfx -passout pass:"$PFXPASS"
popd

systemctl restart $MONKSHU_SERVICE_NAME