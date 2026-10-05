import { imgUrl, srcSet } from "@/lib/images";

interface Props {
  path: string | null;
  alt: string;
  kind: "poster" | "backdrop" | "profile";
  sizes: string;
  priority?: boolean;
  className?: string;
}

const SETS = { poster: [185, 342, 500, 780], backdrop: [780, 1280], profile: [185] } as const;
const RATIO = { poster: "aspect-[2/3]", backdrop: "aspect-video", profile: "aspect-[2/3]" } as const;

/**
 * Responsive TMDB image: srcset picks the right size, lazy loading by default and a tinted
 * placeholder box (reserves space, so no layout shift). Falls back to a labelled box if no image.
 * Plain <img> on purpose: TMDB's CDN already serves resized variants.
 */
export function TmdbImage({ path, alt, kind, sizes, priority, className = "" }: Props) {
  const box = `${RATIO[kind]} overflow-hidden bg-surface-2 ${className}`;
  if (!path)
    return (
      <div className={`${box} grid place-items-center p-3 text-center text-xs text-muted`} role="img" aria-label={alt}>
        {kind === "profile" ? "No photo" : "No image"}
      </div>
    );
  const set = SETS[kind];
  return (
    <div className={box}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgUrl(path, set[Math.min(1, set.length - 1)])}
        srcSet={srcSet(path, set)}
        sizes={sizes}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className="h-full w-full object-cover"
      />
    </div>
  );
}
