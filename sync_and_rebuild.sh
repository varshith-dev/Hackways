#!/usr/bin/env bash
set -e

echo "Deploying modified files..."

if [ -f /tmp/EventDetailPageClient.tsx ]; then
  cp /tmp/EventDetailPageClient.tsx /home/azureuser/event-t/apps/web/src/app/events/\[id\]/EventDetailPageClient.tsx
fi

if [ -f /tmp/WebEventDashboardView.tsx ]; then
  cp /tmp/WebEventDashboardView.tsx /home/azureuser/event-t/apps/web/src/app/console/events/\[id\]/EventDashboardView.tsx
fi

if [ -f /tmp/ConsoleEventDashboardView.tsx ]; then
  cp /tmp/ConsoleEventDashboardView.tsx /home/azureuser/event-t/apps/console/src/app/console/events/\[id\]/EventDashboardView.tsx
fi

if [ -f /tmp/web_eventBrowsing.ts ]; then
  cp /tmp/web_eventBrowsing.ts /home/azureuser/event-t/apps/web/src/lib/eventBrowsing.ts
fi

if [ -f /tmp/console_eventBrowsing.ts ]; then
  cp /tmp/console_eventBrowsing.ts /home/azureuser/event-t/apps/console/src/lib/eventBrowsing.ts
fi

echo "Rebuilding apps/web..."
cd /home/azureuser/event-t/apps/web
npm run build
sudo systemctl restart hackways-web.service

echo "Rebuilding apps/console..."
cd /home/azureuser/event-t/apps/console
npm run build
sudo systemctl restart hackways-console.service

echo "Deployment complete!"
