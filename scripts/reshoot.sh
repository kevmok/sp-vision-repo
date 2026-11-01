#!/bin/sh
# Rebuild the static export, serve ./out on :3311 and capture screenshots.
cd "$(dirname "$0")/.."
lsof -ti tcp:3311 | xargs kill 2>/dev/null
pnpm build > /tmp/sp-build.log 2>&1 || { tail -30 /tmp/sp-build.log; exit 1; }
(python3 -m http.server 3311 -d out > /tmp/sp-pocs-server.log 2>&1 &)
for i in 1 2 3 4 5 6 7 8 9 10; do curl -s -o /dev/null http://localhost:3311/ && break; sleep 1; done
node scripts/screenshots.mjs "$@"
