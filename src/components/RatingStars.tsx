"use client";
import { useState } from "react";

/**
 * 10-point rating shown as 5 stars with half-star steps. Implemented as a radio group of
 * 10 buttons (two per star) so it is fully keyboard and screen-reader operable.
 */
export function RatingStars({ value, onChange, size = "md" }: { value: number | null; onChange: (v: number | null) => void; size?: "sm" | "md" }) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  const px = size === "sm" ? "h-5 w-5" : "h-7 w-7";
  return (
    <div className="inline-flex items-center gap-2">
      <div role="radiogroup" aria-label="Your rating out of 10" className="inline-flex" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((star) => {
          const fill = Math.max(0, Math.min(1, (shown - (star - 1) * 2) / 2));
          return (
            <span key={star} className={`relative ${px}`}>
              <svg viewBox="0 0 24 24" className={`absolute inset-0 ${px}`} aria-hidden="true">
                <defs><clipPath id={`c${size}${star}`}><rect x="0" y="0" width={24 * fill} height="24" /></clipPath></defs>
                <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" fill="var(--accent)" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round" clipPath={`url(#c${size}${star})`} />
              </svg>
              {[star * 2 - 1, star * 2].map((v, i) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={value === v}
                  aria-label={`Rate ${v} out of 10`}
                  onMouseEnter={() => setHover(v)}
                  onFocus={() => setHover(v)}
                  onBlur={() => setHover(null)}
                  onClick={() => onChange(value === v ? null : v)}
                  className={`absolute top-0 h-full w-1/2 ${i === 0 ? "left-0" : "right-0"}`}
                />
              ))}
            </span>
          );
        })}
      </div>
      <span className="min-w-[3.5ch] text-sm text-muted" aria-live="polite">{value ? `${value}/10` : "Not rated"}</span>
    </div>
  );
}
