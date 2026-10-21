# CallGuard

Call-center QA that never leaves the building. CallGuard scores every call against the
script, flags compliance risks like a card number read aloud, and drafts coaching notes,
all on ALMA's local Gemma 4 endpoint, so no call data reaches a public AI API.

Built at FUTURE FORGE: The ALMA Hackathon, Cebu, 2026-10-22.

## Setup

```sh
pnpm install          # git hooks (commitlint, branch names)
cd web && pnpm install && pnpm run dev
```

`web/.env` needs the endpoint ALMA provides; see `CLAUDE.md`, which is also the team's
working agreement (issues, branches, commits, PRs).
