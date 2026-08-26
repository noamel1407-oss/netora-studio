import { useCallback, useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react';

import { ProjectScreen } from './ProjectScreen';
import { ACT2, GROUND, type Scene } from '../journey/scene';
import { useRoute } from '../journey/progress';
import { projects } from '../site.config';
import './RouteGreybox.css';

type Props = { scene: Scene };

/**
 * GREYBOX. Masses and openings, no architecture.
 *
 * This exists to prove one thing and nothing else: that SHAY → approach
 * TIMEMATIC → stop at its display → move *around* the display → into the
 * corridor → through it → out toward contact is one continuous physical camera
 * journey through one world. No materials, no lighting, no plaques, no
 * facade — those are the pass after this one, and only if the route reads.
 *
 * Every face here is real geometry standing in act one's own coordinate space,
 * placed by the same projection the floating platform is placed by, inside the
 * same `preserve-3d` subtree. Nothing is a picture of a place. The camera
 * grows things by approaching them, because `project()` divides by depth.
 *
 * ## The display
 *
 * `ACT2.wall` is one plane with exactly one hole in it, at `ACT2.opening`. The
 * display hangs on the solid part. The route crosses that plane once, through
 * the hole, 806–1795 units to the right of centre — so "the camera never
 * travels through the website" is not a rule anyone has to remember here. It
 * is a wall.
 *
 * The site itself is mapped onto that surface with the same `ProjectScreen`
 * the platform's monitor uses, so a real capture of TIMEMATIC dropped into
 * `public/media/` appears on it, and until then it carries the typographic
 * cover rather than a broken image.
 *
 * ## Why it is mounted only during act two
 *
 * Physically this architecture stands in the world the whole time, and at act
 * one's distances TIMEMATIC's facade would project to some 560px — plainly
 * visible from the city. That may well be right, and it is a question about
 * the journey rather than about the greybox: showing it would change every
 * frame of act one, which is the one thing this pass is not allowed to do. So
 * it is held until the route begins, and whether the city should see where it
 * is going is decided after the route itself is signed off.
 */
export function RouteGreybox({ scene }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  const watch = useMemo(() => projects.find((project) => project.id === 'watch') ?? null, []);

  /* World units → the stage's pixels. Positions follow the viewport on each
     axis; sizes take the uniform scale, so nothing is stretched — the same
     split `ProjectPlatform` uses. */
  const place = useMemo(() => {
    const px = (x: number) => scene.vp.x + x * scene.sx;
    const py = (y: number) => scene.vp.y + y * scene.sy;
    const size = (n: number) => `${(n * scene.s).toFixed(1)}px`;

    return {
      /** A plane facing the camera: the plane of a wall. */
      wall: (x0: number, x1: number, y0: number, y1: number, z: number): CSSProperties => ({
        width: size(x1 - x0),
        height: size(y1 - y0),
        transform: `translate3d(${px(x0).toFixed(1)}px, ${py(y0).toFixed(1)}px, ${z}px)`,
      }),
      /** A plane underfoot or overhead, laid down the z axis. */
      deck: (x0: number, x1: number, z0: number, z1: number, y: number): CSSProperties => ({
        width: size(x1 - x0),
        height: size(z0 - z1),
        transform: `translate3d(${px(x0).toFixed(1)}px, ${py(y).toFixed(1)}px, ${z0}px) rotateX(90deg)`,
      }),
      /** A plane stood on edge, running away from the camera. */
      side: (x: number, y0: number, y1: number, z0: number, z1: number): CSSProperties => ({
        width: size(z0 - z1),
        height: size(y1 - y0),
        transform: `translate3d(${px(x).toFixed(1)}px, ${py(y0).toFixed(1)}px, ${z0}px) rotateY(90deg)`,
      }),
    };
  }, [scene]);

  /* Held until the route begins — see the note above. Driven by style rather
     than by state so the scrub never re-renders React. */
  const onScroll = useCallback((progress: number) => {
    const root = rootRef.current;
    if (!root) return;
    root.style.visibility = progress > 0.0005 ? 'visible' : 'hidden';
  }, []);

  useRoute(onScroll);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (root) root.style.visibility = 'hidden';
  }, []);

  const { facade, hall, wall, display, opening, corridor, terrace, contact } = ACT2;

  /* The bays, evenly down the corridor. Greybox: a ring of four thin faces,
     which is enough to count as they pass and no more than that. */
  const bays = Array.from({ length: corridor.bays }, (_, i) => {
    const at = corridor.from + ((corridor.to - corridor.from) * (i + 0.5)) / corridor.bays;
    const inset = 110;
    return { at, inset };
  });

  return (
    <div className="grey" ref={rootRef} aria-hidden="true">
      {/* The plaza the route comes down onto, and the terrace it ends on. */}
      <i className="grey__face grey__face--floor" style={place.deck(-4000, 4000, ACT2.plaza.from, ACT2.plaza.to, GROUND)} />
      <i className="grey__face grey__face--floor" style={place.deck(-2000, 4200, terrace.from, terrace.to, GROUND)} />

      {/* TIMEMATIC's front: a mass with one opening, on the approach axis. */}
      <i className="grey__face grey__face--mass" style={place.wall(facade.x[0], facade.door.x[0], facade.top, GROUND, facade.z)} />
      <i className="grey__face grey__face--mass" style={place.wall(facade.door.x[1], facade.x[1], facade.top, GROUND, facade.z)} />
      <i className="grey__face grey__face--mass" style={place.wall(facade.door.x[0], facade.door.x[1], facade.top, facade.door.top, facade.z)} />

      {/* The hall. */}
      <i className="grey__face grey__face--floor" style={place.deck(hall.x[0], hall.x[1], hall.from, hall.to, GROUND)} />
      <i className="grey__face grey__face--ceil" style={place.deck(hall.x[0], hall.x[1], hall.from, hall.to, hall.top)} />
      <i className="grey__face grey__face--side" style={place.side(hall.x[0], hall.top, GROUND, hall.from, hall.to)} />
      <i className="grey__face grey__face--side" style={place.side(hall.x[1], hall.top, GROUND, hall.from, hall.to)} />

      {/*
        The far wall — one plane, one hole. Left of the hole it carries the
        display; right of it, and above it, it is solid. This is the whole of
        "the screens are surfaces": there is no way through except the opening.
      */}
      <i className="grey__face grey__face--mass" style={place.wall(hall.x[0], opening.x[0], hall.top, GROUND, wall.z)} />
      <i className="grey__face grey__face--mass" style={place.wall(opening.x[1], hall.x[1], hall.top, GROUND, wall.z)} />
      <i className="grey__face grey__face--mass" style={place.wall(opening.x[0], opening.x[1], hall.top, opening.top, wall.z)} />

      {/* The display, hanging on the solid part of that wall. */}
      <div
        className="grey__display"
        style={place.wall(display.x[0], display.x[1], display.y[0], display.y[1], wall.z + 20)}
      >
        <ProjectScreen
          src={watch?.thumbnail ?? null}
          title={watch?.title ?? 'TIMEMATIC'}
          subtitle={watch?.subtitle ?? ''}
        />
      </div>

      {/* The corridor. */}
      <i className="grey__face grey__face--floor" style={place.deck(corridor.x[0], corridor.x[1], corridor.from, corridor.to, GROUND)} />
      <i className="grey__face grey__face--ceil" style={place.deck(corridor.x[0], corridor.x[1], corridor.from, corridor.to, corridor.top)} />
      <i className="grey__face grey__face--side" style={place.side(corridor.x[0], corridor.top, GROUND, corridor.from, corridor.to)} />
      <i className="grey__face grey__face--side" style={place.side(corridor.x[1], corridor.top, GROUND, corridor.from, corridor.to)} />

      {bays.map(({ at, inset }) => (
        <div key={at} className="grey__bay">
          <i className="grey__face grey__face--bay" style={place.wall(corridor.x[0], corridor.x[0] + inset, corridor.top, GROUND, at)} />
          <i className="grey__face grey__face--bay" style={place.wall(corridor.x[1] - inset, corridor.x[1], corridor.top, GROUND, at)} />
          <i className="grey__face grey__face--bay" style={place.wall(corridor.x[0], corridor.x[1], corridor.top, corridor.top + inset, at)} />
        </div>
      ))}

      {/* The far arch, and the thing the route ends at. */}
      <i className="grey__face grey__face--bay" style={place.wall(corridor.x[0] - 260, corridor.x[0], corridor.top - 220, GROUND, corridor.to)} />
      <i className="grey__face grey__face--bay" style={place.wall(corridor.x[1], corridor.x[1] + 260, corridor.top - 220, GROUND, corridor.to)} />
      <i className="grey__face grey__face--bay" style={place.wall(corridor.x[0] - 260, corridor.x[1] + 260, corridor.top - 220, corridor.top, corridor.to)} />

      <i className="grey__face grey__face--mass" style={place.wall(contact.x[0], contact.x[1], contact.top, GROUND, contact.z)} />
      <i className="grey__face grey__face--side" style={place.side(contact.x[0], contact.top, GROUND, contact.z, contact.z - 900)} />
      <i className="grey__face grey__face--side" style={place.side(contact.x[1], contact.top, GROUND, contact.z, contact.z - 900)} />
    </div>
  );
}
