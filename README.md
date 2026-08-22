# NETORA STUDIO — website (V2)

Hebrew, right-to-left, single-scroll marketing site built as one continuous journey:

> closed vault → scroll → the vault opens → we pass through the doorway → a white
> architectural world at sunset → the statement → two large laptops with the selected
> works → a light contact scene.

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
| Watch site still | `public/media/watch-project.jpg` | missing → typographic cover |
| Watch site recording | `public/media/watch-project.mp4` | missing → play button hidden |
| Jewellery site recording | `public/media/shay-jewellery.mp4` | missing → play button hidden |

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
| Journey choreography (timings, scale, stagger) | `src/components/VaultHero.tsx` |

## How the journey works

`VaultHero` renders one tall section (`--journey-h`, 380svh) with a sticky full-viewport
stage, and scroll position drives everything in it.

The door is scrubbed, not played: scroll progress maps to the video's `currentTime`, so it
opens as the reader moves down and closes as they move back up. Seeks are coalesced onto
animation frames and skipped while the decoder is busy, so fast scrolling lands on the
newest frame instead of queueing a backlog of stale ones. This is why the file has to be
all-keyframe (see above).

The render ends at the threshold, still framed by the doorway. `world-city.webp` is the same
street a few paces further in, with no doorway in it — so the last of the travel is the
frame itself scaling to 3.4 and leaving by every edge, uncovering the plaza. The layer is
only dropped at 90% of the journey, when almost nothing of it is still on screen: fading a
frame that still fills the screen is a crossfade, which is the thing this replaces. The
statement rises after that, with the world already in place.

Everything besides the scrub is `transform`/`opacity`. If the video is missing or a decoder
refuses to seek, the same timeline runs on the poster instead — the still does the
travelling itself. `?solo=vault` renders the opening with the rest of the page omitted,
which is the honest way to judge it: with a bright site underneath, a weak opening still
reads as "fine, something follows".

Component map:

```
Header
VaultHero            ← owns the sticky stage + scroll timeline + light-world flip
├─ VaultVideo        ← scrub target: seek(progress), mp4/poster + CSS fallback
└─ CityReveal        ← world backdrop + the statement (the page's <h1>)
SelectedWorks
└─ ProjectShowcase   ← per project: tilt scene, platform, caption, live link
   └─ LaptopMockup   ← silver frame; the screen is whatever is passed in
      └─ ProjectVideo← still / recording / typographic cover, play + progress
ContactSection
└─ ContactForm       ← validation, endpoint POST or WhatsApp/email fallback
Footer
```

Only one project video plays at a time; screens pause when scrolled away. Laptop hover is
physical and restrained (≤1.05 scale, small lift, deeper shadow, ~2° pointer tilt on fine
pointers only); the sibling laptop steps back slightly.

The fixed header flips between dark and light chrome via an `.is-light-world` class on
`<html>`, toggled from the journey's scroll position.

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
npm run audit:behaviour  # skip link, showcases/fallbacks, live links, form, header flip
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
