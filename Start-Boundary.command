#!/bin/zsh
cd "$(dirname "$0")" || exit 1
if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js and npm are required. Install a maintained Node LTS release, then run this launcher again."
  read "?Press Return to close."
  exit 1
fi
if [ ! -d node_modules ]; then
  npm ci || exit 1
fi
npm run dev
