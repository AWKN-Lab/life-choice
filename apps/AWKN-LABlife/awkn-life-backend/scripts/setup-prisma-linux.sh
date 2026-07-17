#!/bin/bash
set -e
cd /opt/awkn-life/awkn-life-backend

echo "=== Step 1: Delete Windows Prisma query engine ==="
rm -f node_modules/.prisma/client/query_engine-windows.dll.node
echo "Deleted Windows query engine"

echo "=== Step 2: Install prisma CLI (v5) with limited memory ==="
NODE_OPTIONS="--max-old-space-size=256" npm install prisma@5.22.0 --no-save --registry=https://registry.npmmirror.com 2>&1 || {
  echo "npm install prisma failed, trying with swap..."
  if [ ! -f /swapfile ]; then
    fallocate -l 1G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=1024
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo "Swap created"
  fi
  npm install prisma@5.22.0 --no-save --registry=https://registry.npmmirror.com 2>&1
}

echo "=== Step 3: Generate Prisma Client for Linux ==="
./node_modules/.bin/prisma generate 2>&1

echo "=== Step 4: Verify Prisma Client ==="
ls -la node_modules/.prisma/client/*.node 2>&1 || echo "No .node files (pure JS mode)"
node -e 'const pc = require("@prisma/client"); console.log("PrismaClient OK:", typeof pc.PrismaClient)'

echo "=== Step 5: Clean up prisma CLI (dev only) ==="
rm -rf node_modules/prisma

echo "=== Prisma setup complete ==="
