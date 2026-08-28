#!/usr/bin/env bash
#
# Rebuild the WebP frame sequence the runtime scrubs, and the manifest that
# describes it. Clips and frames are both build output — neither is in git.
#
#   scripts/build-frames.sh
#
# The three approved clips are one continuous camera move, so they are joined
# into a single timeline and sampled at one even rate across the whole of it.
# Per-clip frame counts would make the scrub speed change at every join, which
# is the thing joining them without transitions is meant to avoid.

set -euo pipefail
cd "$(dirname "$0")/.."

# In order. Concatenated directly: the joins measure 96% and 94% frame-to-frame
# identical, so no crossfade is wanted — a fade would only blur a match that is
# already there.
CLIPS=(
  "clip-01-vault-open.mp4"
  "clip-02-through-door.mp4"
  "clip-03-plaza-walk.mp4"
)

# Frame sets, ascending by width — the runtime picks the first set wide enough
# for the viewport it draws into, so this order is load-bearing.
#
# 896 is the widest a phone ever draws at: portrait contains the frame to the
# viewport width and the runtime caps DPR at 2, so even a 448pt phone asks for
# 896. 1280 is the width of the narrowest source clip, so nothing is ever scaled
# up — clip 01 comes down from 1920, clips 02 and 03 are already 1280.
#
#   name | width | webp quality
SETS=(
  "mobile|896|33"
  "desktop|1280|60"
)

# Output frames per second of footage. Carried over from the vault clip alone so
# the scrub keeps the density it was tuned at.
RATE=6.8166

# Held frames where the door has just finished opening, before the forward move
# starts. Its own segment: the motion frames keep their even spacing and these
# are added, so the pause does not compress the movement on either side.
HOLD_SECONDS=1.0

for tool in ffmpeg ffprobe python3; do
  command -v "$tool" >/dev/null || { echo "$tool not found" >&2; exit 1; }
done

missing=0
for c in "${CLIPS[@]}"; do
  [ -f "public/clips/$c" ] || { echo "missing public/clips/$c" >&2; missing=1; }
done
if [ "$missing" -ne 0 ]; then
  echo "The approved clips are not in git. Put them in public/clips and re-run." >&2
  exit 1
fi

# --- the joined timeline ---------------------------------------------------
# The fps filter samples the source frame NEAREST each output instant, so an
# output frame can round across a clip join. Everything below therefore works in
# source-frame space rather than in elapsed seconds.
counts=(); total=0; SRC_FPS=""
for c in "${CLIPS[@]}"; do
  n=$(ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of csv=p=0 "public/clips/$c")
  r=$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "public/clips/$c")
  f=$(awk -F/ '{ printf "%.6f", $1 / $2 }' <<<"$r")
  [ -n "$SRC_FPS" ] || SRC_FPS="$f"
  [ "$f" = "$SRC_FPS" ] || { echo "$c runs at ${f}fps, expected ${SRC_FPS} — mixed rates would need per-clip mapping" >&2; exit 1; }
  counts+=("$n")
  d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "public/clips/$c")
  total=$(awk -v a="$total" -v b="$d" 'BEGIN { printf "%.6f", a + b }')
done

