# B1 / B2: the three open items, closed on evidence

Written against these heads, all read directly:

| | branch | head |
|---|---|---|
| main | `main` | `914c5e3` |
| B1 | `claude/netora-experience-architecture-3gxqvu` | `eb2d236` |
| B2 | `claude/canonical-transition-anchors-tbrozo` | `42dcb3a` |
| PIPE | `claude/netora-critical-path-3he6be` | `57e3f47` |
| VRF | `claude/visual-reference-frames-3g3ytr` | `1ce54e3` |

Nothing here was merged, and nothing on `main` was touched.

> Note for anyone re-running these commands: the local `main` ref in a fresh
> clone of this workspace can be stale at the initial commit. Every diff below
> is against `origin/main` @ `914c5e3`. `git diff main …` reports every Act 1
> file as newly added on both branches and is misleading.

---

## 0. `RouteGreybox.tsx`, read directly

**Verdict: a deliberate continuation with a written contract, not a workaround
or a temporary experiment.** Four things in the file establish that.

*It states what it is for, and what it refuses to be.* `RouteGreybox.tsx:11-18`:
"This exists to prove one thing and nothing else: that SHAY → approach
TIMEMATIC → stop at its display → move *around* the display → into the corridor
→ through it → out toward contact is one continuous physical camera journey
through one world. No materials, no lighting, no plaques, no facade — those are
the pass after this one, and only if the route reads."

*It states its architectural commitment.* `:20-23`: "Every face here is real
geometry standing in act one's own coordinate space, placed by the same
projection the floating platform is placed by, inside the same `preserve-3d`
subtree. Nothing is a picture of a place." That is the exact inverse of the
approach `5d1780d` reverted, whose message calls the plate version "a slideshow
beside the world, not a camera moving through it".

*The act-two-only mount is a stated invariance guarantee, with its open question
named rather than hidden.* `:38-46`: the facade would project to ~560px and be
plainly visible from the city; showing it "would change every frame of act one,
which is the one thing this pass is not allowed to do", so it is held until the
route begins and "whether the city should see where it is going is decided after
the route itself is signed off". Implementation: `:115-119` sets
`visibility = progress > 0.0005 ? 'visible' : 'hidden'`, `:123-126` forces
hidden at mount, `:151` is `aria-hidden`.

*The geometry is solved, not chosen.* `src/journey/scene.ts:517-535` derives the
hall width, the display size and TIMEMATIC's distance from anchors 01 and 02 by
measurement, and records what the first attempt got wrong. The route is
travel `[1, 2]` picking up exactly at `cameraAt(1)` from rest
(`scene.ts:576-600`), and the camera halts 1681 units short of the display plane
(`7a8e595`) — "the screens are surfaces" is enforced as a wall, not remembered
as a rule.

Two qualifications that belong on the record:

