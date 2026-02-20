#!/bin/bash
set -e

echo "🚀 Deploying Auth Center to ag4.q37fh758g.click..."

# Rsync to server
sshpass -p 'JbM6dpbhio' rsync -avz \
  -e 'ssh -o StrictHostKeyChecking=no' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.git' \
  --exclude='.env' \
  --exclude='.DS_Store' \
  --exclude='*.db' \
  --exclude='dev.db' \
  --exclude='sdk/dist' \
  --exclude='sdk/node_modules' \
  ./ root@38.180.64.111:/opt/auth-center/

# Install deps, generate prisma, build, setup on server
sshpass -p 'JbM6dpbhio' ssh -o StrictHostKeyChecking=no root@38.180.64.111 << 'REMOTE'
cd /opt/auth-center

# Install deps
npm install --production=false

# Generate Prisma client and push schema
npx prisma generate
npx prisma db push

# Seed the database
npx prisma db seed || true

# Build Next.js
npm run build

# Restart service
systemctl restart auth-center.service || echo "Service not yet configured"

echo "✅ Deploy complete!"
REMOTE
