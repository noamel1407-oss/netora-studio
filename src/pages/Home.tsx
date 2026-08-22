import { useEffect } from 'react';

import { VaultHero } from '../components/VaultHero';
import { SelectedWorks } from '../components/SelectedWorks';
import { ContactSection } from '../components/ContactSection';
import { site } from '../site.config';

/**
 * `?solo=vault` renders the opening journey on its own. The rest of the page
 * is a strong visual crutch while judging the vault: with a whole bright site
 * underneath, a weak opening still reads as "fine, something follows". Alone,
 * it has to carry the screen by itself. Development aid only — the query is
 * read once and never linked to.
 */
function soloVault() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('solo') === 'vault';
}

export function Home() {
  const solo = soloVault();

  useEffect(() => {
    document.title = `${site.name} — בניית אתרים תלת־ממדיים לעסקים`;
  }, []);

  return (
    <div className="home" id="top">
      <VaultHero />
      {!solo && (
        <>
          <SelectedWorks />
          <ContactSection />
        </>
      )}
    </div>
  );
}