- **Doc/code drift inside the file.** The header at `:27-30` describes
  `ACT2.wall` as "one plane with exactly one hole in it, at `ACT2.opening`", and
  the route crossing it through that hole. The code imports `ROUTE` (`:4`,
  `:128`) — there is no `opening` — and renders a solid wall (`:183-188`,
  "Solid, all the way across — the corridor that eventually opens in it is the
  next act's").
- **Scope.** The greybox implements anchors 01→02 only. `7a8e595` scoped it down
  from the corridor/arch/contact version in `ded59ab` deliberately. It is a
  contracted continuation, not a complete one.

---

## 1. Gate 3a — what it actually approves

**It is not an approval instrument for B2, and it cannot be made into one.**

Gate 3a validates *planned AI-generated video clips* between canonical anchor
frames (clips A–I), pre-generation. B2 builds geometry instead of generating
clips. The two are different production strategies, not two views of one thing.

B2 does not contain Gate 3a in any form: no `.claude/`, no
`docs/continuity-spec.json`, no `scripts/validate-continuity.mjs`, and the
implementation commit `4218663` is not an ancestor of `42dcb3a`.

What the gate does, mechanically (`PIPE/scripts/validate-continuity.mjs`):

- Inputs are `docs/continuity-spec.json` — a **hand transcription** of the prose
  `docs/motion-map.html` — plus `reference/canonical-manifest.json` for
  filenames and dimensions (`:312-313`). Nothing checks that the transcription
  is faithful, and the gate never hashes an anchor.
- Ten dimensions run. Verdict is `failures.length ? FAIL : reviews.length ?
  NEEDS_REVIEW : PASS` over blocking dimensions (`:277-279`), and the process
  exit code ignores NEEDS_REVIEW entirely — only FAIL exits non-zero (`:390`).
- Three facts are pixel-fed: sun position, mean luminance, and endpoint
  registration. The registration check (`locked-camera-geometry`) runs only
  where `camera.motion` is `locked`/`static` — today Clip A alone (`:238-241`,
  `:355-358`); the other eight get an unconditional PASS on it.
  `lighting-continuity` *is* moved by measured luma on all nine and currently
  flips five of them to NEEDS_REVIEW.
- On the nine committed transitions, **every blocking-FAIL branch is presently
  unreachable** (confirmed by running the gate): two FAIL paths depend on
  `facts` keys only the contract tests supply (`:132`, `:156-157`), the
  ground-plane FAIL needs a prose regex no clip with an elevation change
  satisfies (`:144-147`), and the sun cross-check cannot fire because no clip
  pairs two anchors that yield a sun disc.

Its track record on this project:

- Gate 3a **passed** Clip A — 9 PASS / 0 FAIL / 0 NEEDS_REVIEW — and that pass
  is what 12.25 credits were spent against (`d643fd7`).
- The clip then failed on `camera-semantics`: a locked-off spec, and 7px of
  monotonic drift in locked background elements. The root cause was upstream —
  anchors 01 and 02 do not register to each other. `d643fd7` says it plainly:
  "Gate 3a cannot see it".
- `6798a40` added the locked-camera registration check afterwards. `bde1169`
  then established the harder fact: no single transform relates 01 and 02
  (14.29px rms over 124 matches; features "re-drawn, not re-photographed"), so
  Clip A "cannot be produced as a locked-off transition from this pair by any
  preparation of its inputs".
- `reference/_review/manifest.jsonl` contains **no recorded Gate 3a verdict for
  any asset**. The recorded rejections (Clip A Take 1, Frame 02 take 1) are
  Gate 3b / manual.

**Consequence for the decision rule.** "Gate 3a valid" cannot be one of the
three conditions for promoting B2 — it is a category error, and the gate's own
history is a record of it passing something that was already broken. The
condition that actually applies in its place is stated in §4.

One further consequence worth holding: the anchor pair that defeated the clip
pipeline is *not* a defeater for B2. Building one coherent world is exactly the
operation that can absorb two references that disagree — you fit geometry to
them and the residual shows up as a stated per-anchor delta
(`42dcb3a`: 01 centre +1.6% / -3.7%, 02 centre -1.3% / -0.6%). Interpolating
between them cannot.

---

## 2. B2's `reference/` dependencies

**No hard dependency on any other branch.** B2 builds and paints what it shows
from assets it owns.

- All six files its runtime config references exist in B2 and are byte-identical
  (same blob shas) to main's, B1's, PIPE's and VRF's.
- The five canonical anchors are B2's own copies under `reference/transitions/`.
  They are blob-identical to VRF's `reference/0*.jpeg`, but VRF's head is **not**
  an ancestor of B2's — they were copied in under a new path at `7b75800`.
  Merging B2 does not silently require VRF.
- The anchors are never shipped: they live outside `public/`, Vite never emits
  them, and only three Node scripts read them — `compare-anchors.mjs:51-52`
  (01, 02), `measure-yaw.mjs:54-55` (02, 03), and `measure-anchors.mjs`'s
  directory scan. They are art direction and measurement input, as `5d1780d`
  says.
- Four referenced paths are missing, all deliberate and all coded around with
  typographic fallbacks: `/media/watch-project.jpg`, `/media/watch-project.mp4`,
  `/media/shay-jewellery.mp4`, `/media/vault-video.webm`.

**One want, two gaps.**

*The want* is a TIMEMATIC capture for the greybox's display wall.
`RouteGreybox.tsx:197-201` feeds `ProjectScreen` the missing
`/media/watch-project.jpg`, so the panel the greybox is composed around shows a
typographic cover. A capture exists on exactly one other branch —
`claude/netora-website-build-iikko1`, `public/media/watch-project.png`, 3.6MB,
imported by the Higgsfield workflow — and is orphaned there too, because that
branch's own config also points at `.jpg`. Taking it is a one-file copy plus an
extension fix, not a dependency.

*Gap 1: no provenance machinery.* B2 has no `reference/canonical-manifest.json`
and no `reference/_review/manifest.jsonl`. The Gate 0 byte-identity apparatus
exists only on PIPE / `netora-visual-production-8hbty3` / VRF. Taking B2 as base
drops it unless it is ported.

*Gap 2 — the one that matters.* **The five anchors have no manifest entry on any
branch.** They are bare `Add files via upload` blobs with no source, model,
settings or hash record. Every dimension of B2's greybox is measured off frames
that cannot be regenerated or hash-verified. That is a real canonicality gap in
B2 itself, independent of which branch wins.

*Stale doc.* `reference/transitions/README.md` still directs the reader to
`src/journey/route.ts`, `npm run assets:plates` and `npm run audit:route`. All
three were deleted by `5d1780d`, one commit after the README landed, and the
README was not updated. The anchors' declared **roles** remain canonical; the
pointer to how they are consumed is dead.

*Nothing on PIPE is an asset B2 is missing.* `reference/_review/` holds nine
backfilled still-candidates with `validationResult: null` and one clip —
`clip-a-take1.mp4` — whose ledger entry reads `"verdict": "FAIL"` and
`"Rejected… No Take 2 generated"`.

---

## 3. B1 salvage

First, a correction to the working characterisation of B1, because it changes
what is worth taking.

**B1 is not a crossfade slideshow.** One scroll source (one ScrollTrigger
scrubbing a 1-unit timeline, `driver.ts:69-84`), one camera (`cameraAt`,
`camera.ts:182-215`) whose dolly runs monotonically 4261 → 10700 with no
per-stage reset, all three places permanently mounted, and no plate's opacity or
visibility is ever written. A plate leaves by being passed.

**But the destination is still a picture, and that is the disqualifying part.**
A plate is a single `<img>` given `translate3d(x, y, 0) scale(s)` with a literal
z of 0 — depth emulated in JS as `(distance - home) / (distance - camera.z)`
(`plates.ts:73-79`, `WorldPlate.tsx:46`). Only Act 1's SHAY platform is real CSS
3D inside a perspective container. The terrace arrives ~92% by vertical crane
and ~8% by dolly: the camera rises and the hall slides down into frame. And
TIMEMATIC is not in the world at all — the terrace's "hall" is one `<img>`, and
the TIMEMATIC project itself is a flat DOM figure in normal document flow with
its own local perspective context, crossfaded in.

So the operations anchors 02 and 03 require — halt in front of the display,
move *around* it, leave through the corridor beside it — are not tunable in B1;
they are unbuildable without replacing the plate model. Two real discontinuities
also exist: the SHAY "view live site" plaque cuts 1→0 at travel ≈1.13 mid-climb,
and the far half of the world converges on a different vanishing point from the
near half (~250px apart on a 1440px frame).

### A — portable values and assets

**A1. The gold path's terrace extension.** `world.ts:71-81` (6 new control
points), `:87` `HEAD_END`, `:103-106` `pathHead`'s `climb` term, and its driver
`GoldPath.tsx:80-81` (`climb = (camera.t - 1) / 0.42`). Without the driver the
extension is dead code.

  Two hazards, both load-bearing:

  - **Port the spline density change with it.** `world.ts:116,125,150` take a
    per-segment count (`spline(PATH, 10)`); B2's `scene.ts:433,442,466` take a
    total (`spline(PATH, 130)` → `round(130/13) = 10`). Adding six points to B2
    without changing this gives `round(130/19) = 7` per segment, re-sampling the
    whole rail. `GoldPath.tsx:24,203` measures the ribbon's tip taper in sample
    indices (`TIP = 26`), so the taper would stretch from ~2.6 to ~3.7 segments
    of world. Either port B1's signature or scale B2's total to 190.
  - **The values are in the right units and the wrong place.** At
    `z = -13500, y = -730` the terrace points sit 1630 units above `GROUND`
    inside `ROUTE.plaza`, in front of TIMEMATIC's facade. Port the *method*
    (a climb-aware path head), re-solve the numbers against B2's `ROUTE`.

