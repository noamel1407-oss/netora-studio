import type { ReactNode } from 'react';

import './LaptopMockup.css';

/**
 * Silver MacBook-style frame. Pure presentation — whatever is passed as
 * children fills the screen (ProjectVideo in practice).
 */
export function LaptopMockup({ children }: { children: ReactNode }) {
  return (
    <div className="laptop">
      <div className="laptop__lid">
        <div className="laptop__screen">
          {children}
          <span className="laptop__glare" aria-hidden="true" />
        </div>
        <span className="laptop__camera" aria-hidden="true" />
      </div>
      <div className="laptop__base" aria-hidden="true">
        <span className="laptop__notch" />
      </div>
    </div>
  );
}
