# Canonical transition anchors

These five frames fix the stretch of the journey that runs from SHAY's
forecourt out to contact. **Their roles are fixed and are not open to
reinterpretation**, and they are followed in numeric order and in no other:

`01 → 02 → 03 → 04 → 05`

| | Role |
| --- | --- |
| `01-shay-to-timematic.jpeg` | SHAY exit → the exterior route toward TIMEMATIC. |
| `02-timematic-portfolio-stop.jpeg` | The final TIMEMATIC portfolio viewing position. **The camera stops here while the project is presented.** |
| `03-timematic-to-corridor.jpeg` | The TIMEMATIC exit composition. The website screen is on the left; the real physical corridor on the right is the continuation route. |
| `04-corridor-interior.jpeg` | The canonical camera position and architecture inside the corridor. |
| `05-corridor-to-contact.jpeg` | Corridor exit → the exterior route toward contact. |

## The portfolio screens are not portals

SHAY's display panel in 01 and TIMEMATIC's screen in 02 and 03 are surfaces:
glass mounted on marble. **The camera must never continue through either of
them.** The way out of each building is the architecture these frames show —
the plaza in 01, the corridor in 03 — and that is what makes this one
continuous journey through a place rather than a sequence of websites opening
into each other.

The stop at 02 is the one leg that looks straight at a screen, and it looks at
it because it has halted in front of it.

## Where they are used

- `src/journey/route.ts` is the only description of the camera that walks
  these five. Every number in it is measured off these frames.
- `npm run assets:anchors` measures them and prints what it finds: the
  openings each leg leaves through, the screen rectangles the camera must stay
  out of, and the gold rails traced row by row. It only prints — the anchors
  are canonical, and a tool that rewrote the route from them would be a way to
  change the journey by re-running a script.
- `npm run assets:plates` writes the web copies into `public/media/`. Same
  pixels, same framing, WebP, no resizing.
- `npm run audit:route` walks the finished camera and asserts what it must not
  stop being — the order, the stop, and the rule above.

## Two things the measurements settled

Both are load-bearing, and both are checked rather than remembered:

**The rails converge on where each leg aims.** Traced row by row, the gold
inlay in 01 runs from x≈0.49 at the bottom of the frame, bows out to x≈0.41,
and comes back to the TIMEMATIC doorway at x≈0.42. The corridor's two floor
lines in 04 converge on x≈0.50. Both sets of rails in 05 bend toward the
contact rotunda. No leg aims at a composition; each aims where the road in its
own frame already goes.

**The camera is at one height throughout.** Every aim lands between 0.468 and
0.546 of its own frame — the same eye level in five different places. That is
what makes these five pictures one walk, and it is why nothing on this route
tilts.

## Replacing one

Don't, casually. A canonical replacement is a decision about the journey, not
an asset swap: the aim, the opening it hands over through, the screen
rectangles and the scroll window all come off the frame, and all of them are
in `src/journey/route.ts`. Re-run `npm run assets:anchors`, move the numbers
across, re-run `npm run assets:plates`, and then `npm run audit:route` before
anything else.
