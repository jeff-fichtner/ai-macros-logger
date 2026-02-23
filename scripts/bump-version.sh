#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ] || { [ "$1" != "major" ] && [ "$1" != "minor" ]; }; then
  echo "Usage: $0 <major|minor>"
  exit 1
fi

BUMP_TYPE="$1"
VERSION_FILE="$(git rev-parse --show-toplevel)/version.json"

if [ ! -f "$VERSION_FILE" ]; then
  echo "Error: version.json not found at repo root"
  exit 1
fi

VERSION=$(jq -r '.version' "$VERSION_FILE")
MAJOR=$(echo "$VERSION" | cut -d. -f1)
MINOR=$(echo "$VERSION" | cut -d. -f2)

if [ "$BUMP_TYPE" = "major" ]; then
  MAJOR=$((MAJOR + 1))
  MINOR=0
else
  MINOR=$((MINOR + 1))
fi

NEW_VERSION="${MAJOR}.${MINOR}.0"
jq --arg v "$NEW_VERSION" '.version = $v' "$VERSION_FILE" > "${VERSION_FILE}.tmp" && mv "${VERSION_FILE}.tmp" "$VERSION_FILE"

git add "$VERSION_FILE"
git commit -m "chore: bump version to ${NEW_VERSION}"

echo "Version bumped: ${VERSION} → ${NEW_VERSION}"
