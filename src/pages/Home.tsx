import { useEffect } from 'react';

import { VaultHero } from '../components/VaultHero';
import { SelectedWorks } from '../components/SelectedWorks';
import { ContactSection } from '../components/ContactSection';
import { site } from '../site.config';

export function Home() {
  useEffect(() => {
    document.title = `${site.name} — בניית אתרים תלת־ממדיים לעסקים`;
  }, []);

  return (
    <div className="home" id="top">
      <VaultHero />
      <SelectedWorks />
      <ContactSection />
    </div>
  );
}
