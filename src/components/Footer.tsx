import { Link } from 'react-router-dom';

import { Logo } from './Logo';
import { nav, site, whatsappLink } from '../site.config';
import { legalPages } from '../content/legal';
import './Footer.css';

export function Footer({ home }: { home: boolean }) {
  const href = (id: string) => (home ? `#${id}` : `/#${id}`);
  const whatsapp = whatsappLink('שלום, הגעתי מהאתר של נטורה סטודיו ואשמח לפרטים.');

  return (
    <footer className="footer" id="site-footer">
      <div className="shell footer__inner">
        <Link className="footer__brand" to="/" aria-label="NETORA STUDIO — לעמוד הבית">
          <Logo compact />
        </Link>

        <nav className="footer__nav" aria-label="ניווט בתחתית העמוד">
          <ul>
            {nav.map((item) => (
              <li key={item.id}>
                <a href={href(item.id)}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <ul className="footer__social">
          <li>
            <a
              className="footer__icon"
              href={site.instagram}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="visually-hidden">Instagram — נפתח בחלון חדש</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="2" y="2" width="12" height="12" rx="3.2" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="8" cy="8" r="2.6" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="11.5" cy="4.5" r="0.7" fill="currentColor" />
              </svg>
            </a>
          </li>
          {whatsapp && (
            <li>
              <a className="footer__icon" href={whatsapp} target="_blank" rel="noopener noreferrer">
                <span className="visually-hidden">WhatsApp — נפתח בחלון חדש</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M8 1.6A6.4 6.4 0 0 0 2.4 12L1.6 14.4 4.1 13.6A6.4 6.4 0 1 0 8 1.6Z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M5.6 6.4c.2 1.4 1.4 2.7 2.8 3.2l.9-.7.9.4v1.1c-.1.3-.5.5-1 .5C6.8 10.8 5 9 4.6 6.8c0-.5.2-.9.5-1h1.1l.4.9z"
                    fill="currentColor"
                  />
                </svg>
              </a>
            </li>
          )}
        </ul>
      </div>

      <div className="shell footer__bottom">
        <nav className="footer__legal" aria-label="מידע משפטי ונגישות">
          <ul>
            {legalPages.map((page) => (
              <li key={page.path}>
                <Link to={page.path}>{page.navLabel}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="footer__copyright">
          © {new Date().getFullYear()} {site.name} — כל הזכויות שמורות
        </p>
      </div>
    </footer>
  );
}
