# CallGuard

Call-center QA that never leaves our hardware. CallGuard reads call recordings or
transcripts, scores each agent against a script checklist (greeting, identity check,
required disclosures), flags compliance risks such as a full card number read aloud, and
drafts coaching notes. Built in one day at FUTURE FORGE: The ALMA Hackathon (2026-10-22,
10 AM to 6 PM, Cebu) on Gemma 4, served by Ollama from our own Mac mini.

**The pitch is privacy, so the code has to keep it.** Call data goes to our Gemma
endpoint and nowhere else: no OpenAI, Anthropic, Google or other hosted AI API, no
third-party transcription service, no analytics. A feature that needs an outside API is
asked about first, because it breaks the demo's whole argument.

| Path | Stack | Notes |
|---|---|---|
| `web/` | Nuxt 4, Tailwind 4, shadcn-vue | The whole app. UI in `web/app/`, Nitro server routes in `web/server/api/` call Gemma. Its own pnpm project. Not scaffolded yet, see **Day one** |
| `demo/` | Plain text | The demo calls, the script checklist and the answer key (#3): what each AI feature should return. The app reads them from here |
| `web/server/` | Nitro (Nuxt's server) | The only code that talks to Gemma. The browser never calls the endpoint directly |
| Transcription | Not decided | Gemma 4 audio input if our Ollama endpoint accepts it, otherwise a local whisper.cpp CLI called from a server route, otherwise pasted transcripts. Decide after probing the endpoint (`/gemma`) |

The root holds only husky and commitlint. `pnpm install` at the root does not install
`web/`'s dependencies; install from inside `web/`.

## Day one

The event rule is "bring an idea, not code", so the app is created on the day:

```sh
pnpm create nuxt@latest web          # pick pnpm, no git init (the repo already has one)
cd web && pnpm dlx shadcn-vue@latest init
```

Then fill in **Commands** below with what `web/package.json` actually has, in the same
commit.

## Package manager: pnpm only

pnpm is pinned via `packageManager` in every `package.json`. Never `npm install` or
`yarn`: they write a lockfile nothing else reads.

## Commands

```sh
pnpm install                 # at the root: installs the git hooks via `prepare`
cd web && pnpm install       # the app's own dependencies
cd web && pnpm run dev       # http://localhost:3000
cd web && pnpm run build     # SSR build and imports. Not types
cd web && pnpm exec nuxi typecheck   # the only thing that checks types
```

## Environment

Gemma 4 runs in Ollama on the Mac mini, bound to `127.0.0.1:11434` only, so nothing is
exposed to the internet. The laptop reaches it through an SSH tunnel that hops via the VPS;
`personal-vps` and `macmini` are `~/.ssh/config` entries. The VPS only relays the
encrypted SSH stream, so it never sees call data.

The models live on the Mac mini's external drive (`~/.ollama/models` links to
`/Volumes/Dev/ollama/models`). A launchd service can't read that drive until someone
clicks Allow on the Mac mini's screen, so Ollama runs from SSH instead and doesn't come
back after a reboot. A shortcut. Start it when `curl` below gets no answer:

```sh
ssh -J personal-vps macmini 'pgrep -f "ollama serve" || OLLAMA_HOST=127.0.0.1:11434 \
  OLLAMA_KEEP_ALIVE=-1 OLLAMA_FLASH_ATTENTION=1 OLLAMA_KV_CACHE_TYPE=q8_0 nohup \
  /opt/homebrew/opt/ollama/bin/ollama serve > /Volumes/Dev/ollama/serve.log 2>&1 < /dev/null &'
```

`OLLAMA_KEEP_ALIVE=-1` keeps a model in memory once loaded, because the first load from
the USB drive takes minutes. Load one before the demo with a throwaway prompt.

Start the tunnel, or restart it when it drops:

```sh
pkill -f 'L 11434:localhost:11434'   # only when restarting a dead tunnel
ssh -f -N -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 \
  -L 11434:localhost:11434 -J personal-vps macmini
curl -s localhost:11434/v1/models    # answers once the tunnel is up
```

`web/.env` (gitignored) points at the tunnel's end:

```sh
GEMMA_BASE_URL=http://localhost:11434/v1   # OpenAI-compatible base URL, ends in /v1
GEMMA_MODEL=gemma4:e4b                     # or gemma4:12b: slower, and only one fits in RAM at a time
```

Never a `:cloud` tag (`gemma4:cloud`, `gemma4:31b-cloud`): those run on Ollama's servers.

Read them through `useRuntimeConfig()` on the server, never `NUXT_PUBLIC_*`, so the
endpoint isn't shipped to the browser. How to call it is in `.claude/skills/gemma/`.

## Commits, branches, and pull requests

[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), enforced by
commitlint in the `commit-msg` hook. The issue number goes in the scope: `feat(#3):`.

**No `Co-Authored-By` trailers and no generated-by footer**, in commits or PR bodies.

**The issue comes first.** Its number is what the branch, every commit and the PR carry,
so work without one starts with `/issue`. Titles take a tag: `[USER]` for something a QA
lead or agent sees, otherwise `[NFR]`, `[AI]`, `[UI]`, `[DOCS]` or `[DEMO]`.

Branches are `<type>/#<issue-number>`, the type one of `feature`, `bugfix`, `hotfix`,
`docs`, e.g. `feature/#4`. `pre-push` refuses any other name; `main` is exempt.

PRs target `main` and are squash-merged, so the title becomes the commit:
`<type>(#<issue>): <subject>`. The body is short: what and why, the commands you ran and
what they said, a screenshot for anything visible, what you left out, `Closes #<n>`.
Never `--no-verify`.

## Ask before doing

- **Dependencies.** A new entry in any `package.json`. Propose it and wait.
- **External services.** Anything that sends data off the machine or off our Gemma endpoint.
- **Git.** Never commit, branch, push or open a PR unless told to.
- **AI instructions.** `CLAUDE.md`, `AGENTS.md` and `.claude/**`: ask what they leave
  open, with AskUserQuestion, before pushing a change to them.

Ask in one round, not a drip. A question with a conventional default isn't worth asking:
take the default and say so. A yes covers what was asked, not what comes next.

**Codex questions.** Ask through an interactive input tool, and keep each question pending
until the user explicitly answers it; a preselected choice or elapsed time is not an
answer. Don't carry on with work that depends on an unanswered question.

## Working on code

It's a hackathon: the demo at 6 PM is the deliverable. Prefer the smallest change that
makes the demo work, and say so when something is a shortcut.

Every changed line traces to the request. Don't refactor neighbours. Remove what your own
change orphaned.

State `step → verify` before multi-step work:

| To actually verify | Run |
|---|---|
| types | `cd web && pnpm exec nuxi typecheck` |
| SSR build and imports | `cd web && pnpm run build` |
| a Gemma prompt returns valid JSON | the `curl` in `.claude/skills/gemma/SKILL.md` against the real endpoint |
| the page works | `/dev`, then load it; a screenshot for the PR |

## RTK

`.claude/hooks/rtk.sh` rewrites shell commands to their [rtk](https://github.com/rtk-ai/rtk)
equivalents to trim output. Install `v1.0.1`
(`cargo install --locked --git https://github.com/rtk-ai/rtk --tag v1.0.1 rtk`); without it
the hook does nothing. Never `rtk init -g` for Claude Code as well, or commands are
rewritten twice. `RTK_DISABLED=1 claude` turns it off for a session.

**Codex** reads none of `.claude/`, so it gets rtk from a global hook instead. Once per
machine, outside Codex, with rtk and `jq` installed:

```sh
bash .claude/hooks/setup-codex-rtk.sh
```

It runs `rtk init -g --codex`, which registers rtk's native `rtk hook codex` in
`${CODEX_HOME:-~/.codex}/hooks.json`, and re-running it keeps one hook. If SKLoud Aurora's
Codex adapter is already installed, it does nothing: that adapter already hands CallGuard
to the same native hook, and a second hook would rewrite every command twice. Restart
Codex, enable hooks (`codex --enable hooks`) and trust the hook when asked; a plain
`git status` should then come back as rtk's compact status. `RTK_DISABLED=1 codex` turns
it off for a session.

## Skills

Steps live in `.claude/skills/`: `/issue`, `/branch`, `/commit`, `/pr`, `/verify`, `/dev`,
`/gemma`, and `/develop <n>`, which works one issue end to end through `/branch` →
`/verify` → `/commit` → `/pr`, each commit and PR behind a yes. The rules live here, so a
rule changes in one place.

`AGENTS.md` is a symlink to this file, so Codex and other agents that never read
`.claude/` still get every rule. `.agents/skills` is a symlink to `.claude/skills`, so
agents that load skills from the shared `.agents/skills/` location get the same ones.
Edit them under `.claude/skills/`; there is no second copy to keep in step. Where a skill
says AskUserQuestion, another agent uses its own interactive question tool.
