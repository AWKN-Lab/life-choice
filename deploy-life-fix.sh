#!/bin/bash
set -e

TS=$(date +%Y%m%d_%H%M%S)
echo "=== STEP 1: Backup correct dir (TS=$TS) ==="
cp -r /www/wwwroot/awkn.cn/life "/www/wwwroot/awkn.cn/life.bak-$TS"
echo "Backup: life.bak-$TS"

echo "=== STEP 2: Rsync from awkn-lab/life to awkn.cn/life ==="
rsync -a --delete /www/wwwroot/awkn-lab/life/ /www/wwwroot/awkn.cn/life/
echo "Rsync done"

echo "=== STEP 3: chmod a+rX ==="
chmod -R a+rX /www/wwwroot/awkn.cn/life/
echo "chmod done"

echo "=== STEP 4: Verify ==="
echo "index.js ref: $(grep -oP 'index-[A-Za-z0-9_-]+\.js' /www/wwwroot/awkn.cn/life/index.html | head -1)"
echo "ConsultPage: $(ls /www/wwwroot/awkn.cn/life/assets/ConsultPage-*.js)"

echo "=== STEP 5: Cleanup wrong awkn-lab/life backups ==="
rm -rf /www/wwwroot/awkn-lab/life.bak- /www/wwwroot/awkn-lab/life.bak-20260712_085543
echo "Wrong backups cleaned"

echo "=== STEP 6: Curl verify (localhost, bypass CF) ==="
echo "index.js served: $(curl -sL -H 'Host: awkn.cn' http://127.0.0.1/life/ | grep -oP 'index-[A-Za-z0-9_-]+\.js' | head -1)"
echo "ConsultPage HTTP: $(curl -sI -H 'Host: awkn.cn' http://127.0.0.1/life/assets/$(ls /www/wwwroot/awkn.cn/life/assets/ConsultPage-*.js | xargs basename) | head -1)"

echo "=== DEPLOY FIX COMPLETE ==="
echo "TS=$TS"
