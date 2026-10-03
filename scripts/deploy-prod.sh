#!/usr/bin/env bash
# Production deploy for the Azure VM. Run ON the VM (not from here — I have
# no access to it). Draft for Antigravity/whoever has VM access to review
# and run; not executed by me.
#
# Deliberately reads every credential from the environment / a sourced env
# file rather than hardcoding any value — DEPLOYMENT_AND_VM_GUIDE.md already
# has the real DB password in plaintext and isn't committed; this script
# shouldn't become a second copy of that secret sitting in git history.
#
# Usage:
#   On the VM: source the env file that already holds these (or export them
#   in the shell profile), then run this script. It refuses to proceed if
#   required variables are missing rather than silently using a wrong default.
#
#   DEPLOY_REPO_PATH=/home/azureuser/event-t \
#   DEPLOY_PG_CONTAINER=eventflow-postgres \
#   DEPLOY_PG_USER=postgres \
#   DEPLOY_PG_DB=eventflow \
#   PGPASSWORD=<the real password, from wherever it actually lives> \
#   ./scripts/deploy-prod.sh

set -euo pipefail

REPO_PATH="${DEPLOY_REPO_PATH:?Set DEPLOY_REPO_PATH (e.g. /home/azureuser/event-t)}"
PG_CONTAINER="${DEPLOY_PG_CONTAINER:-eventflow-postgres}"
PG_USER="${DEPLOY_PG_USER:-postgres}"
PG_DB="${DEPLOY_PG_DB:-eventflow}"
: "${PGPASSWORD:?Set PGPASSWORD in the environment — never hardcode it here or anywhere else in this repo}"

cd "$REPO_PATH"

echo "==> 1. Syncing latest code"
git fetch origin
git status --porcelain | grep -q . && { echo "Working tree has uncommitted changes — aborting rather than discarding them."; exit 1; }
git pull --ff-only origin main

echo "==> 2. Verifying database connection"
docker exec "$PG_CONTAINER" pg_isready -U "$PG_USER" -d "$PG_DB"

echo "==> 3. Applying PostgreSQL migrations (idempotent — safe to re-run)"
# No migration runner is wired into this repo (confirmed: migrations/ has
# only .up.sql files, no schema_migrations tracking table) — apply every
# .up.sql in order, same as the documented manual process. Every migration
# in this repo uses IF NOT EXISTS / safe no-op patterns specifically so this
# loop can run on every deploy without a tracking table.
for migration in services/rsvp-core/migrations/*.up.sql; do
  echo "    -> $migration"
  docker exec -i "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" < "$migration"
done

echo "==> 4. Installing dependencies and building both Next.js apps"
npm --prefix apps/web ci
npm --prefix apps/console ci
npm --prefix apps/web run build
npm --prefix apps/console run build

echo "==> 5. Restarting application services"
# Plain terminology: this is a brief-interruption restart (systemd stop then
# start, a second or two of downtime per service), not a true zero-downtime
# blue-green swap — that needs a second instance behind a load balancer,
# which isn't this VM's current topology. Calling it "zero-downtime" when it
# isn't would just be wrong; said so rather than overclaiming.
sudo systemctl restart hackways-web
sudo systemctl restart hackways-console

echo "==> 6. Health check"
sleep 2
curl -fsS http://127.0.0.1:3000/ -o /dev/null && echo "    web: OK" || { echo "    web: FAILED"; exit 1; }
curl -fsS http://127.0.0.1:3001/ -o /dev/null && echo "    console: OK" || { echo "    console: FAILED"; exit 1; }
docker ps --filter "name=eventflow-rsvp-core" --format "{{.Status}}" | grep -qi "up" && echo "    rsvp-core: OK" || { echo "    rsvp-core: FAILED"; exit 1; }

echo "==> Deploy complete."