read -r COUNT FPS HOLD_AT HOLD_N < <(python3 -c '
import math, sys
total, rate, hold_s, src_fps, first = (float(a) for a in sys.argv[1:6])
count = round(rate * total)
fps = count / total
# Which source frame the resampler actually takes for output frame j. Not
# round(j*src/out): the fps filter maps the MIDPOINT of each output frame
# window, so it is off by one against the obvious guess for every frame. The
# two agree at the joins for the current clips, but they stop agreeing as soon
# as RATE or a clip length changes, and the hold would then land in the wrong
# clip without anything failing.
def src_of(j):
    return math.floor((j + 0.5) * src_fps / fps)

# Last output frame still sampling clip 01 — the settled door the hold sits on.
hold_at = max(j for j in range(count) if src_of(j) < first)
print(count, "%.10f" % fps, hold_at, round(hold_s * fps))
' "$total" "$RATE" "$HOLD_SECONDS" "$SRC_FPS" "${counts[0]}")

printf 'timeline %ss from %d clips -> %d frames at %sfps\n' "$total" "${#CLIPS[@]}" "$COUNT" "$FPS"
printf 'hold on frame %d for %d extra positions (%d total in sequence)\n' \
  "$HOLD_AT" "$HOLD_N" "$((COUNT + HOLD_N))"

# --- the frame sets --------------------------------------------------------
inputs=()
for c in "${CLIPS[@]}"; do inputs+=(-i "public/clips/$c"); done

sets_json=""
for set in "${SETS[@]}"; do
  IFS='|' read -r name width quality <<<"$set"
  out="public/frames/$name"
  rm -rf "$out"; mkdir -p "$out"

  # Scale every clip to the set width first so concat gets one geometry, then
  # resample the joined stream once — that is what makes the spacing even across
  # the joins rather than even within each clip.
  filter=""; labels=""
  for i in "${!CLIPS[@]}"; do
    filter+="[$i:v]scale=$width:-2,setsar=1,format=yuv420p[v$i];"
    labels+="[v$i]"
  done
  filter+="${labels}concat=n=${#CLIPS[@]}:v=1:a=0[cat];[cat]fps=$FPS[out]"

  ffmpeg -v error "${inputs[@]}" -filter_complex "$filter" -map "[out]" -vsync 0 \
    -c:v libwebp -quality "$quality" -compression_level 6 "$out/%04d.webp"

  made=$(find "$out" -name '*.webp' | wc -l)
  [ "$made" -eq "$COUNT" ] || { echo "$name: got $made frames, wanted $COUNT" >&2; exit 1; }

  dims=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height \
    -of csv=p=0 "$out/0001.webp")
  w=${dims%%,*}; h=${dims##*,}
  peak=$(find "$out" -name '*.webp' -printf '%s\n' | sort -rn | head -1)
  printf '  %-8s %sx%s  peak %sKB/frame\n' "$name" "$w" "$h" "$((peak / 1024))"

  [ -n "$sets_json" ] && sets_json+=","
  sets_json+=$(printf '\n      { "name": "%s", "width": %s, "height": %s, "src": "%s/%%04d.webp" }' \
    "$name" "$w" "$h" "$out")
done

# --- the manifest ----------------------------------------------------------
# `map` gives the image index to draw at each scroll position, so the hold costs
# repeated positions rather than repeated files.
built=$(date -u +%Y-%m-%dT%H:%MZ)
python3 -c '
import math, sys
count, hold_at, hold_n = (int(a) for a in sys.argv[1:4])
fps = float(sys.argv[4]); built = sys.argv[5]; src_fps = float(sys.argv[6])
sets_json = sys.argv[7]
counts = [int(a) for a in sys.argv[8:]]
names = ["clip-01-vault-open", "clip-02-through-door", "clip-03-plaza-walk"]

bounds, run = [], 0
for n in counts:
    run += n
    bounds.append(run)

def clip_of(j):
    s = math.floor((j + 0.5) * src_fps / fps)   # see src_of() above
    for i, b in enumerate(bounds):
        if s < b:
            return i
    return len(counts) - 1

order = list(range(count))
mapping = order[:hold_at + 1] + [hold_at] * hold_n + order[hold_at + 1:]

segments, start = [], 0
for j in range(1, count + 1):
    if j == count or clip_of(j) != clip_of(start):
        segments.append((names[clip_of(start)], start, j - start))
        start = j

out, shifted = [], 0
for name, st, span in segments:
    out.append((name, st + shifted, span))
    if st + span - 1 == hold_at:
        out.append(("hold-door-open", st + span + shifted, hold_n))
        shifted += hold_n

seg = ",".join("\n      { \"id\": \"%s\", \"from\": %d, \"count\": %d }" % s for s in out)
print("{\n  \"builtAt\": \"%s\",\n  \"sequence\": {\n    \"frames\": %d,\n    \"count\": %d,"
      "\n    \"fps\": %.4f,\n    \"map\": %s,\n    \"segments\": [%s\n    ],"
      "\n    \"sets\": [%s\n    ]\n  }\n}"
      % (built, count, len(mapping), fps, mapping, seg, sets_json))
' "$COUNT" "$HOLD_AT" "$HOLD_N" "$FPS" "$built" "$SRC_FPS" "$sets_json" "${counts[@]}" > public/frames/manifest.json
echo "wrote public/frames/manifest.json (builtAt $built)"
