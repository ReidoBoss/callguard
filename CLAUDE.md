# CallGuard

Call-center QA that never leaves the building. CallGuard reads call recordings or
transcripts, scores each agent against a script checklist (greeting, identity check,
required disclosures), flags compliance risks such as a full card number read aloud, and
drafts coaching notes. Built in one day at FUTURE FORGE: The ALMA Hackathon (2026-10-22,
10 AM to 6 PM, Cebu) on ALMA's local Gemma 4 endpoint.

**The pitch is privacy, so the code has to keep it.** Call data goes to the ALMA Gemma
endpoint and nowhere else: no OpenAI, Anthropic, Google or other hosted AI API, no
third-party transcription service, no analytics. A feature that needs an outside API is
asked about first, because it breaks the demo's whole argument.

| Path | Stack | Notes |
|---|---|---|
| `web/` | Nuxt 4, Tailwind 4, shadcn-vue | The whole app. UI in `web/app/`, Nitro server routes in `web/server/api/` call Gemma. Its own pnpm project. Not scaffolded yet, see **Day one** |
| `web/server/` | Nitro (Nuxt's server) | The only code that talks to Gemma. The browser never calls the endpoint directly |
| Transcription | Not decided | Gemma 4 audio input if ALMA's endpoint accepts it, otherwise a local whisper.cpp CLI called from a server route, otherwise pasted transcripts. Decide after probing the endpoint (`/gemma`) |

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

`web/.env` (gitignored) holds the endpoint ALMA hands out before the event:

```sh
GEMMA_BASE_URL=http://<alma-host>/v1   # OpenAI-compatible base URL, ends in /v1
GEMMA_MODEL=<model id from GET /v1/models>
```

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
- **External services.** Anything that sends data off the machine or off ALMA's endpoint.
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
