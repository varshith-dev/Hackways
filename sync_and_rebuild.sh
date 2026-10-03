#!/usr/bin/env bash
set -e

echo "Deploying modified files to /home/azureuser/event-t..."

mkdir -p /home/azureuser/event-t/apps/web/src/app/api/v1/uploads
mkdir -p /home/azureuser/event-t/apps/console/src/app/api/v1/uploads
mkdir -p /home/azureuser/event-t/apps/web/src/app/api/v1/events/\[id\]/capacity
mkdir -p /home/azureuser/event-t/apps/console/src/app/api/v1/events/\[id\]/capacity
mkdir -p /home/azureuser/event-t/apps/web/src/lib
mkdir -p /home/azureuser/event-t/apps/console/src/lib

# Web files
[ -f /tmp/EventDetailPageClient.tsx ] && cp /tmp/EventDetailPageClient.tsx /home/azureuser/event-t/apps/web/src/app/events/\[id\]/EventDetailPageClient.tsx
[ -f /tmp/WebEventDashboardView.tsx ] && cp /tmp/WebEventDashboardView.tsx /home/azureuser/event-t/apps/web/src/app/console/events/\[id\]/EventDashboardView.tsx
[ -f /tmp/web_eventBrowsing.ts ] && cp /tmp/web_eventBrowsing.ts /home/azureuser/event-t/apps/web/src/lib/eventBrowsing.ts
[ -f /tmp/web_serverStore.ts ] && cp /tmp/web_serverStore.ts /home/azureuser/event-t/apps/web/src/lib/serverStore.ts
[ -f /tmp/web_api.ts ] && cp /tmp/web_api.ts /home/azureuser/event-t/apps/web/src/lib/api.ts
[ -f /tmp/web_azureBlob.ts ] && cp /tmp/web_azureBlob.ts /home/azureuser/event-t/apps/web/src/lib/azureBlob.ts
[ -f /tmp/web_uploads_route.ts ] && cp /tmp/web_uploads_route.ts /home/azureuser/event-t/apps/web/src/app/api/v1/uploads/route.ts
[ -f /tmp/web_capacity_route.ts ] && cp /tmp/web_capacity_route.ts /home/azureuser/event-t/apps/web/src/app/api/v1/events/\[id\]/capacity/route.ts
[ -f /tmp/web_next.config.ts ] && cp /tmp/web_next.config.ts /home/azureuser/event-t/apps/web/next.config.ts

# Console files
[ -f /tmp/ConsoleEventDashboardView.tsx ] && cp /tmp/ConsoleEventDashboardView.tsx /home/azureuser/event-t/apps/console/src/app/console/events/\[id\]/EventDashboardView.tsx
[ -f /tmp/console_eventBrowsing.ts ] && cp /tmp/console_eventBrowsing.ts /home/azureuser/event-t/apps/console/src/lib/eventBrowsing.ts
[ -f /tmp/console_serverStore.ts ] && cp /tmp/console_serverStore.ts /home/azureuser/event-t/apps/console/src/lib/serverStore.ts
[ -f /tmp/console_api.ts ] && cp /tmp/console_api.ts /home/azureuser/event-t/apps/console/src/lib/api.ts
[ -f /tmp/console_azureBlob.ts ] && cp /tmp/console_azureBlob.ts /home/azureuser/event-t/apps/console/src/lib/azureBlob.ts
[ -f /tmp/console_uploads_route.ts ] && cp /tmp/console_uploads_route.ts /home/azureuser/event-t/apps/console/src/app/api/v1/uploads/route.ts
[ -f /tmp/console_capacity_route.ts ] && cp /tmp/console_capacity_route.ts /home/azureuser/event-t/apps/console/src/app/api/v1/events/\[id\]/capacity/route.ts
[ -f /tmp/console_next.config.ts ] && cp /tmp/console_next.config.ts /home/azureuser/event-t/apps/console/next.config.ts

echo "Files copied."

# Ensure Azure storage credentials in .env.production are preserved

if ! grep -q "crinmedia" /home/azureuser/event-t/apps/web/.env.production; then
  echo "$AZURE_ENV_BLOCK" >> /home/azureuser/event-t/apps/web/.env.production
fi

if ! grep -q "crinmedia" /home/azureuser/event-t/apps/console/.env.production; then
  echo "$AZURE_ENV_BLOCK" >> /home/azureuser/event-t/apps/console/.env.production
fi

echo "Installing @azure/storage-blob..."
cd /home/azureuser/event-t/apps/web
npm install --save @azure/storage-blob

cd /home/azureuser/event-t/apps/console
npm install --save @azure/storage-blob

echo "Rebuilding apps/web..."
cd /home/azureuser/event-t/apps/web
npm run build
sudo systemctl restart hackways-web.service

echo "Rebuilding apps/console..."
cd /home/azureuser/event-t/apps/console
npm run build
sudo systemctl restart hackways-console.service

echo "Deployment complete and verified!"
