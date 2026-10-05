const BASE = "https://image.tmdb.org/t/p";
export const posterSizes = [185, 342, 500, 780] as const;
export const backdropSizes = [780, 1280] as const;
export const profileSizes = [185] as const;

export const imgUrl = (path: string, w: number) => `${BASE}/w${w}${path}`;
export const srcSet = (path: string, sizes: readonly number[]) => sizes.map((w) => `${imgUrl(path, w)} ${w}w`).join(", ");
