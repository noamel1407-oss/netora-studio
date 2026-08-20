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
  { id: 'reviews', label: 'לקוחות / ביקורות' },
  { id: 'about', label: 'אודות' },
  { id: 'contact', label: 'יצירת קשר' },
];

export type Project = {
  index: string;
  title: string;
  description: string;
  href: string;
  /** Replace with the real screen recording. Keep it muted-friendly and short. */
  video: { src: string; type: string; poster: string };
  /** Describes the recording for people who cannot see it. */
  videoDescription: string;
  /**
   * `click` — poster + play button (default).
   * `autoplay` — muted loop while the laptop is on screen.
   *
   * Switch here, or set `videoMode` on an individual project below.
   */
  videoMode: 'click' | 'autoplay';
};

export const projects: Project[] = [
  {
    index: '01',
    title: 'SHAY JEWELLERY',
    description:
      'אתר יוקרתי לחנות תכשיטים — אלגנטיות, חוויה ומכירה באותו מסך.',
    href: 'https://shayjewellery.co.il',
    videoMode: 'click',
    video: {
      /** Drop the real recording here — ProjectLaptop reads this path as-is. */
      src: '/media/shay-jewellery.mp4',
      type: 'video/mp4',
      poster: '/media/shay-jewellery-poster.jpg',
    },
    videoDescription:
      'הקלטת מסך של אתר SHAY JEWELLERY: מעבר בין עמוד הבית, גלריית התכשיטים ועמוד המוצר.',
  },
];

export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  role: string;
  rating: number;
};

export const testimonials: Testimonial[] = [
  {
    id: 'shay',
    quote: 'האתר החדש שלנו נראה יוקרתי בדיוק כמו התכשיטים עצמם. הלקוחות מרגישים את זה מהשנייה הראשונה.',
    name: 'שי',
    role: 'SHAY JEWELLERY',
    rating: 5,
  },
  {
    id: 'yossi',
    quote: 'האתר החדש שלנו פשוט מדהים! מקצועיות, יצירתיות ודיוק עד הפרט הקטן. תודה על חוויה ייצאת מן הכלל.',
    name: 'יוסי',
    role: 'חנות חיות',
    rating: 5,
  },
  {
    id: 'amit',
    quote: 'תהליך מסודר, ניקוד מדויק ותוצאה שעלתה מעל לציפיות. ממליצים בחום!',
    name: 'עמית כהן',
    role: 'סטודיו כושר',
    rating: 5,
  },
  {
    id: 'daniel',
    quote: 'שירות ברמה אחרת. ירידה לפרטים והבנה עמוקה של הצרכים, תוצאה פשוט מושלמת.',
    name: 'דניאל לוי',
    role: 'קליניקת בריאות',
    rating: 5,
  },
];

export const whatsappLink = (message: string) =>
  site.whatsapp ? `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}` : null;
