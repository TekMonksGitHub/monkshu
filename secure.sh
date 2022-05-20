#!/bin/bash

MONKSHU_PATH="$( cd "$( dirname "$0" )" && pwd )"
DOMAIN=${1:-`hostname --fqdn`}

if [ "$EUID" -ne 0 ]; then 
	echo Please run as root. E.g. sudo $0
  	exit 1
fi

if ! systemctl --all --type service | grep -q monkshu; then
    echo Monkshu service does not exist, exiting.
    exit 1
fi

if cat "$MONKSHU_PATH/frontend/server/conf/httpd.json" | grep -e '^\s*"ssl":\s*true'; then
    echo Already secured. Exiting.
    exit 1
elif cat "$MONKSHU_PATH/backend/server/conf/httpd.json" | grep -e '^\s*"ssl":\s*true'; then
    echo Already secured. Exiting.
    exit 1
fi

echo Using domain name $DOMAIN
read -p "OK to configure? [Y|N] " -n 1 -r ; echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

echo Starting Monkshu on port 80 for Certbot challenge.
mkdir "$MONKSHU_PATH/frontend/server/certbot_tmp/"
cp "$MONKSHU_PATH/frontend/server/conf/httpd.json.letsencrypt" "$MONKSHU_PATH/frontend/server/certbot_tmp/httpd.json"
pushd  ./ > /dev/null
cd "$MONKSHU_PATH/frontend/server/" > /dev/null
`which node` "$MONKSHU_PATH/frontend/server/server.js" -standalone -c "$MONKSHU_PATH/frontend/server/certbot_tmp" &
popd > /dev/null
PID_CERTBOT_SERVER=$!
echo Certbot server started witl PID $PID_CERTBOT_SERVER
echo Done.

echo Installing Certbot.
if [ -f "`which apt`" ]; then
	apt -y install certbot
elif [ -f "`which yum`" ]; then
	yum install -y certbot
else
	echo Certbot install failed. Exiting.
	exit 1
fi
if ! certbot certonly --webroot -d $DOMAIN -w "$MONKSHU_PATH/frontend"; then
	echo Certbot install failed. Exiting.
	kill -9 $PID_CERTBOT_SERVER
	rm -rf "$MONKSHU_PATH/frontend/server/certbot_tmp"
    exit 1
else 
	kill -9 $PID_CERTBOT_SERVER
	rm -rf "$MONKSHU_PATH/frontend/server/certbot_tmp"
	chmod 644 /etc/letsencrypt/live/$DOMAIN/privkey.pem
	chmod 755 /etc/letsencrypt/archive/
	chmod 755 /etc/letsencrypt/live/
	rm -rf /etc/letsencrypt/renewal-hooks/pre/monkshu_pre.sh
	rm -rf /etc/letsencrypt/renewal-hooks/post/monkshu_post.sh
	ln -s "$MONKSHU_PATH/preLetsEncrypt.sh" /etc/letsencrypt/renewal-hooks/pre/monkshu_pre.sh
	ln -s "$MONKSHU_PATH/postLetsEncrypt.sh" /etc/letsencrypt/renewal-hooks/post/monkshu_post.sh
fi
echo Done.

read -p "OK to modify Monkshu's httpd.json files to use SSL? [Y|N] " -n 1 -r ; echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

echo Stopping Monkshu...
systemctl stop monkshu
echo Done.

echo Configuring Monkshu to use SSL.
cp "$MONKSHU_PATH/frontend/server/conf/httpd.json" "$MONKSHU_PATH/frontend/server/conf/httpd.json.sslbackup"
sed -i -r -e 's/^([ \t]*)"port":.+,[ \t]*$/\1"port": 443,/g' "$MONKSHU_PATH/frontend/server/conf/httpd.json"
sed -i -r -e $'s/^([ \t]*)"ssl":[ \t]*false[ \t]*,[ \t]*$/\t"ssl": true,/g' "$MONKSHU_PATH/frontend/server/conf/httpd.json"
sed -i -r -e 's/^([ \t]*)"timeout":(.+)$/\1"timeout":\2,/g' "$MONKSHU_PATH/frontend/server/conf/httpd.json"
sed -i -r -e $"s/^[ \t]*}[ \t]*$/\\t\"sslKeyFile\": \"\/etc\/letsencrypt\/live\/$DOMAIN\/privkey.pem\",/g" "$MONKSHU_PATH/frontend/server/conf/httpd.json"
echo -e "\n\t\"sslCertFile\": \"/etc/letsencrypt/live/$DOMAIN/fullchain.pem\"\n}" >> "$MONKSHU_PATH/frontend/server/conf/httpd.json"

cp "$MONKSHU_PATH/backend/server/conf/httpd.json" "$MONKSHU_PATH/backend/server/conf/httpd.json.sslbackup"
sed -i -r -e $'s/^([ \t]*)"ssl":[ \t]*false[ \t]*,[ \t]*$/\t"ssl": true,/g' "$MONKSHU_PATH/backend/server/conf/httpd.json"
sed -i -r -e 's/^([ \t]*)"ipwhitelistRefresh":(.+)$/\1"ipwhitelistRefresh":\2,/g' "$MONKSHU_PATH/backend/server/conf/httpd.json"
sed -i -r -e $"s/^[ \t]*}[ \t]*$/\\t\"sslKeyFile\": \"\/etc\/letsencrypt\/live\/$DOMAIN\/privkey.pem\",/g" "$MONKSHU_PATH/backend/server/conf/httpd.json"
echo -e "\n\t\"sslCertFile\": \"/etc/letsencrypt/live/$DOMAIN/fullchain.pem\"\n}" >> "$MONKSHU_PATH/backend/server/conf/httpd.json"
echo Done.

echo Starting Monkshu....
systemctl start monkshu
echo Done.
