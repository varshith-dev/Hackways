#!/usr/bin/env bash
set -e

if [ -f /tmp/EventDetailPageClient.tsx ]; then
  cp /tmp/EventDetailPageClient.tsx /home/azureuser/event-t/apps/web/src/app/events/\[id\]/EventDetailPageClient.tsx
  echo "Copied EventDetailPageClient.tsx"
fi

cd /home/azureuser/event-t/apps/web
npm run build
sudo systemctl restart hackways-web.service

echo "Web build and restart successful!"
