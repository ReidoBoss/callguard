---
name: branch
description: Create a branch named <type>/#<issue-number> from an up-to-date main. Use when the user asks to start work on an issue or to create a branch.
argument-hint: "<type> <issue-number>"
---

# Create a branch

The naming rule is in CLAUDE.md under **Commits, branches, and pull requests**. Only run
this when the user asked.

1. **Type and issue** from `$ARGUMENTS` (`feature 4`, `bugfix #7`). If either is missing,
   ask for both at once. Types are `feature`, `bugfix`, `hotfix`, `docs` only.
2. **Check first:**

   ```sh
   git status --short
   git fetch origin
   git branch --list '<type>/#<n>'
   git ls-remote --heads origin '<type>/#<n>'
   ```

   If it exists, offer to switch to it. Uncommitted changes come along: say so.
3. **Create from main**, quoting the name (`#` globs in zsh):

   ```sh
   git switch -c '<type>/#<n>' origin/main
   ```

4. **Report** the name and `git log -1 --oneline`. Don't push; `/pr` does that.
