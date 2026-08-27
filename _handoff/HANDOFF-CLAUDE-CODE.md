# Handoff — Netora site, milestone 1: vault → first portfolio

Paste this whole file to Claude Code. It is the only source of truth for this
milestone. Anything not in it is out of scope.

---

## 0. First: reset `main`

The repo's history is a mix of two abandoned builds. Do not merge, do not
cherry-pick, do not salvage code.

```bash
git checkout main
git rm -rf .                     # everything goes
# keep nothing except what this brief lists
```

Then build fresh from this brief and push to `main`. If Noa wants the old work
kept for reference, tag it first (`git tag old-build && git push --tags`) — but it
never comes back into `main`.

---

## 1. What this milestone covers

The journey from the vault opening to the first portfolio stop, and nothing past
it:

| # | Beat | How it is rendered |
|---|------|--------------------|
| 1 | Vault door opens | video, scroll-scrubbed |
| 2 | Through the vault into the plaza | video, scroll-scrubbed |
| 3 | **HOLD A** — hero, Hebrew copy enters | frozen frame + HTML |
| 4 | Plaza → fountain → past the fountain → the gallery | **depth parallax**, not video |
| 5 | **HOLD B** — the gallery, two screens | frozen frame + HTML |

Stop there. SHAY, TIMEMATIC, the corridor and contact are the next milestone.

---

## 2. Why beat 4 is not video

First-frame/last-frame video models interpolate between two pictures. They have no
3D model of the scene, so when the camera has to translate far enough for parallax
they scale up the middle of the frame and repaint the rest. Three attempts
confirmed it. Beat 4 is therefore rendered as depth-warped stills with a real
camera — parallax computed by the GPU, deterministic, no morphing possible.

Beats 1 and 2 stay as video because they are pushes through an aperture, which is
the one move the video models do well, and because they are already approved.

---

## 3. Assets

### Approved video (download, do not regenerate)

| File | Source |
|---|---|
| `public/clips/clip-01-vault.mp4` | `https://d8j0ntlcm91z4.cloudfront.net/user_3DipWZbOvcTwhdi7K6REOedZkQU/hf_20260826_114316_d1f085c5-5fca-423c-8a5e-9d8120344046.mp4` |
| `public/clips/clip-02-into-plaza.mp4` | `https://d8j0ntlcm91z4.cloudfront.net/user_3DipWZbOvcTwhdi7K6REOedZkQU/hf_20260827_174945_bf45752b-193e-4f6f-aed0-48d8bd067066.mp4` |

Convert each to a WebP frame sequence:

```bash
ffmpeg -i public/clips/clip-01-vault.mp4 -vf "fps=48/5,scale=1600:-2" \
  -c:v libwebp -quality 80 public/frames/desktop/clip-01/%04d.webp
ffmpeg -i public/clips/clip-01-vault.mp4 -vf "fps=48/5,scale=960:-2" \
  -c:v libwebp -quality 76 public/frames/mobile/clip-01/%04d.webp
```

48 frames per clip. Target ≤ 90 KB/frame desktop, ≤ 35 KB/frame mobile. Write
`public/frames/manifest.json` with `{id, count, width, height}` per clip; the
runtime reads it and never guesses paths.

### Stills for the parallax beats

Noa supplies these four PNGs (1672×941). Put them in `public/scenes/`:

| Name | What it is |
|---|---|
| `01-hero.png` | the plaza, columns framing both edges, fountain and spire ahead |
| `02-fountain.png` | fountain large and centred, gallery small at the far end |
| `03-midplaza.png` | past the fountain on its right, gallery left of centre |
| `04-gallery.png` | the gallery facade square-on, two lit screens, arch centred |

Generate a depth map for each with the included `make_depth.py`, into
`public/scenes/*-depth.png`. White = near, black = far.

---

## 4. How beat 4 is built

Four depth scenes, one per still, played in order. Within a scene the camera
translates only — **never rotate the camera**; rotation is what makes it read as a
pan instead of a walk.

Reference implementation: `index.html` in this folder. It is a working single
scene with the shader, the plane sizing and the scroll mapping already correct.
Lift the shader and the sizing code from it rather than rewriting them.

