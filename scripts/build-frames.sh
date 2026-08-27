#!/usr/bin/env bash
#
# Rebuild the WebP frame sequences the runtime scrubs, and the manifest that
# describes them. Clips and frames are both build output — neither is in git.
#
#   scripts/build-frames.sh
#
# Needs ffmpeg built with libwebp. Source clips are fetched on first run.

set -euo pipefail
cd "$(dirname "$0")/.."

# The approved clips, from _handoff/HANDOFF-CLAUDE-CODE.md. Never regenerate the
# footage itself — only re-derive frames from it.
#   id | filename | source URL
CLIPS=(
  "clip-01|clip-01-vault.mp4|https://d8j0ntlcm91z4.cloudfront.net/user_3DipWZbOvcTwhdi7K6REOedZkQU/hf_20260826_114316_d1f085c5-5fca-423c-8a5e-9d8120344046.mp4"
)

# Frame sets, ascending by width — the runtime picks the first set wide enough
# for the viewport it is drawing into, so this order is load-bearing.
#
# 896 is the widest a phone ever draws at: a portrait viewport contains the 16:9
# frame to its own width, and the runtime caps DPR at 2, so even a 448pt phone
# asks for 896 device pixels. Wider viewports fall through to the desktop set.
#
# The qualities are the highest that stay inside the handoff's per-frame budget
# (90KB desktop, 35KB mobile) at compression_level 6. Measured against the clip
# at the size each set is actually drawn, both beat the frames M0 shipped.
#
#   name | width | webp quality
SETS=(
  "mobile|896|33"
  "desktop|1600|45"
)

COUNT=48   # frames per clip, spread evenly across its full duration

command -v ffmpeg  >/dev/null || { echo "ffmpeg not found" >&2; exit 1; }
command -v ffprobe >/dev/null || { echo "ffprobe not found" >&2; exit 1; }

mkdir -p public/clips public/frames
entries=""

for spec in "${CLIPS[@]}"; do
  IFS='|' read -r id file url <<<"$spec"
  src="public/clips/$file"

  if [ ! -f "$src" ]; then
    echo "fetching $file"
    curl -fsSL "$url" -o "$src.part"
    mv "$src.part" "$src"
  fi

  # The handoff's fps=48/5 assumes a 5s clip; clip-01 is 7.04s and would give 68
  # frames. Deriving the rate from the real duration puts COUNT frames across the
  # whole clip whatever its length, so the scrub always ends where the clip ends.
  duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$src")
  fps=$(awk -v n="$COUNT" -v d="$duration" 'BEGIN { printf "%.10f", n / d }')
  echo "$id: ${duration}s -> $COUNT frames at ${fps}fps"

  sets_json=""
  for set in "${SETS[@]}"; do
    IFS='|' read -r name width quality <<<"$set"
    out="public/frames/$name/$id"
    rm -rf "$out"; mkdir -p "$out"

    ffmpeg -v error -i "$src" -vf "fps=$fps,scale=$width:-2" \
      -c:v libwebp -quality "$quality" -compression_level 6 "$out/%04d.webp"

    made=$(find "$out" -name '*.webp' | wc -l)
    [ "$made" -eq "$COUNT" ] || { echo "$id/$name: got $made frames, wanted $COUNT" >&2; exit 1; }

    dims=$(ffprobe -v error -select_streams v:0 \
      -show_entries stream=width,height -of csv=p=0 "$out/0001.webp")
    w=${dims%%,*}; h=${dims##*,}
    peak=$(find "$out" -name '*.webp' -printf '%s\n' | sort -rn | head -1)
    echo "  $name ${w}x${h}  peak $((peak / 1024))KB/frame"

    [ -n "$sets_json" ] && sets_json+=","
    sets_json+=$(printf '\n        { "name": "%s", "width": %s, "height": %s, "src": "%s/%%04d.webp" }' \
      "$name" "$w" "$h" "$out")
  done

  [ -n "$entries" ] && entries+=","
  entries+=$(printf '\n    {\n      "id": "%s",\n      "count": %s,\n      "sets": [%s\n      ]\n    }' \
    "$id" "$COUNT" "$sets_json")
done

printf '{\n  "clips": [%s\n  ]\n}\n' "$entries" > public/frames/manifest.json
echo "wrote public/frames/manifest.json"
