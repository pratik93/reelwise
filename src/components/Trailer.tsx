"use client";
import { useState } from "react";

/** Click-to-load YouTube trailer: no third-party JS until the user asks (good for performance + privacy). */
export function Trailer({ videoKey, title }: { videoKey: string; title: string }) {
  const [play, setPlay] = useState(false);
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-line">
      {play ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoKey)}?autoplay=1&rel=0`}
          title={`Trailer for ${title}`}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button type="button" onClick={() => setPlay(true)} className="group absolute inset-0 grid place-items-center" aria-label={`Play trailer for ${title}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${encodeURIComponent(videoKey)}/hqdefault.jpg`} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute inset-0 bg-black/40 transition group-hover:bg-black/25" />
          <span className="relative grid h-16 w-16 place-items-center rounded-full bg-accent text-accent-fg shadow-xl transition group-hover:scale-105">
            <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          </span>
        </button>
      )}
    </div>
  );
}
