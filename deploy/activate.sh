#!/usr/bin/env bash
# Switches one service to this release: points ~/pumpking/<service> here, starts or reloads
# the service's pm2 app, checks its /healthz, and goes back to the previous release if the
# check fails. Run over SSH by the Deploy workflow, after release.sh.
# See "Build and release" in docs/python-api-migration/PLAN.md. Usage: activate.sh <service>
set -euo pipefail

service=$1
release=$(cd "$(dirname "$0")/.." && pwd -P)
root=$(dirname "$(dirname "$release")")
link=$root/$service
app=pumpking-$service

case $service in
  # The API terminates its own TLS, for its public host name
  api) health=(--resolve api.pumpking.top:3001:127.0.0.1 https://api.pumpking.top:3001/healthz) ;;
  ingest) health=(http://127.0.0.1:3002/healthz) ;;
  bot) health=(http://127.0.0.1:3003/healthz) ;;
  *) echo "Unknown service: $service"; exit 1 ;;
esac

[ -f "$root/shared/$service.env" ] || { echo "shared/$service.env is missing"; exit 1; }

# Atomically, as a rename over the old link
point_at() {
  ln -sfn "$1" "$link.new"
  mv -Tf "$link.new" "$link"
}

# The app's cwd in pm2, empty when pm2 doesn't know the app
app_cwd() {
  # A daemon that isn't running yet would print its start-up banner before the JSON
  pm2 ping >/dev/null
  pm2 jlist | node -e '
    let json = "";
    process.stdin.on("data", (chunk) => (json += chunk)).on("end", () => {
      const app = JSON.parse(json).find((it) => it.name === process.argv[1]);
      console.log(app ? app.pm2_env.pm_cwd : "");
    });' "$app"
}

# An app started from another directory (the old ~/pumpking-deployment) would keep it on
# reload, so that one is started afresh
start() {
  local cwd
  cwd=$(app_cwd)
  if [ -n "$cwd" ] && [ "$cwd" != "$link/packages/$service" ]; then
    echo "-- $app runs from $cwd: restarting it from $link"
    pm2 delete "$app"
  fi
  pm2 startOrReload "$1/pm2.config.js" --only "$app"
}

# Healthy, and running from the release its symlink points at
healthy() {
  curl -fsS --retry 15 --retry-delay 2 --retry-all-errors "${health[@]}" && echo &&
    [ "$(readlink -f "/proc/$(pm2 pid "$app")/cwd")" = "$1/packages/$service" ]
}

previous=
if [ -L "$link" ]; then previous=$(readlink -f "$link"); fi
echo "-- $service: ${previous:-nothing} -> $release"
point_at "$release"
start "$release"

if healthy "$release"; then
  pm2 save
  echo "-- $service runs $(basename "$release")"
  exit 0
fi

# The repo is public: app logs stay on the server
echo "-- Health check failed, see pm2 logs $app on the server"
if [ -z "$previous" ]; then
  echo "-- No previous release to go back to"
  exit 1
fi
echo "-- Rolling back to $(basename "$previous")"
point_at "$previous"
start "$previous"
if healthy "$previous"; then
  pm2 save
else
  echo "-- The previous release isn't healthy either"
fi
exit 1
