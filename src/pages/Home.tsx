import { useEffect } from 'react';

import { Hero } from '../components/Hero';
import { SelectedWork } from '../components/SelectedWork';
import { Reviews } from '../components/Reviews';
import { Contact } from '../components/Contact';
import { NetoraStage } from '../components/NetoraStage';
import { GoldenFlow } from '../components/GoldenFlow';
import { site } from '../site.config';

export function Home() {
  useEffect(() => {
    document.title = `${site.name} — בניית אתרים תלת־ממדיים לעסקים`;
  }, []);

  return (
    <div className="home" id="top">
      <NetoraStage />
      <GoldenFlow />
      <Hero />
      <SelectedWork />
      <Reviews />
      <Contact />
    </div>
  );
}
