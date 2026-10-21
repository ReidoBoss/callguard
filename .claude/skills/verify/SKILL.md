---
name: verify
description: State step → verify before multi-step work, naming the command from CLAUDE.md's verify table that proves each step. With no task, run the rows the current diff touches in a subagent and return only results and failures. Use before multi-step changes and before calling a change finished.
argument-hint: "[task]"
context: fork
background: false
---

# Verify

The table lives in CLAUDE.md under **Working on code**. This skill applies it.
**A change is finished when its row passes, not when it looks right.**

This runs in its own subagent and can't see the calling conversation: read whatever the
task names (`gh issue view <n>`, a file) here.

## With a task: plan

Break `$ARGUMENTS` into steps, each with the command that proves it:

```text
1. Add POST /api/score          → curl it on /dev with a sample transcript
2. Show the score card          → pnpm exec nuxi typecheck; screenshot
```

Take commands from the table; a build is not a type check. If no row covers a step, say
so and suggest the closest real evidence. Mark steps on CLAUDE.md's "Ask before doing"
list. Return the plan and edit nothing.

## With no task: check the diff

```sh
git status --short
git diff --stat
git diff --staged --stat
```

Run every row the changed paths touch. A Gemma prompt that changed gets the real-endpoint
`curl` from `.claude/skills/gemma/SKILL.md`; if `GEMMA_BASE_URL` isn't set, report it
unverified rather than inventing one.

## Report

One line per command: what ran, pass or fail, and on failure the lines that matter. No
passing output. Anything with no row is listed as unverified.
