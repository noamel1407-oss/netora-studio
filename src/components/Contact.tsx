import { ContactForm } from './ContactForm';
import { useStageAnchor } from '../hooks/useStageAnchor';
import './Contact.css';

export function Contact() {
  const anchor = useStageAnchor('contact');

  return (
    <section className="contact section" id="contact" ref={anchor} aria-labelledby="contact-title">
      <div className="shell contact__inner">
        <div className="contact__visual">
          <div className="contact__orb" aria-hidden="true" />
        </div>

        <div className="contact__copy">
          <h2 className="contact__title reveal" id="contact-title">
            <span>העסק שלכם</span>{' '}
            <span className="gold">ראוי ליותר מעוד אתר.</span>
          </h2>

          <p className="contact__lede reveal">
            השאירו פרטים ונתאם שיחת שיווק לעסק שלכם —{' '}
            <strong className="gold">ללא עלות</strong>.
          </p>
        </div>

        <div className="contact__form reveal">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
