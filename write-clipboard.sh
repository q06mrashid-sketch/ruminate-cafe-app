#!/usr/bin/env zsh
set -euo pipefail

dest="${1:-}"

if [[ -z "$dest" ]]; then
  printf "Target path (e.g. src/screens/HomeScreen.js): "
  read -r dest
fi

if [[ -z "$dest" ]]; then
  echo "No path provided."
  exit 1
fi

mkdir -p "$(dirname "$dest")"

if [[ -f "$dest" ]]; then
  ts="$(date +%Y%m%d-%H%M%S)"
  cp "$dest" "$dest.bak.$ts"
fi

pbpaste > "$dest"
echo "Wrote: $dest"
