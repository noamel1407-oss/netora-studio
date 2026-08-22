/**
 * Single place to swap real content in. Nothing here is referenced by the
 * layout code beyond what is typed below, so values can be replaced freely.
 */

export const site = {
  name: 'NETORA STUDIO',
  nameHe: 'נטורה סטודיו',
  instagram: 'https://www.instagram.com/netora.studio/',
  /** Digits only, international format. Set to null to hide every WhatsApp link. */
  whatsapp: '972500000000' as string | null,
  email: 'hello@netora.studio',
  /**
   * POST target for the contact form (Formspree, Make.com webhook, own API...).
   * While null, the form falls back to opening a prefilled WhatsApp/email draft.
   */
  contactEndpoint: null as string | null,
};

export const nav = [
  { id: 'work', label: 'עבודות' },
  { id: 'about', label: 'אודות' },
  { id: 'contact', label: 'יצירת קשר' },
];

/* --------------------------------------------------------------------------
   Vault intro. The mp4 is scrubbed by scroll rather than played, so it has to
   be encoded all-keyframe — `npm run encode:vault <source>` does that and
   re-cuts the poster from the result's own first frame. Swapping in a new
   render means re-running that, not just replacing the file.

   `webm` stays null on purpose: all-intra VP9 came out around three times the
   H.264, so offering it would hand Chromium users the heavier file. Point it
   at a copy only to test scrubbing in a browser without an H.264 decoder.
   -------------------------------------------------------------------------- */

export const vault = {
  video: {
    mp4: '/media/vault-video.mp4',
    webm: null as string | null,
    poster: '/media/vault-poster.webp',
  },
  /** Describes the intro for people who cannot see it. */
  description:
    'כספת מתכת כהה עם סמל N מוזהב נפתחת באיטיות וחושפת עיר לבנה שטופת אור שקיעה.',
};

/* --------------------------------------------------------------------------
   World backdrops — the architectural environment behind each scene. Drop
   files into public/media/ under these names; until one exists the section
   falls back to a quiet gradient in the same palette.
   -------------------------------------------------------------------------- */

export const world = {
  /**
   * Where the camera lands once the doorway has passed it — the open plaza,
   * with no vault framing in the image. It must stay that way: an image that
   * contains the doorway leaves the reader standing in it, since the layer
   * above is scaled aside precisely to uncover what is beyond.
   */
  city: '/media/world-city.webp',
  /** The marble terrace behind the two laptops. */
  works: '/media/world-works.webp',
  /** The arch + reflecting pool beside the contact form. */
  contact: '/media/world-contact.webp',
};

/* --------------------------------------------------------------------------
   Selected works
   -------------------------------------------------------------------------- */

export type Project = {
  id: string;
  /** Latin display title, as it appears on the laptop screen. */
  title: string;
  subtitle: string;
  /** One Hebrew line under the laptop. */
  description: string;
  /** The real site. Null hides the "לצפייה באתר" link until it exists. */
  liveUrl: string | null;
  /** Still shown on the laptop screen before the video plays. */
  thumbnail: string | null;
  /** Screen recording of the site. Missing file ⇒ the still stands alone. */
  video: { src: string; type: string };
  /** Describes the recording for people who cannot see it. */
  videoDescription: string;
};

export const projects: Project[] = [
  {
    id: 'watch',
    title: 'TIMEMATIC',
    subtitle: 'Time Beyond Time',
    description: 'אתר תדמית לשעוני יוקרה — כרונוגרפיה, חומרים והנדסה בקצב אחד.',
    /** Replace with the live URL when the site is up. */
    liveUrl: null,
    /** Drop a real screenshot at this path (public/media/watch-project.jpg). */
    thumbnail: '/media/watch-project.jpg',
    video: { src: '/media/watch-project.mp4', type: 'video/mp4' },
    videoDescription:
      'הקלטת מסך של אתר TIMEMATIC: עמוד הבית, עמוד הדגמים ותצוגת שעון תלת־ממדית.',
  },
  {
    id: 'jewelry',
    title: 'SHAY JEWELRY',
    subtitle: 'Timeless Elegance',
    description: 'אתר יוקרתי לחנות תכשיטים — אלגנטיות, חוויה ומכירה באותו מסך.',
    liveUrl: 'https://www.shaijewelry.site/',
    thumbnail: '/media/shay-jewellery-poster.jpg',
    video: { src: '/media/shay-jewellery.mp4', type: 'video/mp4' },
    videoDescription:
      'הקלטת מסך של אתר SHAY JEWELRY: מעבר בין עמוד הבית, גלריית התכשיטים ועמוד המוצר.',
  },
];

export const whatsappLink = (message: string) =>
  site.whatsapp ? `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}` : null;
