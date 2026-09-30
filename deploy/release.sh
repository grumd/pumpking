#!/usr/bin/env bash
# Prepares this release directory (~/pumpking/releases/<sha>) for the services: links the
# shared env files in and installs the dependencies, then prunes old releases. Run over SSH
# by the Deploy workflow, once per commit, before any service switches to it.
# See "Build and release" in docs/python-api-migration/PLAN.md
set -euo pipefail

release=$(cd "$(dirname "$0")/.." && pwd -P)
root=$(dirname "$(dirname "$release")")
cd "$release"

[ -f "$root/shared/core.env" ] || { echo "shared/core.env is missing"; exit 1; }

# shared/<package>.env becomes packages/<package>/.env
for env in "$root"/shared/*.env; do
  package=$(basename "$env" .env)
  if [ -d "packages/$package" ]; then
    ln -sfn "$env" "packages/$package/.env"
  else
    echo "-- Skipping shared/$package.env: there's no packages/$package"
  fi
done

echo "-- Installing dependencies"
HUSKY=0 npm ci
touch .release-ready

# Keep the 5 newest releases, and any release a service still points at
linked=$(find "$root" -maxdepth 1 -type l -exec readlink -f {} \;)
ls -1td "$root"/releases/*/ | tail -n +6 | while read -r old; do
  old=${old%/}
  if ! grep -qxF "$old" <<<"$linked"; then
    echo "-- Removing releases/$(basename "$old")"
    rm -rf "$old"
  fi
done
