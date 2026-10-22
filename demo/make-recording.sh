#!/usr/bin/env bash
# Turns a demo call transcript into a recording to upload (#9), on this Mac: macOS `say`
# speaks each line at its [mm:ss], ffmpeg joins them and pads to the call's DURATION.
# A test recording, not a real call. Recordings never go in git (.gitignore), so run it
# on the demo laptop:
#
#   bash demo/make-recording.sh                          # call 3 → demo/recordings/03-risky.m4a
#   bash demo/make-recording.sh demo/calls/01-good.txt
#
# Not in demo/calls/: that folder is bundled into the server build.
set -euo pipefail

transcript=${1:-"$(dirname "$0")/calls/03-risky.txt"}
out_dir="$(dirname "$0")/recordings"
out="$out_dir/$(basename "$transcript" .txt).m4a"
agent_voice=${AGENT_VOICE:-Daniel}
caller_voice=${CALLER_VOICE:-Samantha}
rate=${RATE:-190}   # words per minute

secs() { echo $((10#${1%%:*} * 60 + 10#${1##*:})); }

duration=$(sed -n 's/^DURATION: *//p' "$transcript")
[[ -n $duration ]] || { echo "No DURATION: line in $transcript" >&2; exit 1; }

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

# Lines as "seconds<TAB>speaker<TAB>text"
grep -E '^\[[0-9]+:[0-9]{2}\] (AGENT|CALLER): ' "$transcript" \
  | sed -E 's/^\[([0-9:]+)\] ([A-Z]+): /\1\t\2\t/' \
  | while IFS=$'\t' read -r time speaker text; do printf '%s\t%s\t%s\n' "$(secs "$time")" "$speaker" "$text"; done \
  > "$work/lines.tsv"

# Each clip is padded to the next line's start (the last to DURATION), so it lands on its timestamp
ends=$( (cut -f1 "$work/lines.tsv" | tail -n +2; secs "$duration") )
paste "$work/lines.tsv" <(echo "$ends") > "$work/slots.tsv"

n=0
while IFS=$'\t' read -r start speaker text end; do
  n=$((n + 1))
  voice=$caller_voice; [[ $speaker == AGENT ]] && voice=$agent_voice
  say -v "$voice" -r "$rate" -o "$work/$n.aiff" "$text"
  slot=$((end - start))
  spoken=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$work/$n.aiff")
  # A line that runs past its slot is sped up to fit, up to 1.6x
  tempo=$(awk -v a="$spoken" -v b="$slot" 'BEGIN { t = a / (b - 0.2); print (t > 1 ? t : 1) }')
  if awk -v t="$tempo" 'BEGIN { exit !(t > 1.6) }'; then
    echo "Line at ${start}s takes ${spoken}s but has ${slot}s before the next line" >&2
    exit 1
  fi
  ffmpeg -hide_banner -loglevel error -y -i "$work/$n.aiff" -ar 16000 -ac 1 \
    -af "atempo=$tempo,apad=whole_dur=$slot" -c:a pcm_s16le "$work/$n.wav"
  echo "file '$work/$n.wav'" >> "$work/list.txt"
done < "$work/slots.tsv"

mkdir -p "$out_dir"
ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "$work/list.txt" -c:a aac -b:a 64k "$out"
echo "$out ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out")s)"
