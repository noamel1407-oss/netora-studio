# images/

Stills that are laid over the frame sequence, as opposed to `frames/` and
`frames-entrance/`, which are the sequence itself.

## treasure-room.jpeg

`index.html` dissolves this in over the held rotunda across the last stretch
of the scroll track, from 1030vh of travel to 1110vh, and then holds it for
the landing.

  - 1024x1536, 2:3
  - JPEG, progressive, 4:2:0 chroma, 309 KB

Two things in `index.html` are measured off this file rather than read from
it at runtime, so both have to be re-checked whenever it is replaced:

  - `--room-ar` in the stylesheet, which is the file's own width/height. It
    rebuilds the exact rectangle `object-fit:cover` paints the still into, so
    that a percentage inside `.room-cta-fit` is a percentage of the PICTURE at
    every viewport ratio. Wrong here and the two door plates drift off their
    anchors as the crop changes under them.
  - `--room-cta-left-x/y` and `--room-cta-right-x/y`, the plate anchors, which
    are picture coordinates read off the still by eye.

The 9:16 predecessor and its 941x1672 PNG master are in the history at
d7765bd and 57e8066 if either is ever wanted back. That one was 4:4:4, chosen
because fine gold filigree on deep blue is exactly the high-chroma-contrast
content subsampling smears; this one arrived already encoded 4:2:0 and has not
been re-encoded, since the only master available is the delivered JPEG and a
second pass would cost generations for nothing.

Sized to be the source for a phone rather than a desktop: cover crops it to
about 563x844 CSS pixels on a 390-wide screen, a little under 1:1 at a device
ratio of 2. Do not scale it down.
