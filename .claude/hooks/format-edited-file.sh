#!/usr/bin/env bash
# PostToolUse hook on Edit|Write. Runs web/'s own eslint --fix on the file just
# edited, when it's a source file under web/ and eslint is installed there. It
# stays silent and never blocks: whatever it can't fix is left for lint to report.
set -uo pipefail

file=$(jq -r '.tool_input.file_path // empty')
[ -f "$file" ] || exit 0

# The file's own checkout, not $CLAUDE_PROJECT_DIR, which stays on the main
# checkout when the edit is in a worktree.
root=$(git -C "$(dirname "$file")" rev-parse --show-toplevel 2>/dev/null) || exit 0
eslint="$root/web/node_modules/.bin/eslint"
[ -x "$eslint" ] || exit 0

case "$file" in
  "$root"/web/node_modules/* | "$root"/web/.nuxt/* | "$root"/web/.output/*) ;;
  "$root"/web/*.ts | "$root"/web/*.vue | "$root"/web/*.js | "$root"/web/*.mjs)
    (cd "$root/web" && "$eslint" --fix "$file") >/dev/null 2>&1
    ;;
esac
exit 0
