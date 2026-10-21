---
name: develop
description: "Work one issue end to end by running the other skills in order: read the issue, /branch, plan with /verify, implement, check with /verify, then /commit and /pr, each behind a yes. Use only when the user types /develop with an issue number."
argument-hint: "<issue-number>"
disable-model-invocation: true
---

# Develop an issue

This skill is the order to run the others in. The rules are in CLAUDE.md, and each step is
a skill that already applies them; if anything here disagrees, they win.

**Typing `/develop` is a yes to the branch and the code changes, nothing more.** The
commit and the PR each wait for their own yes. A new dependency or an external service
still stops the work, per CLAUDE.md's "Ask before doing".

## 1. Read the issue

Take the number from `$ARGUMENTS`; if there is none, ask, or offer `/issue`.

```sh
gh issue view <n> --json number,title,body,state
git status --short
git branch --show-current
```

Stop and say so if the issue is closed, a feature has no checkable acceptance criteria,
or the tree has uncommitted changes that aren't this issue's. If the work calls Gemma and
`web/.env` has no `GEMMA_BASE_URL`, ask for it now rather than halfway through.

Ask in one round whatever is still open: the branch type when the title doesn't make it
plain (`[USER]` is `feature`, `[DOCS]` is `docs`, a defect is `bugfix`).

## 2. Branch

`/branch <type> <n>`. If it already exists, switch to it and carry on from what's there.

## 3. Plan

Run `/verify` with the issue's work as the task. It runs in a subagent that can't see this
conversation, so name the issue number and anything step 1 settled.

The plan opens with **one line per acceptance criterion**, in the issue's wording:
`<criterion> → <command>`, or `<criterion> → by hand: <how>`. Step 7 repeats these lines.
Show it and carry straight on unless a step waits for a yes.

## 4. Implement

One plan step at a time, running its command before the next. Prompts and Gemma calls
follow `.claude/skills/gemma/SKILL.md`. Keep to the issue: anything else you notice goes
in the report, not the diff. It's a hackathon, so the smallest change that makes the demo
work wins; say when something is a shortcut.

## 5. Check

Run `/verify` with no task, so it checks the whole diff. If anything fails, stop and
report it; a failure you think is false is still the user's call. Any edit after this
check sends you back to its start.

## 6. Gates: commit, then PR

Show the files you'd stage (`git status --short -uall`) and the message, and wait for a
yes, then `/commit`. Then ask whether to open the PR; on a yes, `/pr`, which does the only
push.

## 7. Report

- The branch, the commits, and the PR URL if one was opened.
- Step 3's criterion lines, repeated exactly, each marked **passed** (with what ran),
  **unverified** (with why), or **checked by hand** (with how).
- Anything noticed but left alone, with an offer to file it through `/issue`.
