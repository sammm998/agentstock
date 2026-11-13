import { useId } from "react";

/**
 * The Hustera mark: two pillars — a person (indigo) and an AI agent (mint) —
 * interlocked into an "H" by a rising bridge, with a four-point creative spark.
 * Original vector artwork.
 */
export function LogoMark({ size = 32, mono = false, onLight = false, className }: { size?: number; mono?: boolean; onLight?: boolean; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const left = mono ? "currentColor" : `url(#hl-${uid})`;
  const right = mono ? "currentColor" : `url(#hr-${uid})`;
  const bridge = mono ? "currentColor" : `url(#hb-${uid})`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
      {!mono && (
        <defs>
          <linearGradient id={`hl-${uid}`} x1="0" y1="0" x2="0.6" y2="1">
            <stop stopColor="#8F7CFF" />
            <stop offset="1" stopColor="#5A3FE6" />
          </linearGradient>
          <linearGradient id={`hr-${uid}`} x1="1" y1="1" x2="0.3" y2="0">
            <stop stopColor="#22D3A6" />
            <stop offset="1" stopColor="#7CF5DA" />
          </linearGradient>
          <linearGradient id={`hb-${uid}`} x1="0" y1="1" x2="1" y2="0">
            <stop stopColor="#6A4DF0" />
            <stop offset="1" stopColor="#3FE0B8" />
          </linearGradient>
        </defs>
      )}
      <path d="M13.5 38 L50.5 18 L50.5 33 L13.5 53 Z" fill={bridge} opacity={mono ? 0.7 : 1} />
      <rect x="5" y="4" width="17" height="56" rx="8.5" fill={left} />
      <rect x="42" y="4" width="17" height="56" rx="8.5" fill={right} />
      <path
        transform="translate(31 17) scale(0.62) translate(-32 -32)"
        d="M32 21.5c.9 6.4 4.1 9.6 10.5 10.5-6.4.9-9.6 4.1-10.5 10.5-.9-6.4-4.1-9.6-10.5-10.5 6.4-.9 9.6-4.1 10.5-10.5Z"
        fill={mono ? "currentColor" : onLight ? "#22B88F" : "#4EF2C2"}
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
