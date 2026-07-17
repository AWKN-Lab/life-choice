#!/bin/bash
set -e
TS=$(date +%Y%m%d-%H%M%S)
mkdir -p /opt/awkn-life/backups/$TS
cp /opt/awkn-life/app/src/hooks/useTidePackage.ts /opt/awkn-life/backups/$TS/useTidePackage.ts.bak
cp /opt/awkn-life/app/src/pages/TidePage.tsx /opt/awkn-life/backups/$TS/TidePage.tsx.bak
cp /opt/awkn-life/awkn-life-backend/apps/api-server/src/auth/auth.service.ts /opt/awkn-life/backups/$TS/auth.service.ts.bak
if [ -f /opt/awkn-life/awkn-life-backend/apps/api-server/scripts/ensure-admin.js ]; then
  cp /opt/awkn-life/awkn-life-backend/apps/api-server/scripts/ensure-admin.js /opt/awkn-life/backups/$TS/ensure-admin.js.bak
fi
cp /tmp/awkn-life-deploy/app-src/hooks/useTidePackage.ts /opt/awkn-life/app/src/hooks/useTidePackage.ts
cp /tmp/awkn-life-deploy/app-src/pages/TidePage.tsx /opt/awkn-life/app/src/pages/TidePage.tsx
cp /tmp/awkn-life-deploy/api-src/auth/auth.service.ts /opt/awkn-life/awkn-life-backend/apps/api-server/src/auth/auth.service.ts
cp /tmp/awkn-life-deploy/api-scripts/ensure-admin.js /opt/awkn-life/awkn-life-backend/apps/api-server/scripts/ensure-admin.js
rm -rf /opt/awkn-life/app/dist/*
cp -r /tmp/awkn-life-deploy/frontend-dist/* /opt/awkn-life/app/dist/
cd /opt/awkn-life/awkn-life-backend/apps/api-server
npm run build
cd /opt/awkn-life/awkn-life-backend
pm2 restart awkn-life-backend
rm -rf /www/wwwroot/awkn-lab/life/assets
mkdir -p /www/wwwroot/awkn-lab/life
cp -r /opt/awkn-life/app/dist/* /www/wwwroot/awkn-lab/life/
chown -R www:www /www/wwwroot/awkn-lab/life
chmod -R 755 /www/wwwroot/awkn-lab/life
nginx -t >/dev/null 2>&1 && systemctl reload nginx || true
echo DEPLOY_OK:$TS