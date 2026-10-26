#!/usr/bin/env bash
# Assemble the GitHub Pages site: the radar's public files (API, team page) + the pre-rendered demo website.
#   scripts/assemble-pages.sh <radar docs/ folder> <output folder>
# The demo must already be built (npm run build). The demo's index.html becomes the home page; every API file keeps
# its URL. Pre-render data copies of the pictures (*.jpg.data / *.png.data) are never requested and are left out.
set -euo pipefail
docs="${1:?radar docs folder}"; out="${2:?output folder}"
here="$(cd "$(dirname "$0")/.." && pwd)"
base="${PAGES_BASE:-/oman-events-radar/}"; base="${base#/}"; base="${base%/}"
rm -rf "$out" && mkdir -p "$out"
cp -R "$docs"/. "$out"/
rsync -a --exclude "$base" "$here/build/client/" "$out/"
rsync -a --exclude '*.jpg.data' --exclude '*.png.data' "$here/build/client/$base/" "$out/"
touch "$out/.nojekyll"   # serve _.data and folders as they are
echo "assembled $(find "$out" -type f | wc -l | tr -d ' ') files in $out"
