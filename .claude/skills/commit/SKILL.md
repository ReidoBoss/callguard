---
name: commit
description: Commit staged changes as a Conventional Commit with the issue number in the scope and no Co-Authored-By trailer, per CLAUDE.md. Use when the user asks to commit.
argument-hint: "[message or hint]"
model: sonnet
---

# Commit

The rules are in CLAUDE.md under **Commits, branches, and pull requests**. If anything
here disagrees, CLAUDE.md wins. Only run this when the user asked. A commit is not a push.

## 1. See what would go in

```sh
git status --short
git diff --staged
git branch --show-current
```

- **Nothing staged:** propose which files to stage and wait. Never `git add -A` or
  `git add .` without looking: that's how `.env` and build output get committed.
- **More than one concern staged:** propose splitting it.

## 2. Find the issue number

From the branch: `feature/#4` → `#4`. On `main` or any other name, ask.

## 3. Write and commit

`<type>(#<issue>): <subject>`: type is `feat`, `fix`, `docs`, `refactor`, `test`, `chore`,
`style`, `perf`, `build` or `ci`; subject imperative, lowercase, no period, under ~72
characters. A body only for what the diff can't show. **No trailers of any kind.**
`$ARGUMENTS`, if given, is the user's wording: keep its meaning, fix the format.

```sh
git commit -F - <<'EOF'
<type>(#<issue>): <subject>
EOF
```

If a hook fails, the commit didn't happen: fix the cause and commit again. Never
`--amend` to recover, never `--no-verify`.

## 4. Report

`git log -1 --stat`: the message and the files. Don't push.
