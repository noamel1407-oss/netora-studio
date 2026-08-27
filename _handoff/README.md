# Depth parallax test — hero scene

One scene, no video, no credits. The question it answers: does a depth-warped still,
pushed by scroll, feel like walking?

## Run it

1. Put the clean hero frame in this folder as `hero.png`.
2. Make its depth map:
   ```
   pip install torch torchvision transformers pillow
   python make_depth.py hero.png
   ```
   That writes `hero-depth.png`.
3. Serve the folder (a file:// URL will not load the textures):
   ```
   python -m http.server 8000
   ```
4. Open `http://localhost:8000` and scroll. On a phone, use your computer's LAN
   address so you can judge it on the screen it is built for.

## Tuning

Tap **כיוונון** at the bottom to open four sliders:

- **עומק** — how far the image is pushed apart in Z. Too low reads as a flat zoom.
  Too high tears at building edges. The sweet spot is usually where the near
  planters separate from the colonnade without visible smearing.
- **קדימה** — how far the camera walks over the full scroll.
- **הצידה** — lateral drift. Even a small amount kills the axial-zoom feeling.
- **החלקה** — how tightly the camera follows the scroll. Lower is looser.

Write down the four numbers that feel right. They go straight into the build.

## What to judge

- Do the near planters and column bases slide faster than the buildings, and the
  buildings faster than the spire? That difference is the whole point.
- Does anything smear or tear at the edges of the columns? If so, lower **עומק**
  or raise `--blur` when regenerating the depth map.
- Does it feel like walking, or like a zoom? That is the only question that matters.

## Limits worth knowing before judging

- The camera can only travel a limited distance before flat geometry gives itself
  away. This test is deliberately a short push, not a walk across the plaza.
- Round objects — the fountain — only work while you are moving toward them, not
  around them.
- Where the camera passes something close, the area behind it was never painted,
  so it stretches. Blur on the depth map hides most of it; large moves will not.
