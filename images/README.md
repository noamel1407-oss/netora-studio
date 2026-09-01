# images/

Stills that are laid over the frame sequence, as opposed to `frames/` and
`frames-entrance/`, which are the sequence itself.

## treasure-room.jpeg

`index.html` dissolves this in over the held rotunda across the last stretch
of the scroll track, from 1030vh of travel to 1110vh, and then holds it for
the landing.

  - 900x1600, exactly 9:16, against the 720x1280 frames
  - JPEG, progressive, 4:2:0 chroma, quality about 75 off the tables, 218 KB

Its aspect ratio is also written into the stylesheet, as `--room-ar`, where it
rebuilds the rectangle `object-fit:cover` paints the still into so the two
door plates can be positioned as percentages of the PICTURE rather than of the
screen. Replacing this file with one of a different shape means changing that
number to match, or the plates slide off their panels as the crop moves.

Sized to be the source for a phone rather than a desktop: cover crops it to
about 475x844 CSS pixels on a 390-wide screen, which at a device ratio of 2 is
950x1688 against the 900x1600 here — just under 1:1, near enough at this size
but with nothing spare. Do not scale it down.

The 941x1672 still this replaces was a quality-92 4:4:4 conversion of a PNG
master, and it is in the history if either is ever wanted back: the JPEG up to
840a259, which deleted it, and the master at 57e8066.
