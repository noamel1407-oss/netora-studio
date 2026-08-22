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

| Asset | Path | While it is missing |
| --- | --- | --- |
| Vault opening video (Higgsfield render) | `public/media/vault-video.mp4` | The poster stands in |
| Vault poster / first frame | `public/media/vault-poster.webp` | A CSS vault holds the hero |
| World: city seen through the vault | `public/media/world-city.webp` | Sky-gradient fallback |
| World: marble terrace behind the laptops | `public/media/world-works.webp` | Sky-gradient fallback |
| World: arch + pool beside the form | `public/media/world-contact.webp` | Sky-gradient fallback |
| Watch site still | `public/media/watch-project.jpg` | Typographic cover on the screen |
| Watch site recording | `public/media/watch-project.mp4` | Play button hidden |
| Jewellery site still | `public/media/shay-jewellery-poster.jpg` | *(already present)* |
| Jewellery site recording | `public/media/shay-jewellery.mp4` | Play button hidden |

An optional WebM encode of the vault video can be wired via `vault.video.webm` in
`src/site.config.ts`. The vault video should be muted-friendly, H.264, a few MB; the poster
must match its first frame. Screen recordings: 16:10-ish, 10–25 s, no audio, seamless loop.

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
stage. Scroll position scrubs a GSAP timeline (scale / translate / opacity only — all
GPU-composited): the vault frame grows past the screen edges and dissolves while the city
settles from a slight zoom, then the statement rises. The vault video itself is **not**
frame-scrubbed — entering the journey triggers `play()` once (muted), scrolling back above
the hero rewinds it — so playback stays smooth on every device.

Component map:

```
Header
VaultHero            ← owns the sticky stage + scroll timeline + light-world flip
├─ VaultVideo        ← swappable vault media (mp4/webm/poster + CSS fallback)
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

- No 3D runtime: V2 dropped three.js entirely (the vault is a video), which removed the
  heaviest chunk from the bundle.
- Only the vault poster is preloaded (`index.html`); every world backdrop and project still
  is `loading="lazy"`.
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

## The 3D model pipeline (kept for asset production)

The site no longer renders 3D at runtime, but the Meshy medallion pipeline is kept for
producing vault/brand renders: `assets-src/netora-original.glb` (git-ignored) →
`npm run optimize:model` → `public/models/netora*.glb`. See `scripts/optimize-model.mjs`.
These files are not referenced by any page code and can be deleted once the vault video is
final.

## Deployment

Static build with client-side routing — the host must rewrite unknown paths to `/index.html`
(Netlify `_redirects`, Vercel rewrites, or `try_files $uri /index.html` on nginx). Without
it, `/accessibility`, `/privacy` and `/terms` will 404 on refresh.

One production caveat: the media 404 fallbacks rely on missing files actually returning
404 (any static host does this). A rewrite rule that answers `/media/*` with `index.html`
would defeat the detection — scope SPA rewrites to non-file paths.
