#!/usr/bin/env bash
# Codex reads none of .claude/, so this gives it rtk the way rtk.sh gives Claude
# Code. Run once per machine, outside Codex, from the repo root:
#   bash .claude/hooks/setup-codex-rtk.sh
# It installs rtk's own global Codex hook (`rtk hook codex`), unless SKLoud
# Aurora's adapter is already installed: that one hands every non-Aurora repo,
# CallGuard included, to the same native hook, and a second hook would rewrite
# each command twice.
set -euo pipefail

command -v jq >/dev/null || { echo 'jq is required' >&2; exit 1; }
[[ "$(rtk --version 2>/dev/null)" == 'rtk 1.0.1' ]] ||
  { echo 'Install rtk v1.0.1 as CLAUDE.md says under RTK' >&2; exit 1; }

codex_dir=${CODEX_HOME:-"$HOME/.codex"}
hooks="$codex_dir/hooks.json"

if [[ -f "$hooks" ]] && grep -q 'aurora-rtk/codex-rtk.sh' "$hooks"; then
  echo "Aurora's Codex rtk hook is already in $hooks; it covers CallGuard too. Nothing to do."
  exit 0
fi

rtk init -g --codex
jq -e '[.hooks.PreToolUse[]?.hooks[]?.command | select(test("rtk.* hook codex"))] | length == 1' \
  "$hooks" >/dev/null || { echo "Expected exactly one rtk hook in $hooks; check it by hand" >&2; exit 1; }

echo "Installed rtk's Codex hook in $hooks."
echo 'Restart Codex, enable hooks with `codex --enable hooks` if needed, and trust the hook when prompted.'
echo 'Check: ask Codex to run `git status`; the output should be rtk'"'"'s compact status.'
echo 'Session opt-out: RTK_DISABLED=1 codex'
