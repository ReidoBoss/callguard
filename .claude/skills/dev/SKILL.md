---
name: dev
description: Start the Nuxt app in web/ locally on port 3000, reusing it if it's already up, after checking web/.env points at the Gemma endpoint. Use when the user types /dev, or to run the app for a screenshot or a manual check.
disable-model-invocation: true
---

# Run the app locally

If `web/` doesn't exist yet, stop: CLAUDE.md's **Day one** creates it.

## 1. See what's up

```sh
lsof -nP -iTCP:3000 -sTCP:LISTEN
test -f web/.env && grep -cE '^GEMMA_(BASE_URL|MODEL)=.+' web/.env
```

- **3000 is taken:** `curl -s localhost:3000` to see if it's this app, and reuse it. Never
  kill a process you didn't start; ask.
- **No `web/.env` or fewer than 2 lines:** ask the user for ALMA's endpoint and model.
  Don't make one up. Without it the app starts but every AI call fails, so say so.

## 2. Start it

```sh
(cd web && { test -d node_modules || pnpm install --frozen-lockfile; })
(cd web && nohup pnpm run dev > <scratchpad dir>/web.log 2>&1 & echo $! > <scratchpad dir>/web.pid)
for attempt in $(seq 1 60); do
  curl -fs --max-time 5 -o /dev/null http://localhost:3000/ && { echo "web answers"; break; }
  kill -0 "$(cat <scratchpad dir>/web.pid)" 2>/dev/null || { echo "web exited"; tail -40 <scratchpad dir>/web.log; break; }
  sleep 2
done
```

A lockfile `--frozen-lockfile` wants to change is a dependency question: ask.

## 3. Report

The URL, the pid, and how to stop it: `kill $(lsof -ti tcp:3000 -sTCP:LISTEN)`, since
pnpm's own pid leaves Nuxt's server holding the port.
