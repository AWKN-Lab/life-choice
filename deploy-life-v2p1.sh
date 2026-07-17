#!/bin/bash
set -e

echo "=== STEP 0: Cleanup wrong backup ==="
if [ -d "/www/wwwroot/awkn-lab/life.bak-" ]; then
    rm -rf "/www/wwwroot/awkn-lab/life.bak-"
    echo "Removed wrong backup: life.bak-"
fi

TS=$(date +%Y%m%d_%H%M%S)
echo "=== STEP 1: Backup current life/ (TS=$TS) ==="
cp -r /www/wwwroot/awkn-lab/life "/www/wwwroot/awkn-lab/life.bak-$TS"
echo "Backup created: life.bak-$TS"

echo "=== STEP 2: Extract zip ==="
TMP_DIR="/tmp/life-dist-new-$TS"
mkdir -p "$TMP_DIR"
cd "$TMP_DIR"
# PowerShell zip may use backslashes, but unzip handles it with warning
unzip -q /tmp/dist-life-v2p1.zip 2>&1 || true
echo "Extracted to: $TMP_DIR"
echo "Top-level files:"
ls -la | head -10

echo "=== STEP 3: Verify extraction has index.html ==="
if [ ! -f "$TMP_DIR/index.html" ]; then
    echo "ERROR: index.html not found after extraction!"
    echo "Contents of $TMP_DIR:"
    ls -la
    exit 1
fi
echo "index.html found"

echo "=== STEP 4: Rsync --delete atomic sync ==="
rsync -a --delete "$TMP_DIR/" /www/wwwroot/awkn-lab/life/
echo "Rsync completed"

echo "=== STEP 5: chmod a+rX ==="
chmod -R a+rX /www/wwwroot/awkn-lab/life/
echo "chmod completed"

echo "=== STEP 6: Verify new index.html ==="
NEW_INDEX_JS=$(grep -oP 'index-[A-Za-z0-9_-]+\.js' /www/wwwroot/awkn-lab/life/index.html | head -1)
echo "New index.js reference: $NEW_INDEX_JS"

echo "=== STEP 7: Verify ConsultPage chunk ==="
ls /www/wwwroot/awkn-lab/life/assets/ConsultPage-*.js

echo "=== STEP 8: Cleanup temp ==="
rm -rf "$TMP_DIR" /tmp/dist-life-v2p1.zip
echo "Temp cleaned"

echo "=== DEPLOY COMPLETE ==="
echo "DEPLOY_TS=$TS"
echo "$TS" > /tmp/life-deploy-ts.txt
