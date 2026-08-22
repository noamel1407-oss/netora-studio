import { useState } from 'react';

import { ContactForm } from './ContactForm';
import { world } from '../site.config';
import './ContactSection.css';

/**
 * The journey's destination: open architecture on the left, a clean light
 * form on the right. The environment continues from the works terrace —
 * same world, softer light.
 */
export function ContactSection() {
  const [bgMissing, setBgMissing] = useState(false);

  return (
    <section
      className={`contact-sec${bgMissing ? ' contact-sec--no-image' : ''}`}
      id="contact"
      aria-labelledby="contact-title"
    >
      <img
        className="contact-sec__bg"
        src={world.contact}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        onError={() => setBgMissing(true)}
      />
      <div className="contact-sec__tint" aria-hidden="true" />

      <div className="shell contact-sec__inner">
        {/* The arch, pool and embedded N live in the artwork itself. */}
        <div className="contact-sec__visual" aria-hidden="true" />

        <div className="contact-sec__panel">
          <h2 className="contact-sec__title reveal" id="contact-title">
            <span>בואו נבנה את האתר</span>{' '}
            <span className="contact-sec__title-gold">הבא של העסק שלכם.</span>
          </h2>

          <p className="contact-sec__lede reveal">
            ספרו לנו על הפרויקט שלכם ונחזור אליכם במהרה.
          </p>

          <div className="contact-sec__card reveal">
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