Per-scene camera values come from Noa's tuning run — he will supply four numbers
(depth scale, dolly, lateral, ease). Do not invent them.

### Joining the scenes

Each scene's camera pushes forward until its composition roughly matches the next
scene's opening, then the two cross-dissolve over about 12% of that scene's scroll
**while both are still moving in the same direction**. Both meshes render, the
outgoing one fades out, the incoming one fades in, neither stops.

This is the one blend in the build, and it is only invisible if the motion does not
pause across it. Do not ease out of one scene and into the next — velocity must be
continuous through the crossover. If it reads as a cut, the fix is to move the
crossover point, not to lengthen the fade.

Everything else in the site keeps the no-fade rule.

---

## 5. Stack and rules

Vanilla HTML/CSS/JS · Three.js for the parallax scenes · GSAP + ScrollTrigger ·
Lenis · one fixed full-viewport canvas · no bundler required.

Hard rules:

- **Scroll maps linearly to camera position.** All velocity shaping lives in the
  scene layout, not in the scroll curve. Easing the scroll makes the page feel
  disconnected from the hand.
- **No text baked into any frame.** All copy is live HTML, RTL Hebrew.
- **The camera never enters a screen.** Projects open by click only.
- **No zoom, ever.** If a beat reads as scale-from-centre, it is wrong.
- Nothing in the DOM that is not in this brief. No invented projects, copy,
  testimonials or links.

---

## 6. Copy

**HOLD A — hero**
- H1: `אנחנו בונים אתרים תלת־ממדיים שמשאירים חותם`
  (`תלת־ממדיים` in `--sky-accent`, `חותם` in `--gold`)
- Sub: `חוויות דיגיטליות יוקרתיות שמספרות סיפור ומובילות לפעולה`
- CTA, outlined gold: `לצפייה בעבודות שלנו ↓` → scrolls to HOLD B

**HOLD B — the gallery**

Two reserved project slots, one over each lit screen. The screens are **never**
baked with content — the footage carries the empty lit panel, HTML carries what
goes on it.

Measure the four corners of each lit panel in `04-gallery.png`, store them in image
pixels, and at the hold map a rectangular `<div>` onto each quad with a `matrix3d`
homography solved from those corners. Do not hand-tune a `rotateY`. Each div is
fully opaque when it holds content, and sized to the panel exactly.

```js
const slots = { 'slot-a': null, 'slot-b': null };
// null            → transparent, the baked glow shows through, reserved line below
// {name,shot,href} → renders the screenshot, becomes a click target, name in gold above
```

While a slot is empty: the line `המקום הזה שמור לפרויקט הבא` sits centred between
the two panels, and clicking either panel scrolls to the contact form. Filling a
slot later is a data change — no frame, clip or scene is ever regenerated for it.

Hold length: two thirds of a full project hold.

**Tokens**

```
--navy:#0C1B33  --gold:#C9A24B  --gold-soft:#E3C98A
--marble:#F1EBE1  --cream-text:#F7F2E8  --sky-accent:#8FB7E8
```
Hebrew display/body: Heebo 700 / 300–400. Latin names: Cormorant Garamond 500,
letter-spaced caps.

---

## 7. Build order

- **M0** — vault clip only: canvas, Lenis, ScrollTrigger, manifest loader, frame
  scrubbing. Verify on a real phone. Commit.
- **M1** — clip 2 + HOLD A copy and CTA. Commit.
- **M2** — the four depth scenes with Noa's tuning values, joined. Commit.
- **M3** — HOLD B, the two panel quads, the reserved copy. Commit.
- **M4** — performance pass: mobile texture set, memory, `prefers-reduced-motion`
  (that path pins the two holds and fades copy between them — the only place a
  fade is allowed). Commit, push `main`.

One branch. `main`. Verify each milestone on a phone before starting the next.

---

## 8. Open items — Noa supplies, never invent

- The four tuning numbers from the parallax test.
- `{{WHATSAPP_URL}}`, `{{INSTAGRAM_URL}}` for the footer.
- Whether the About link goes anywhere yet. If not, omit it.
