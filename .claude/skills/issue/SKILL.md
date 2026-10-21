---
name: issue
description: File a GitHub issue with a tagged title and a user story or Overview body, after showing it to the user. Use when the user types /issue, or when work needs an issue number before /branch.
argument-hint: "[what the issue is about]"
model: sonnet
---

# File an issue

The title tags are in CLAUDE.md under **Commits, branches, and pull requests**. Nothing
is created until the user has seen it.

## 1. Check for a duplicate

```sh
gh issue list --state all --search '<a few words from $ARGUMENTS>' --json number,title,state
```

Show any likely duplicate and ask before filing another.

## 2. Ask once

The tag, always asked: `[USER]` for something a QA lead or call agent sees, otherwise
`[NFR]`, `[AI]`, `[UI]`, `[DOCS]` or `[DEMO]`, plus a new one through Other. For a
feature, also whatever the user hasn't said about the story or the acceptance criteria.

## 3. Write it, show it

Title: `<tag> <short name>`, e.g. `[USER] Score a call against the script checklist`.

A feature's body:

```markdown
As a <QA lead | call agent>, I want <something> so that <why>.

## Acceptance criteria

- [ ] <one checkable thing>
```

Anything else:

```markdown
**Overview**: **As a** developer **I will** <do it> **so that** <why>
```

Show title and body, wait for an OK.

## 4. Create it

```sh
gh issue create --title '<title>' --body-file <file> [--attach '<image>#<alt text>']
```

Report the URL and number; the number is what `/branch` takes next.
