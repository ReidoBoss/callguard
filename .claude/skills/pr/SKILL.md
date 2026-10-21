---
name: pr
description: Open a pull request into main with a commitlint-valid title and a short, dense body, after asking what can't be read from the branch. Use when the user asks to open, create or draft a PR.
argument-hint: "[issue-number]"
---

# Open a pull request

The rules are in CLAUDE.md under **Commits, branches, and pull requests**. Only run this
when the user asked.

## 1. Read the branch

```sh
git status --short
git branch --show-current
git fetch origin
git log --oneline origin/main..HEAD
git diff --stat origin/main...HEAD
```

Stop if there are uncommitted changes (offer `/commit`) or no commits ahead of `main`.

## 2. Ask once

One AskUserQuestion round, skipping what's settled: which issue it closes (the branch
usually says), whether it needs a screenshot and of what (offer to take it on `/dev`),
anything deliberately left out, draft or ready. "Just write it" means skip this and note
the assumptions in the body.

## 3. Write it

Title: `<type>(#<issue>): <subject>`, checked with
`printf '%s\n' "<title>" | pnpm exec commitlint`.

Body, in a scratch file, under ~15 lines:

```markdown
## What and why

## Verification
<the commands that ran in this session and what they printed; never "tested locally">

## Screenshots
<delete the heading if nothing is visible>

## Left out

Closes #<issue>
```

No `Co-Authored-By`, no generated-by footer.

## 4. Show it, then open it

Show the title and body, wait for an OK, then:

```sh
git push -u origin HEAD
gh pr create --base main --title "<title>" --body-file <file> [--draft] \
  [--attach '<image>#<alt text>']
```

Run it from the directory holding the body and images, and reference each image as
`![<alt text>](./<image>)` so `--attach` puts it in place.

## 5. Report

The PR URL, draft or not, and what's still the user's to do.