**A2. Material CSS with no camera in it.** `CityRim.css:27-107` (parapet coping,
arris, fascia, courses) and `SelectedWorks.css:34-59` (`works__footing` marble
plinth). B2's greybox is deliberately material-free and has nothing equivalent;
these are exactly the pass `RouteGreybox.tsx:15-18` defers. Values only — leave
`CityRim.tsx` behind.

**A3.** `ContactSection.css:72` `inline-size: min(34rem, 100%)`.

### B — ideas and method, no code moves

**B1 (highest value). The `VAULT_WEBM` stand-in, from
`scripts/audit-continuity.mjs`.** `:128` reads a decodable copy and `:216`
fulfils the video request with `contentType: 'video/webm'`, which lets
`VaultHero` take its **scrubbable** branch under headless Chromium; `:204,238`
tag the run `poster` or `scrubbable` and `:442-443` refuse to compare a fixture
across modes.

This closes precisely the blind spot B2 admits to. `B2/scripts/baseline-act-one.mjs:36-40`:
"Headless Chromium has no H.264 decoder, so the vault video never becomes
seekable and `VaultHero` takes its non-scrubbable branch. The scrubbable branch
has its own tween positions and they are not exercised here. Their arithmetic is
checked separately and without a browser — see `scripts/audit-act-one-timing.mjs`."
**That script does not exist on any branch in this repository.** The compensating
control is documented and unbuilt.

