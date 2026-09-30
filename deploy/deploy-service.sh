#!/usr/bin/env bash
# Switches a service to a release and checks its health. If the check fails, switches
# it back to the release it ran before.
# Usage: deploy-service.sh <service> <sha>
set -euo pipefail

service=$1
new_release=~/pumpking/releases/$2
link=~/pumpking/$service
old_release=$(readlink "$link" || true)

case $service in
  api) health_url=https://api.pumpking.top:3001/healthz ;;
  ingest) health_url=http://127.0.0.1:3002/healthz ;;
  bot) health_url=http://127.0.0.1:3003/healthz ;;
esac

# pm2 runs the service from its symlink (see pm2.config.js), so the reload starts the
# release the symlink points at
switch_to() {
  ln -sfn "$1" "$link"
  pm2 startOrReload "$1/pm2.config.js" --only "pumpking-$service"
}

is_healthy() {
  curl -fsS --retry 15 --retry-delay 2 --retry-all-errors "$health_url"
}

switch_to "$new_release"
if is_healthy; then
  pm2 save
  exit 0
fi

echo "Health check failed"
if [ -n "$old_release" ]; then
  echo "Switching back to $old_release"
  switch_to "$old_release"
fi
exit 1
