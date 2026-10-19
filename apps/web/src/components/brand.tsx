import { useId } from "react";

/**
 * The Hustera mark: two pathways — a person and an AI agent — joined into an
 * "H" by a rising bridge, with a four-point creative spark. Original vector artwork.
 */
export function LogoMark({ size = 32, mono = false, onLight = false, className }: { size?: number; mono?: boolean; onLight?: boolean; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const left = mono ? "currentColor" : `url(#hl-${uid})`;
  const right = mono ? "currentColor" : `url(#hr-${uid})`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
      {!mono && (
        <defs>
          <linearGradient id={`hl-${uid}`} x1="10" y1="6" x2="34" y2="54" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8B7FFF" />
            <stop offset="1" stopColor="#5546E8" />
          </linearGradient>
          <linearGradient id={`hr-${uid}`} x1="54" y1="58" x2="30" y2="10" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2FD9A8" />
            <stop offset="1" stopColor="#7BFFD9" />
          </linearGradient>
        </defs>
      )}
      <path d="M16 8v48" stroke={left} strokeWidth="10" strokeLinecap="round" />
      <path d="M16 44l32-18" stroke={left} strokeWidth="10" strokeLinecap="round" />
      <path d="M48 8v48" stroke={right} strokeWidth="10" strokeLinecap="round" />
      <path
        transform="translate(30 20) scale(0.6) translate(-32 -32)"
        d="M32 21.5c.9 6.4 4.1 9.6 10.5 10.5-6.4.9-9.6 4.1-10.5 10.5-.9-6.4-4.1-9.6-10.5-10.5 6.4-.9 9.6-4.1 10.5-10.5Z"
        fill={mono ? "currentColor" : onLight ? "#081020" : "#F7F9FF"}
      />
    </svg>
  );
}

export function Wordmark({ size = 32, className, tagline = false }: { size?: number; className?: string; tagline?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark size={size} />
      <span className="leading-none">
        <span className="block font-extrabold tracking-[-0.04em] text-cloud" style={{ fontSize: size * 0.72 }}>
          hustera
        </span>
        {tagline && <span className="mt-1 block text-[11px] font-medium text-muted">Build together. Earn independently.</span>}
      </span>
    </span>
  );
}