`scripts/encode-vault.mjs` is byte-identical on both branches and already writes
a VP9 copy under `--webm` (`:75-99`), so the input exists.

**B2. The continuity assertions** in `audit-continuity.mjs` — "one scrubbed
surface, a camera still moving after SHAY, and no mask or reveal standing in for
a world". Worth adopting as B2's own act-two assertions; note that B2 would need
to decide how the third reads against a greybox.

**B3.** The clock/scrub two-channel split in `B1/src/journey/progress.ts`.

### C — reject, architecture-bound

`journey/{camera,plates,stages,driver,index}.ts`, `Journey.{tsx,css}`,
`WorldPlate.{tsx,css}`, `CityRim.tsx`, and the plate-ified `SelectedWorks.tsx`,
`ContactSection.{tsx,css}`, `CityReveal.tsx`, `VaultHero.{tsx,css}`, `App.tsx`,
`pages/Home.tsx`. Each of these only means anything inside the plate/crane
model; taking any of them is taking the model.

### D — already in B2, or a regression

`space.ts` / `timeline.ts` (B2's `scene.ts:17-173` is the same `PERSPECTIVE`,
`framingFor()`, `sceneFor()` and `sx/sy/s` split; `pathFor()` is
character-for-character identical), `ProjectPlatform.tsx`, `ProjectStation.tsx`,
`site.config.ts`. **B1 has no media asset B2 lacks** — the two `public/` trees
are blob-identical. The only script B2 lacks is `audit-continuity.mjs`, which is
item B1/B2 above.

---

## 4. What this changes about the standing questions

**The H.264 reservation is right, and sharper than stated.** The correct
statement is not "the vault opening was not tested". It is: *the scrubbable
branch of `VaultHero` — the actual door-on-the-scroll-wheel behaviour — is
exercised by no harness on either branch today, B2's baseline says so in its own
header, and the compensating script it points to was never written.* B1 solved
the same problem and its solution is portable (§3 B1).

**The 41-samples reservation is right, and B2 already exceeds it for state.**
`baseline-act-one.mjs` walks 160 samples per viewport on two viewports at fixed
**physical scrollY**, and `stableState` (`:120-141`) reads until two consecutive
reads agree — built precisely because a fixed-delay version "compared runs after
a fixed delay and produced forty differences on an unchanged build, every one of
them the tail of that easing… on frames that were pixel-identical". That is the
same trap the 220ms frame fell into.

But the harness records the **settled pose** and deliberately discards what
happened on the way there. It answers presence, position and invariance. It does
not answer "how does the move feel" for either branch. That question still has
no evidence behind it.

**Act 1 invariance, stated exactly.** B2's `src/journey/scene.ts` is append-only
(205 inserted, 0 deleted), `src/pages/Home.tsx` is byte-identical to main's, the
greybox mounts as a sibling of `ProjectPlatform` inside the existing
`.travel__world` subtree, and every Act 1 component edit reduces to the identity
while travel ≤ 1. B2 also reproduces main's `#about` / `#work` anchor landings to
five decimals, where B1 moves them (0.32802 vs 0.34163; 0.93116 vs 0.96980).

