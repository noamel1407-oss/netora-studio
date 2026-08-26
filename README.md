# NETORA STUDIO — website (V2)

Hebrew, right-to-left, single-scroll marketing site built as one continuous journey:

> closed vault → scroll → the vault opens → we pass through the doorway → a white
> architectural world at sunset → the statement → the city keeps going → a gold route
> lifts off the plaza and leads out to a floating marble platform with the first
> project's computer on it → out along the promenade to TIMEMATIC, where the camera
> stops in front of the work → out of the hall by its corridor → and through the
> corridor to the contact pavilion.

The second half of that is fixed by five canonical anchors under
`reference/transitions/`, followed in order. The portfolio screens along the way are
surfaces, not portals: the camera never travels into a website, and the way out of
each building is its own architecture. See **[The route past the platform](#the-route-past-the-platform)**.

Built with Vite + React + TypeScript and GSAP ScrollTrigger. All page content is ordinary
semantic HTML; every visual layer (vault video, world backdrops, screen recordings) is a
swappable asset with a graceful fallback, so the site is complete at every stage of asset
production.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build into dist/
npm run preview  # serve the production build
```

Node 20+ is required.

## Dropping in the real assets

Everything lives in `public/media/` under fixed names — no code changes needed:

| Asset | Path | Status / fallback |
| --- | --- | --- |
| Vault opening video | `public/media/vault-video.mp4` | **in** |
| Vault poster / first frame | `public/media/vault-poster.webp` | **in** — cut from the video's frame 0 |
| World: the plaza past the doorway | `public/media/world-city.webp` | **in** |
| World: marble terrace behind the laptops | `public/media/world-works.webp` | **in** |
| World: arch + pool beside the form | `public/media/world-contact.webp` | **in** |
| Jewellery site still | `public/media/shay-jewellery-poster.jpg` | **in** (generated placeholder) |
| The route's five plates | `public/media/route-0*.webp` | **in** — built from the anchors by `npm run assets:plates` |
| Watch site still | `public/media/watch-project.jpg` | missing → typographic cover |
| Watch site recording | `public/media/watch-project.mp4` | missing → play button hidden |
| SHAY opening frame (on the platform's screen) | `public/media/shay-jewellery-poster.jpg` | **in** (generated placeholder — swap for a real capture) |

Screen recordings: 16:10-ish, 10–25 s, no audio, seamless loop. A portrait capture is
letterboxed rather than cropped, but a desktop recording is what fits a laptop screen.

### Replacing the vault render

The vault video is scrubbed by scroll, not played, so it must be all-keyframe — otherwise
seeking to an arbitrary time means decoding forward from a distant keyframe, which is what
makes a scrubbed video feel like it is lagging behind the wheel. Do not just drop a new file
in; run it through:

```bash
npm run encode:vault -- path/to/render.mp4     # → mp4 + a re-cut poster
npm run encode:vault -- path/to/render.mp4 --webm   # also a VP9 copy
```

`world-city.webp` is the other half of that opening and has one hard requirement: **no vault
framing anywhere in the image.** The vault layer is scaled aside to uncover it, so a doorway
baked into this picture leaves the reader standing in a doorway for good.

The `--webm` copy is not shipped — all-intra VP9 came out roughly three times the H.264, so
offering it would hand Chromium users the heavier file. It exists because Playwright's
bundled Chromium has no H.264 decoder, so it is the only way to exercise the scrubbing in a
headless browser. Wire it via `vault.video.webm` in `src/site.config.ts` while testing.

Live-site URLs sit in `src/site.config.ts` → `projects[].liveUrl`. A `null` URL simply hides
the "לצפייה באתר" button (the watch project ships as `null` until its site is up).

## Where to change things

| What | File |
| --- | --- |
| Phone, email, Instagram, WhatsApp, form endpoint | `src/site.config.ts` |
| Navigation labels | `src/site.config.ts` → `nav` |
| Projects: titles, stills, videos, live URLs | `src/site.config.ts` → `projects` |
| Vault + world asset paths | `src/site.config.ts` → `vault`, `world` |
| Legal / accessibility page text | `src/content/legal.ts` |
| Colours, type scale, spacing | `src/styles/global.css` (`:root`) |
| Journey choreography (timings, scale, stagger) | `src/components/VaultHero.tsx` + `src/journey/scene.ts` |
| The still on the platform's screen, and the link off it | `src/site.config.ts` → `journey.shayShot`, `journey.liveUrl` |
| Camera, gold route, platform placement | `src/journey/scene.ts` |
| The route past the platform: legs, aims, thresholds, the stop | `src/journey/route.ts` |
| What is said along the route (the stop, the corridor's disciplines) | `src/site.config.ts` → `route` |

## How the journey works

The journey is two scrubbed acts, and the seam between them is a place rather than a
boundary: the first ends on the platform SHAY stands on, the second picks the route up at
SHAY's forecourt and carries it to TIMEMATIC, through the corridor, and out to contact.
Each act is one tall section with a sticky full-viewport stage and exactly one
ScrollTrigger; nothing else on the page has one.

`VaultHero` is the first (`--journey-h`, 1080svh), and scroll position drives everything in
it — the door, the arrival in the city, the statement, and the travel out to the first
project. Everything is a position on its timeline rather than something that starts when
something else finishes, which is what removes the seam a reader would otherwise feel
between "the hero" and "the work". All of it runs in reverse when scrolled back, including
the route drawing itself back in.

The timing constants are in `src/journey/scene.ts` → `JOURNEY`, as fractions of the
container's own length:

| | |
| --- | --- |
| 0.014 – 0.24 | the door scrubs open |
| 0.22 – 0.31 | the doorway flies past the camera |
| 0.245 → | the route lights up under the city, at about a third of its brightness |
| 0.278 – 0.352 | the statement rises |
| 0.352 – 0.425 | it is settled and simply readable, while the route goes on drawing itself |
| 0.425 – 0.50 | it leaves, and the route takes full prominence |
| 0.44 → 1.0 | the camera travels: approach, then a hold on the arrival, then on past it |

Three clocks read off that one number, and they are deliberately not the same clock. The
**route** starts at 0.245 and its leading edge runs far ahead of the camera — by the time
the statement has been read, the road already reaches the platform. The **camera** starts
at 0.44, under the statement's departure. The **platform** comes out of the city's air
between 0.44 and 0.49, once the type has cleared the frame.

### The door

Not played, scrubbed: scroll progress maps to the video's `currentTime`, so it opens as the
reader moves down and closes as they move back up. Seeks are coalesced onto animation
frames and skipped while the decoder is busy, so fast scrolling lands on the newest frame
instead of queueing a backlog of stale ones. This is why the file has to be all-keyframe
(see above).

The render ends at the threshold, still framed by the doorway; `world-city.webp` is the
same street a few paces further in, with no doorway in it. So the last of the travel is the
frame itself scaling to 3.4 and leaving by every edge, uncovering the plaza. The layer is
only dropped when almost nothing of it is still on screen: fading a frame that still fills
the screen is a crossfade, which is the thing this replaces.

### The travel

Past the statement the city does not hand over to a section — the camera keeps going.
`src/journey/scene.ts` describes one space, and the projection in it is deliberately the
same formula the browser uses for `perspective`, so an SVG drawn from `project()` and a DOM
element placed with `translate3d()` land on the same pixel.

- **The vanishing point** is measured off `world-city.webp` — the artwork already contains a
  gold light trail running away from the camera. `framingFor()` redoes the
  `object-fit: cover` maths for the current viewport to find where that convergence lands
  on screen, and the scene's `perspective-origin` and the backdrop's `transform-origin` are
  both set to it. A narrow viewport crops the artwork hard enough to push that point off
  the side of the frame; rather than clamping the point — which would leave the objects
  converging somewhere the architecture behind them does not — it solves for the
  `object-position` that pans the *artwork* back into agreement, and returns both. On a
  desktop frame nothing moves: the natural crop already lands inside the band.
- **The camera** (`cameraAt`) is a dolly, a lateral truck and a tilt. The dolly is described
  by how large the platform reads on screen rather than by a distance, which keeps the
  growth even under the eye: 0.155 → 0.47 of its true size by travel 0.80, held there to
  0.88, and then on to 0.60 — that last stretch is what keeps the world moving as the
  pinned stage is scrolled off, so the section does not visibly end. The truck takes its
  lateral position from the rail itself, a way ahead of where the camera has got to and at
  a gain low enough to sway rather than steer, handing over to the composed arrival framing
  before the platform is reached. The tilt is carried as a plain translate on the stage, so
  the skyline rides with it instead of sliding against it.
- **The city artwork** takes the same move at the distance of a skyline: a slow swell to
  ~1.25 and a lateral shift of a dozen pixels. The platform and the route take it from a few
  hundred units away and sweep past. That difference is the depth — no layer of the picture
  was cut up to fake it.
- **The gold route** (`GoldPath`) is a Catmull-Rom curve standing in that world, projected
  and redrawn as a tapering ribbon every frame, so it foreshortens and thins with distance
  by itself. Its first points sit over the trail the artwork already paints; from there it
  lifts off the plaza, arrives at the platform's near-left corner, runs the length of the
  slab's front edge level with the gold seam cut into it, rounds the far corner and carries
  on into the distance — the direction the next project will arrive from. Scroll moves the
  light's leading edge along it, and the leading edge runs ahead of the camera, so the route
  reaches the platform about a third of the way through the travel: the rest of the approach
  is spent following a road that visibly already goes somewhere. Two layers: the stretch
  beyond the platform is painted under it, the stretch this side of it over the top.
- **The platform** (`ProjectPlatform`) is real geometry in the same `preserve-3d` space — a
  top surface, the slab's thickness, its two flanks, a tapered plinth — not a picture of
  geometry. Nothing about it animates: the camera carries the world past it, so it grows
  because it is being approached. The only thing it tracks by itself is the distance haze
  thinning as the city's air stops getting in the way.

Every transform inside the 3D subtrees is written as world coordinates measured from an
anchor, so those elements set `transform-origin: 0 0`. The default `50% 50%` turns an
out-of-plane rotation into a displacement, which is a very confusing bug to look at.

### The first project's screen, and its one link

`ProjectScreen` is the surface the monitor is built around, rather than a
picture baked into it:

```jsx
<ProjectScreen src={journey.shayShot} … />
```

It shows a still of the site's own opening frame. Nothing plays in there: the
movement in that scene is the camera arriving at it, and a screen playing to
itself while the world moves around it reads as two things happening at once.
Swapping the shot is `journey.shayShot` in `src/site.config.ts`, or dropping a
new file at the path it points to — a 16:10-ish capture of the site's hero at
1600px or wider. It is cropped from the top (where a site composes its
opening), fitted rather than stretched if it is narrower than the screen, and
falls back to a typographic cover if the file is missing.

`ProjectStation` is the one thing on the platform that can be acted on: a
real link to the live site, `target="_blank" rel="noopener noreferrer"`. It
stands on the marble — its position is the same projection the platform is
drawn with, so it arrives with the architecture — but it does not scale with
it, because a link that shrinks into the distance is one nobody can read or
hit. It lives outside the scene's `aria-hidden` layer and stays
`visibility: hidden` until the arrival, so it is never a focus stop for a
destination the reader has not reached, and the computer itself is never the
click target.

### The route past the platform

<a id="the-route-past-the-platform"></a>

Act two. Five canonical anchors under `reference/transitions/` fix this stretch, and
their roles are not open to reinterpretation — the README beside them states each one.
They are followed in numeric order and in no other:

| | |
| --- | --- |
| 01 | SHAY exit → the exterior route toward TIMEMATIC |
| 02 | the TIMEMATIC portfolio stop — the camera halts while the work is shown |
| 03 | the TIMEMATIC exit composition: screen left, the real corridor right |
| 04 | inside the corridor — its canonical camera position and architecture |
| 05 | the corridor exit → the exterior route out to contact |

`src/journey/route.ts` is the only description of the camera that walks them, and
`Promenade` is the part that has to be a component: a tall scrubbed container with a
sticky stage, five plates stacked in it, and one scroll position driving all of them.

**The screens are surfaces.** SHAY's display panel in 01 and TIMEMATIC's screen in 02
and 03 are glass mounted on marble, and the camera never travels into either. The way
out of each building is its architecture — the plaza in 01, the corridor in 03 — and
that is what makes this a journey through a place rather than a sequence of websites
opening into each other. The stop at 02 is the one leg that looks straight at a screen,
and it looks at it because it has halted in front of it. `screenBreaches()` asserts this
on mount in development and again in `npm run audit:route`, because nudging an aim a few
points toward a nicer composition is exactly how a screen becomes a door.

**Every number is measured, not chosen.** `npm run assets:anchors` reads the anchors and
prints what it finds; the numbers are moved across by hand. Two of its findings do real
work:

- *The rails converge on where each leg aims.* Traced row by row, the gold inlay in 01
  runs from x≈0.49 at the bottom of the frame, bows out to x≈0.41 and comes back to the
  TIMEMATIC doorway at x≈0.42. The corridor's floor lines in 04 converge on x≈0.50. Both
  sets of rails in 05 bend toward the contact rotunda. No leg aims at a composition; each
  aims where the road in its own frame already goes.
- *The camera is at one height throughout.* Every aim lands between 0.468 and 0.546 of
  its own frame — the same eye level in five different places. That is what makes five
  pictures one walk, and why nothing here tilts.

**The plates are stacked, not swapped.** Each leg sits under the one before it. A leg
pushes toward the opening it leaves through and is only dropped once it is two or three
times the frame and the only thing left of it on screen is the inside of that opening —
which is what the plate underneath is already showing. It is the same rule the vault door
is handed over by, for the same reason.

**A leg does not move until the plate in front of it has gone.** Otherwise it is a third
of the way into its push by the time anyone can see it, and the composition its anchor
fixes is one nobody is ever shown. The audit checks that all five are first seen at 1.00×.

**Thresholds are what the eye does at a doorway**, not a transition between pictures: the
frame closes to a warm dark under the TIMEMATIC arch and going into the corridor's shade,
and blows out white coming out of the corridor into the low sun. The plate swap happens
underneath it. Nothing on this route crossfades in the open except the one move that
cannot — see below — and that one lasts 0.6% of the container.

**02 → 03 is one room and one continuous move**, so it gets no threshold at all. Both
anchors show the same hall, so two features appear in both — the screen (centre
0.498,0.468 → 0.300,0.432) and the corridor's lit far end (0.747,0.556 → 0.690,0.545) —
and one scale about one origin has to carry both. Solving that pair gives **1.535 about
(0.867, 0.535)**; checked back against the corridor it lands within 0.007 of frame in x.
The origin sits just off the right edge at eye level, which is simply where the corridor
is. That registration is composed on top of leg 03's own push rather than replacing it,
so the two agree exactly at the swap however far 03 has got, and the camera's velocity
carries across the seam instead of dipping to zero in the middle of a truck.

**The stop is a stop.** 0.140 of the container — the longest single thing on the route —
with the plate not moving by a pixel. What moves in that window is the presentation, not
the camera.

**Nothing draws a route on top of these.** The plates are painted with their own gold
rails and lit by their own sunset. `GoldPath` exists in act one because the city artwork
stops short of the floating platform and the road had to be carried the rest of the way;
here the road is already under the reader's feet in every frame.

**The screens stay part of the artwork.** When a real capture of either site exists it
belongs in a re-rendered anchor, not composited over one — TIMEMATIC's screen is seen at
an angle in 03, and a flat screenshot pasted onto it would read as a sticker on the
marble.

Under `prefers-reduced-motion` the whole act stands down: the same five plates render as
five calm full-height scenes in the same order, each composed once and never moved.

### The terrace after it

`SelectedWorks` is what is left once the first project moved into the city: no heading
announcing a portfolio, just a line of small metadata and whatever the route has not
reached yet. It renders every project except `journey.projectId`.

Component map:

```
Header
VaultHero            ← act one: sticky stage + its scroll timeline
├─ VaultVideo        ← scrub target: seek(progress), mp4/poster + CSS fallback
└─ CityReveal        ← the world artwork + the statement (the page's <h1>)
   └─ CityTravel     ← the camera: perspective stage + the world it carries
      ├─ GoldPath    ← the route, projected and redrawn per frame (2 layers)
      ├─ ProjectPlatform  ← slab, plinth, monitor
      │  └─ ProjectScreen ← the still inside the glass
      └─ ProjectStation   ← the link to the live site, standing on the marble
Promenade            ← act two: five canonical plates, one camera through them
                       (the stop's caption and the corridor's disciplines ride
                        in the frame rather than in the world)
SelectedWorks
└─ ProjectShowcase   ← per project: tilt scene, platform, caption, live link
   └─ LaptopMockup   ← silver frame; the screen is whatever is passed in
      └─ ProjectVideo← still / recording / typographic cover, play + progress
ContactSection
└─ ContactForm       ← validation, endpoint POST or WhatsApp/email fallback
Footer
```

`?solo=vault` renders the journey with the rest of the page omitted, which is the honest
way to judge it: with a bright site underneath, a weak opening still reads as "fine,
something follows".

The fixed header flips between dark and light chrome via an `.is-light-world` class on
`<html>`, toggled from the journey's scroll position.

Under `prefers-reduced-motion` the pinned journey stands down completely: the same markup
renders as three calm full-height scenes — closed vault, then the world + statement, then
the arrival at the platform, composed once and never moved.

> Do not set `overflow-x: hidden` on `body` — it silently kills the sticky stage. The
> global stylesheet uses `overflow-x: clip` for exactly that reason.

### Contact form

`site.contactEndpoint` is `null` out of the box. In that state a valid submission opens a
prefilled WhatsApp message (or an email draft if `site.whatsapp` is `null`), so no enquiry is
lost. Point `contactEndpoint` at a Formspree/webhook/API URL and the form will `POST` JSON
(`{ name, email, phone, message }`) instead.

## Performance notes

- No 3D runtime: the vault is artwork and video, not a scene — three.js and the model
  pipeline that fed it are gone, and with them the heaviest chunk from the bundle.
- Only the vault poster is preloaded (`index.html`); every world backdrop and project still
  is `loading="lazy"`.
- The vault video is the one asset fetched in full up front (`preload="auto"`): scrubbing
  needs frames on demand, and it is the one thing the opening cannot fake.
- Project videos use `preload="metadata"` — enough to detect a missing file and show the
  first frame, nothing more until play.
- All journey motion is `transform`/`opacity`; ScrollTrigger instances are cleaned up via
  `gsap.context` on unmount.
- One scroll system: the single timeline publishes its progress (`src/journey/progress.ts`)
  and the camera-driven parts subscribe. No component runs a `requestAnimationFrame` loop
  of its own, and nothing in the scene can drift out of step with anything else.
- The route's glow is drawn as geometry, not a `filter`. A blur over a viewport-sized SVG
  cost more per frame than everything else in the scene put together — measured at roughly
  half the frame budget on a software rasteriser.
- No 3D runtime for the travel either: it is CSS `perspective` plus one SVG, so the scene
  adds no WebGL context and no new dependency.

## Accessibility

Targets WCAG 2.1 AA. Semantic landmarks and heading order, skip link, full keyboard
operation, visible focus rings, real `<label>`s (the "placeholders" are floating labels),
errors tied to fields via `aria-describedby` with focus moved to the first invalid field,
and a play/pause control per screen recording.

Under `prefers-reduced-motion` the pinned journey stands down completely: the same markup
renders as two calm full-height scenes (closed vault, then the world + statement), videos
show native controls and never autoplay, and reveals/tilt/parallax are off.

Two checks are wired up. Both need the production build running on port 4173
(`npm run build && npm run preview`):

```bash
npm run audit:a11y       # axe-core, desktop + mobile + a legal page
npm run audit:behaviour  # skip link, the route, showcases/fallbacks, live links, form, header flip
```

`audit:route` needs neither, because the camera in `src/journey/route.ts` is a pure
function of scroll position — so it walks it and asserts properties of what actually
comes back:

```bash
npm run audit:route      # the anchors' order, the stop, no screen is a doorway
```

`audit:a11y` currently reports zero violations. Its "needs-review" list is the set of
contrast checks axe cannot compute automatically (the gradient-filled wordmark); those were
verified by hand.

`src/content/legal.ts` marks the privacy policy and terms as `placeholder: true`, which
renders a visible notice on those pages. Set it to `false` once real wording is in.

## Deployment

Static build with client-side routing — the host must rewrite unknown paths to `/index.html`
(Netlify `_redirects`, Vercel rewrites, or `try_files $uri /index.html` on nginx). Without
it, `/accessibility`, `/privacy` and `/terms` will 404 on refresh.

One production caveat: the media 404 fallbacks rely on missing files actually returning
404 (any static host does this). A rewrite rule that answers `/media/*` with `index.html`
would defeat the detection — scope SPA rewrites to non-file paths.
