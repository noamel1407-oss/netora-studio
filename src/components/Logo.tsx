export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`logo${compact ? ' logo--compact' : ''}`}>
      <span className="logo__name">NETORA</span>
      <span className="logo__sub" aria-hidden="true">
        <i />
        STUDIO
        <i />
      </span>
    </span>
  );
}
