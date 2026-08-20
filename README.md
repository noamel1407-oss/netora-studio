# NETORA STUDIO — website (V1)

Hebrew, right-to-left, single-scroll marketing site with the Netora medallion rendered as a real
3D object that travels between sections as you scroll.

Built with Vite + React + TypeScript, React Three Fiber / three.js for the 3D layer, and GSAP
ScrollTrigger for section reveals. All page content is ordinary semantic HTML — nothing that
matters lives inside the canvas.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build into dist/
npm run preview  # serve the production build
```

Node 20+ is required.

## Where to change things

| What | File |
| --- | --- |
| Phone, email, Instagram, WhatsApp, form endpoint | `src/site.config.ts` |
| Navigation labels | `src/site.config.ts` → `nav` |
| Project entry, video path, poster, link | `src/site.config.ts` → `projects` |
| Testimonials | `src/site.config.ts` → `testimonials` |
| Legal / accessibility page text | `src/content/legal.ts` |
| Colours, type scale, spacing | `src/styles/global.css` (`:root`) |
| 3D waypoints per section | `src/three/journey.ts` |

### Contact form

`site.contactEndpoint` is `null` out of the box. In that state a valid submission opens a
prefilled WhatsApp message (or an email draft if `site.whatsapp` is `null`), so no enquiry is
lost. Point `contactEndpoint` at a Formspree/webhook/API URL and the form will `POST` JSON
(`{ name, phone, email, message }`) instead.

### Project video

The laptop screen **is** the video container. Drop the real screen recording at:

```
public/media/shay-jewellery.mp4
```

Until that file exists the laptop shows `public/media/shay-jewellery-poster.jpg` as a still and
hides the play control — nothing breaks. Regenerate the placeholder poster with
`npm run assets:poster`, or just replace the JPEG.

Recommended recording: 1600×1000 (16:10) or larger, 10–25 seconds, no audio, seamless loop,
H.264, a few MB at most. It autoplays muted only while on screen and pauses when scrolled away.

## The 3D model

The original Meshy export is 112 MB and cannot be served to browsers. It is kept untouched at
`assets-src/netora-original.glb` (git-ignored — back it up separately) and two web builds are
generated from it:

```bash
npm run optimize:model
```

| Output | Triangles | Size | Used for |
| --- | --- | --- | --- |
| `public/models/netora.glb` | ~314k | 2.3 MB | desktop |
| `public/models/netora-low.glb` | ~126k | 1.0 MB | ≤860px viewports |

The pipeline decimates the mesh (meshoptimizer), re-encodes the textures to WebP at reduced
resolutions, and applies `EXT_meshopt_compression`. Adjust the quality targets in
`scripts/optimize-model.mjs`.

> The work is split across `stage-textures.mjs` and `stage-geometry.mjs`, which run as separate
> processes on purpose: loading `@gltf-transform/functions` and `sharp` into the same process
> breaks libvips' colourspace handling and every texture encode fails.

To swap in a different or pre-separated model later, replace the two files above — or change
`MODEL_DESKTOP` / `MODEL_MOBILE` in `src/three/NetoraScene.tsx`. No other page code depends on
the model's contents, so a version with detachable fragments can drop straight in.

## Performance notes

- The canvas is lazy-loaded (`React.lazy`) and only mounts once the browser goes idle, so three.js
  never blocks first paint. It ships as its own chunk.
- A CSS ring holds the medallion's place while the GLB downloads.
- Device pixel ratio is capped (1.5 on mobile, 2 on desktop), antialiasing is off on mobile.
- The render loop stops when the tab is hidden and when the 3D sections scroll out of view.
- Under `prefers-reduced-motion` the loop switches to on-demand rendering.

## Accessibility

Targets WCAG 2.1 AA. Implemented: semantic landmarks and heading order, skip link, full keyboard
operation, visible focus rings, real `<label>`s (the "placeholders" are floating labels), errors
tied to fields via `aria-describedby` with focus moved to the first invalid field, a keyboard- and
swipe-operable carousel with an `aria-live` announcement, a pause control for the video, and full
`prefers-reduced-motion` support (3D motion, reveals and video autoplay all stand down).

The canvas is `aria-hidden` by design — it is decorative and carries no information that is not
also in the HTML.

Two checks are wired up. Both need the production build running on port 4173
(`npm run build && npm run preview`):

```bash
npm run audit:a11y       # axe-core, desktop + mobile + a legal page
npm run audit:behaviour  # skip link, carousel keys/arrows, form errors and focus
```

`audit:a11y` currently reports zero violations. Its "needs-review" list is the set of contrast
checks axe cannot compute automatically (gradient-filled wordmark, text layered over the canvas);
those were verified by hand.

`src/content/legal.ts` marks the privacy policy and terms as `placeholder: true`, which renders a
visible notice on those pages. Set it to `false` once real wording is in.

## Deployment

Static build with client-side routing — the host must rewrite unknown paths to `/index.html`
(Netlify `_redirects`, Vercel rewrites, or `try_files $uri /index.html` on nginx). Without it,
`/accessibility`, `/privacy` and `/terms` will 404 on refresh.

## Known gaps for V2

- `אודות` in the navigation points at the hero; there is no dedicated About section yet.
- The medallion does not physically break apart — the gold arcs and shards around it stand in for
  that effect until a separated model is available.
