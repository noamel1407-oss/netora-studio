import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { LegalPage } from './pages/LegalPage';
import { legalPages } from './content/legal';
import { usePrefersReducedMotion } from './hooks/useMediaQuery';
import { useScrollReveal } from './hooks/useScrollReveal';

/** Route changes should land at the top; in-page anchors keep their behaviour. */
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

export function App() {
  const { pathname } = useLocation();
  const reducedMotion = usePrefersReducedMotion();
  const home = pathname === '/';

  useScrollReveal(!reducedMotion, pathname);

  return (
    <>
      <a className="skip-link" href="#main">
        דילוג לתוכן הראשי
      </a>

      <ScrollToTop />
      <Header home={home} />

      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          {legalPages.map((page) => (
            <Route key={page.path} path={page.path} element={<LegalPage page={page} />} />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer home={home} />
    </>
  );
}