Two things qualify it, and neither was a silent finding — B2's own HEAD commit
states both:

- **B2's HEAD does not currently pass its own `baseline:verify`.** The only green
  run is an uncommitted control build with `--act-two-h: 0` (167/167 identical
  on both viewports). With act two's length restored: 1 desktop and 22 mobile
  state diffs plus 2 repainted frames, all in rows 16–17 of 18 — the bottom 11%
  — traced to `.journey::after` and the container's ivory stop, both percentages
  of a container that grew. `42dcb3a` calls this "a decision to confirm, not a
  bug to fix". It is a real open decision, not a closed one.
- **A live defect in act two:** `routeCameraAt` returns `t: 1`
  (`scene.ts:656`), so `CityTravel.tsx:87` pins `--air` at `0.500` for the whole
  route. Small — the layer is a bounded warm bloom at ~0.17 peak alpha anchored
  to Act 1's vanishing point, not a half-opaque sheet — but it is a bug, and B1's
  one-line decay is not a drop-in fix (its `camera.t` is uncapped travel).

**The third condition in the promotion rule should be replaced.** Not "Gate 3a
valid", which cannot speak to B2. Instead:

> B2's own harness green on a **committed** configuration, and the anchor
> provenance gap either closed (a manifest entry with source and hash for the
> five frames) or explicitly accepted as an art-direction input that will never
> be regenerated.

**Nothing here justifies touching `main`.**

---

## 5. What has since changed on this branch

Everything above describes B2 at `42dcb3a`, and that is what it should keep
describing — it is the record of what was found. Four of its findings have been
acted on since, on this branch, and the numbers here are what the runs
actually printed:

- **The baseline is green on the shipped configuration.**
  `baselines/act-one/state-shipped-scrubbable.json` is the site as it ships,
  and `npm run baseline:verify` reproduces it: 167 samples identical on each of
  two viewports, worst pixel drift 1/255 desktop and 2/255 mobile.
- **The isolation run is committed rather than improvised.**
  `npm run baseline:isolate` renders with `--act-two-h: 0` from the harness and
  checks it against `state.json` — the reference captured at `f2dd268` on the
  unmodified site. 167/167 on both viewports. The guarantee no longer depends
  on a build nobody else has.
- **Two real differences were behind the "remaining baseline diffs".** They
  were not the scrub's easing. Act one's share was solved from the `svh`
  numbers while ScrollTrigger scrubs a whole number of pixels, so act one's
  progress ran 1.8e-5 low for the same physical scroll — a gold rail a pixel
  off its recorded path, and the city's scrim on the wrong side of the half-way
  beat. Both survived four seconds of waiting, which is what ruled easing out.
  Fixed in `VaultHero` by measuring both distances and rounding them the way
  ScrollTrigger does.
- **The vault's own scrub is measured now.** `npm run vault:standin` writes a
  VP9 copy of the committed render into `.netora-work/`, and the harness serves
  it in place of the mp4, so `VaultHero` takes its scrubbable branch under a
  Chromium with no H.264 decoder. `state-shipped-scrubbable.json` is a walk of
  that branch. `scripts/audit-act-one-timing.mjs`, the compensating control the
  old header pointed at, is still not written and is no longer referenced.
- **`--air` varies through act two.** `npm run audit:route` walks the route and
  asserts it, along with the rules the route exists to keep: 0.500 → 0.000
  across 29 distinct values, spent by world z −20407 (the facade stands at
  −19900), the camera never reversing and never reaching the work.
- **The anchors have provenance.** `reference/transitions/manifest.json` records
  each frame's sha256, size, role, what it was measured into, and the fact that
  its generator is unrecorded. `npm run assets:verify` re-hashes them and fails
  on a mismatch or on a frame the manifest does not list.

One finding from the audit sweep that is not in the list above:
`npm run audit:behaviour` was counting every `.pscreen` on the page, and the
greybox puts a second one on TIMEMATIC's wall — so a check about SHAY's monitor
had been failing since `7a8e595` for a reason that had nothing to do with SHAY.
Scoped to `.platform .pscreen`; 31/31 pass.
