#!/usr/bin/env bash
set -e

echo "=== 1. Updating Nginx Configuration ==="
# Check if /api/v1/uploads already exists in nginx config
if ! grep -q "/api/v1/uploads" /etc/nginx/sites-enabled/hackways; then
  python3 - << 'PYEOF'
with open('/etc/nginx/sites-enabled/hackways', 'r') as f:
    content = f.read()

target = "# APPLICATION 3: GO BACKEND EVENT SERVICE (Port 8080)"
new_block = """    # Uploads -> Port 3001 (Direct Azure Blob persistent upload)
    location /api/v1/uploads {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }

    # Go Hot Path: Capacity check, RSVP creation, SSE Live Stream
    location ~ ^/api/v1/events/[^/]+/(rsvps|capacity|live) {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /api/v1/rsvps {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Events API -> Port 3001 (Full schema fidelity: themes, schedule, faqs, custom questions, banners)
    location /api/v1/events {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }

    # APPLICATION 3: GO BACKEND EVENT SERVICE (Port 8080)"""

if target in content:
    content = content.replace(target, new_block)
    with open('/etc/nginx/sites-enabled/hackways', 'w') as f:
        f.write(content)
    print("Nginx configuration successfully patched.")
else:
    print("Target block not found in nginx config!")
PYEOF
fi

sudo nginx -t
sudo systemctl reload nginx
echo "Nginx reloaded successfully."

echo "=== 2. Setting Up Shared Server Data Store ==="
mkdir -p /home/azureuser/event-t/.shared_server_data
if [ -f /home/azureuser/event-t/apps/console/.server_data/platform_store.json ]; then
  cp -n /home/azureuser/event-t/apps/console/.server_data/platform_store.json /home/azureuser/event-t/.shared_server_data/platform_store.json || true
elif [ -f /home/azureuser/event-t/apps/web/.server_data/platform_store.json ]; then
  cp -n /home/azureuser/event-t/apps/web/.server_data/platform_store.json /home/azureuser/event-t/.shared_server_data/platform_store.json || true
fi

# Ensure DATA_DIR is in .env.production
for env_file in /home/azureuser/event-t/apps/web/.env.production /home/azureuser/event-t/apps/console/.env.production; do
  if ! grep -q "DATA_DIR" "$env_file"; then
    echo "DATA_DIR=/home/azureuser/event-t/.shared_server_data" >> "$env_file"
  else
    sed -i 's|DATA_DIR=.*|DATA_DIR=/home/azureuser/event-t/.shared_server_data|' "$env_file"
  fi
done

echo "=== 3. Updating Postgres Event Capacity ==="
sudo docker exec -i eventflow-postgres psql -U postgres -d eventflow -c "UPDATE events SET total_capacity = 0 WHERE id = '5f890d3b-45fb-47c6-bfba-dd9a28c37dd4'; UPDATE ticket_tiers SET total_capacity = 0, remaining_capacity = 0 WHERE event_id = '5f890d3b-45fb-47c6-bfba-dd9a28c37dd4';" || true

echo "=== 4. Copying Modified Files ==="
mkdir -p /home/azureuser/event-t/apps/web/src/app/api/v1/uploads
mkdir -p /home/azureuser/event-t/apps/console/src/app/api/v1/uploads
mkdir -p /home/azureuser/event-t/apps/web/src/app/api/v1/events/\[id\]/capacity
mkdir -p /home/azureuser/event-t/apps/console/src/app/api/v1/events/\[id\]/capacity
mkdir -p /home/azureuser/event-t/apps/web/src/lib
mkdir -p /home/azureuser/event-t/apps/console/src/lib

[ -f /tmp/EventDetailPageClient.tsx ] && cp /tmp/EventDetailPageClient.tsx /home/azureuser/event-t/apps/web/src/app/events/\[id\]/EventDetailPageClient.tsx
[ -f /tmp/WebEventDashboardView.tsx ] && cp /tmp/WebEventDashboardView.tsx /home/azureuser/event-t/apps/web/src/app/console/events/\[id\]/EventDashboardView.tsx
[ -f /tmp/ConsoleEventDashboardView.tsx ] && cp /tmp/ConsoleEventDashboardView.tsx /home/azureuser/event-t/apps/console/src/app/console/events/\[id\]/EventDashboardView.tsx

[ -f /tmp/web_api.ts ] && cp /tmp/web_api.ts /home/azureuser/event-t/apps/web/src/lib/api.ts
[ -f /tmp/console_api.ts ] && cp /tmp/console_api.ts /home/azureuser/event-t/apps/console/src/lib/api.ts

[ -f /tmp/web_sessionToken.ts ] && cp /tmp/web_sessionToken.ts /home/azureuser/event-t/apps/web/src/lib/sessionToken.ts
[ -f /tmp/console_sessionToken.ts ] && cp /tmp/console_sessionToken.ts /home/azureuser/event-t/apps/console/src/lib/sessionToken.ts

[ -f /tmp/web_serverAuth.ts ] && cp /tmp/web_serverAuth.ts /home/azureuser/event-t/apps/web/src/lib/serverAuth.ts
[ -f /tmp/console_serverAuth.ts ] && cp /tmp/console_serverAuth.ts /home/azureuser/event-t/apps/console/src/lib/serverAuth.ts

[ -f /tmp/web_uploads_route.ts ] && cp /tmp/web_uploads_route.ts /home/azureuser/event-t/apps/web/src/app/api/v1/uploads/route.ts
[ -f /tmp/console_uploads_route.ts ] && cp /tmp/console_uploads_route.ts /home/azureuser/event-t/apps/console/src/app/api/v1/uploads/route.ts

[ -f /tmp/web_events_id_route.ts ] && cp /tmp/web_events_id_route.ts /home/azureuser/event-t/apps/web/src/app/api/v1/events/\[id\]/route.ts
[ -f /tmp/console_events_id_route.ts ] && cp /tmp/console_events_id_route.ts /home/azureuser/event-t/apps/console/src/app/api/v1/events/\[id\]/route.ts

[ -f /tmp/web_events_route.ts ] && cp /tmp/web_events_route.ts /home/azureuser/event-t/apps/web/src/app/api/v1/events/route.ts
[ -f /tmp/console_events_route.ts ] && cp /tmp/console_events_route.ts /home/azureuser/event-t/apps/console/src/app/api/v1/events/route.ts

echo "=== 5. Rebuilding Web and Console ==="
cd /home/azureuser/event-t/apps/web
npm run build
sudo systemctl restart hackways-web.service

cd /home/azureuser/event-t/apps/console
npm run build
sudo systemctl restart hackways-console.service

echo "=== Deployment Successfully Completed ==="
