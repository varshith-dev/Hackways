#!/usr/bin/env bash
set -e

cp /tmp/EventDetailPageClient.tsx /home/azureuser/event-t/apps/web/src/app/events/\[id\]/EventDetailPageClient.tsx
cp /tmp/EventRSVPPageClient.tsx /home/azureuser/event-t/apps/web/src/app/events/\[id\]/rsvp/EventRSVPPageClient.tsx
cp /tmp/HorizontalEventPass.tsx /home/azureuser/event-t/apps/web/src/components/pass/HorizontalEventPass.tsx
cp /tmp/generateTicketPdf.ts /home/azureuser/event-t/apps/web/src/lib/generateTicketPdf.ts
cp /tmp/api.ts /home/azureuser/event-t/apps/web/src/lib/api.ts

echo "Files copied into place."

cd /home/azureuser/event-t/apps/web
npm run build
sudo systemctl restart hackways-web.service

echo "Build and restart completed."
