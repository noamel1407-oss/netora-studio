import { useEffect } from 'react';
import { Link } from 'react-router-dom';

import type { LegalPage as LegalPageData } from '../content/legal';
import { site } from '../site.config';
import './LegalPage.css';

export function LegalPage({ page }: { page: LegalPageData }) {
  useEffect(() => {
    document.title = `${page.title} — ${site.name}`;
  }, [page.title]);

  return (
    <article className="legal section">
      <div className="shell legal__inner">
        <Link className="legal__back" to="/">
          <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true">
            <path d="M18 5H1M6 1 1 5l5 4" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          חזרה לעמוד הבית
        </Link>

        <h1 className="legal__title">{page.title}</h1>
        <p className="legal__updated">{page.updated}</p>
        <p className="legal__intro">{page.intro}</p>

        {page.placeholder && (
          <p className="legal__notice" role="note">
            הנוסח בעמוד זה הוא נוסח זמני לצורכי הקמה. יש להחליפו בנוסח משפטי מלא לפני עליית האתר לאוויר.
          </p>
        )}

        {page.sections.map((section) => (
          <section className="legal__section" key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.items && (
              <ul className="legal__list">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}
