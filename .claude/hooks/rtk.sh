#!/usr/bin/env bash
# PreToolUse hook on Bash, adapted from SKLoud Aurora. It hands every
# command to `rtk rewrite`, which picks the rtk equivalent (`git status` becomes
# `rtk git status`) and reads the same allow, ask and deny rules Claude Code does:
#   0  rewritten, and an allow rule matched: approve it
#   2  a deny matched: with a message, rtk's own rule blocks it, so block it with
#      that message; without one, Claude Code's own deny rule handles it
#   3  rewritten, but an ask rule or no rule matched: in bypass mode, rewrite it.
#      In any other mode run it unchanged, since `rtk git status` would lose the
#      read-only auto-approval `git status` gets and ask every time
#   anything else: no rtk equivalent, run it unchanged
# Without rtk 1.0.1 or later or jq on PATH, or with RTK_DISABLED=1 in the
# session's environment, every command runs unchanged.
set -uo pipefail

input=$(cat)

pass() { echo '{}'; exit 0; }

[[ "${RTK_DISABLED:-}" == 1 ]] && pass
command -v rtk >/dev/null && command -v jq >/dev/null || pass

# Before 1.0.1, `rtk rewrite` can exit 0 without checking any allow rule, and
# this hook approves every exit 0.
version=$(rtk --version 2>/dev/null) || pass
version=${version#rtk }
IFS=. read -r major minor patch <<<"${version%% *}"
patch=${patch%%[!0-9]*}
[[ "$major" =~ ^[0-9]+$ && "$minor" =~ ^[0-9]+$ && "$patch" =~ ^[0-9]+$ ]] || pass
((major > 1 || (major == 1 && (minor > 0 || patch >= 1)))) || pass

cmd=$(jq -r '.tool_input.command // empty' <<<"$input")
mode=$(jq -r '.permission_mode // empty' <<<"$input")
[[ -n "$cmd" ]] || pass

# A command that runs any of these, anywhere in a chain, stays as written:
#   cargo or pnpm: a check keeps its full failures
#   cat, head or tail: `rtk read` would get past the Read deny rules in
#   settings.json, which Claude Code applies to these by the path they read
start='(^|[;&|(]) *([A-Za-z_][A-Za-z0-9_]*=[^ ]* +)*(rtk +)?'
[[ "$cmd" =~ ${start}(cargo|pnpm|cat|head|tail)( |$) ]] && pass

# RTK_REWRITE_HOST relaxes rtk's approval gate, so an inherited one must not
# reach it, the same as rtk's own Claude Code hook does.
rewritten=$(env -u RTK_REWRITE_HOST rtk rewrite "$cmd" 2>/dev/null)
status=$?

if [[ $status == 2 && -n "$rewritten" ]]; then
  jq --arg reason "$rewritten" '{hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: $reason
  }}' <<<"$input"
  exit 0
fi

[[ -n "$rewritten" && "$rewritten" != "$cmd" ]] || pass

case $status in
  0) allow=true ;;
  3) [[ "$mode" == bypassPermissions ]] || pass; allow=false ;;
  *) pass ;;
esac

jq --arg command "$rewritten" --argjson allow "$allow" '{hookSpecificOutput: ({
  hookEventName: "PreToolUse",
  updatedInput: (.tool_input + {command: $command})
} + if $allow then {
  permissionDecision: "allow",
  permissionDecisionReason: "rtk rewrite, allowed by a permission rule"
} else {} end)}' <<<"$input"
