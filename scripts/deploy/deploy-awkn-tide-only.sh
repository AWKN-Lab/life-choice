#!/bin/bash
set -e
TS=$(date +%Y%m%d-%H%M%S)
mkdir -p /opt/awkn-life/backups/$TS
cp /opt/awkn-life/app/src/pages/TidePage.tsx /opt/awkn-life/backups/$TS/TidePage.tsx.bak
cp /tmp/awkn-life-deploy/app-src/pages/TidePage.tsx /opt/awkn-life/app/src/pages/TidePage.tsx
rm -rf /opt/awkn-life/app/dist/*
cp -r /tmp/awkn-life-deploy/frontend-dist/* /opt/awkn-life/app/dist/
rm -rf /www/wwwroot/awkn-lab/life/assets
mkdir -p /www/wwwroot/awkn-lab/life
cp -r /opt/awkn-life/app/dist/* /www/wwwroot/awkn-lab/life/
chown -R www:www /www/wwwroot/awkn-lab/life
chmod -R 755 /www/wwwroot/awkn-lab/life
nginx -t >/dev/null 2>&1 && systemctl reload nginx || true
echo TIDE_DEPLOY_OK:$TS