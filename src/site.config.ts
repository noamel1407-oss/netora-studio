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
   Vault intro — drop the final Higgsfield render into public/media/ under
   these exact names and everything picks it up. `webm` is optional; leave it
   null until (if) a WebM encode exists. The poster doubles as the first frame
   while the video loads and as the whole hero when it is missing.
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
   World backdrops — the architectural environment behind each scene.
   Same deal: drop files into public/media/ under these names. Until a file
   exists the section falls back to a quiet gradient in the same palette.
   -------------------------------------------------------------------------- */

export const world = {
  /** Seen through the vault opening, behind the headline. */
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
    liveUrl: 'https://shayjewellery.co.il',
    thumbnail: '/media/shay-jewellery-poster.jpg',
    video: { src: '/media/shay-jewellery.mp4', type: 'video/mp4' },
    videoDescription:
      'הקלטת מסך של אתר SHAY JEWELRY: מעבר בין עמוד הבית, גלריית התכשיטים ועמוד המוצר.',
  },
];

export const whatsappLink = (message: string) =>
  site.whatsapp ? `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}` : null;
