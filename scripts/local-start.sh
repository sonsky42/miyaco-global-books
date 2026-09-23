#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for tool in node pnpm mops dfx; do
  command -v "$tool" >/dev/null || { echo "Missing $tool. See docs/local-testing.md"; exit 1; }
done
if [[ "$(uname -s)" != "Linux" && "$(uname -s)" != "Darwin" ]]; then
  echo 'Run this script inside Ubuntu/WSL, not Windows PowerShell.'
  exit 1
fi
pnpm install --frozen-lockfile
mops install
dfx start --background
# Every deployment is explicitly LOCAL. Never use --clean or --mode reinstall here.
dfx deploy internet_identity --network local --argument '(null)'
dfx deploy backend --network local
echo 'LOCAL TEST ONLY: open http://localhost:5173 and create a test identity/book.'
echo 'No live accounting data is connected. Stop the frontend with Ctrl+C.'
cd src/frontend
pnpm exec vite --config vite.local.config.js --host 127.0.0.1 --port 5173 --strictPort
