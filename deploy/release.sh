#!/usr/bin/env bash
# Prepares a release that the Deploy workflow uploaded to ~/pumpking/releases/<sha>:
# links the env files, installs dependencies and migrates the prod database.
# Usage: release.sh <sha>
set -euo pipefail

cd ~/pumpking/releases/"$1"

# A re-run for the same commit: don't reinstall under a service that already runs it
if [ -f .ready ]; then
  echo "Already prepared"
  exit 0
fi

ln -sfn ~/pumpking/shared/core.env packages/core/.env
ln -sfn ~/pumpking/shared/api.env packages/api/.env
ln -sfn ~/pumpking/shared/ingest.env packages/ingest/.env
ln -sfn ~/pumpking/shared/bot.env packages/bot/.env

npm ci
npm run migrate:latest --prefix packages/core
touch .ready

# Keep the 5 newest releases, and the ones the services run
in_use=$(readlink ~/pumpking/api ~/pumpking/ingest ~/pumpking/bot || true)
for release in $(ls -dt ~/pumpking/releases/* | tail -n +6); do
  if ! grep -qF "$release" <<< "$in_use"; then
    echo "Removing $release"
    rm -rf "$release"
  fi
done
