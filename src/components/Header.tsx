import { useEffect, useRef, useState } from 'react';

import { Logo } from './Logo';
import { nav } from '../site.config';
import './Header.css';

type Props = {
  /** Anchor targets live on the home page; other routes link back to it. */
  home: boolean;
};

export function Header({ home }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open]);

  const href = (id: string) => (home ? `#${id}` : `/#${id}`);

  return (
    <header className={`header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="header__inner shell">
        <a className="header__brand" href={home ? '#top' : '/'} aria-label="NETORA STUDIO — לעמוד הבית">
          <Logo />
        </a>

        <nav className="header__nav" aria-label="ניווט ראשי">
          <a className="btn btn--small header__cta" href={href('contact')}>
            דברו איתנו
          </a>
          <ul className="header__links">
            {nav.map((item) => (
              <li key={item.id}>
                <a href={href(item.id)}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <button
          ref={toggleRef}
          type="button"
          className="header__burger"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="visually-hidden">{open ? 'סגירת התפריט' : 'פתיחת התפריט'}</span>
          <span className={`header__burger-icon${open ? ' is-open' : ''}`} aria-hidden="true">
            <i />
            <i />
          </span>
        </button>
      </div>

      <div
        id="mobile-nav"
        ref={panelRef}
        className={`header__panel${open ? ' is-open' : ''}`}
        hidden={!open}
      >
        <nav aria-label="ניווט נייד">
          <ul>
            {nav.map((item) => (
              <li key={item.id}>
                <a href={href(item.id)} onClick={() => setOpen(false)}>
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <a className="btn header__panel-cta" href={href('contact')} onClick={() => setOpen(false)}>
                דברו איתנו
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
