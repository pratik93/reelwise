/** "What should I watch tonight" quiz: maps answers to filters + a ranking function. */

export type Mood = "happy" | "thrilled" | "thoughtful" | "scared" | "romantic" | "adventurous";
export type TimeAvailable = "short" | "normal" | "long";
export type Appetite = "familiar" | "any" | "surprise";
export type Era = "new" | "any" | "classic";

export interface QuizAnswers { mood: Mood; time: TimeAvailable; appetite: Appetite; era: Era }

/** TMDB genre ids that fit each mood. */
export const MOOD_GENRES: Record<Mood, { ids: number[]; label: string }> = {
  happy: { ids: [35, 10751, 16, 10402], label: "feel-good" },
  thrilled: { ids: [28, 53, 80, 12], label: "edge-of-your-seat" },
  thoughtful: { ids: [18, 99, 36, 878, 9648], label: "thought-provoking" },
  scared: { ids: [27, 9648, 53], label: "spooky" },
  romantic: { ids: [10749, 35, 18], label: "romantic" },
  adventurous: { ids: [12, 14, 878, 37], label: "adventurous" },
};

export function quizFilters(a: QuizAnswers, now = new Date()) {
  const thisYear = now.getFullYear();
  return {
    genreIds: MOOD_GENRES[a.mood].ids,
    maxRuntime: a.time === "short" ? 100 : a.time === "normal" ? 140 : undefined,
    minRuntime: a.time === "long" ? 120 : undefined,
    minYear: a.era === "new" ? thisYear - 5 : undefined,
    maxYear: a.era === "classic" ? 1999 : undefined,
    // Familiar = crowd-pleasers; surprise = well rated but lesser known.
    minVotes: a.appetite === "surprise" ? 300 : 1000,
    minRating: a.appetite === "familiar" ? 7 : 7.2,
    sort: a.appetite === "surprise" ? ("gems" as const) : ("popular" as const),
  };
}

export function quizReason(a: QuizAnswers, m: { genres: string[]; runtime: number | null; year: number | null }): string {
  const bits = [`a ${MOOD_GENRES[a.mood].label} pick`];
  if (a.time === "short" && m.runtime) bits.push(`only ${m.runtime} minutes`);
  if (a.time === "long" && m.runtime) bits.push(`${m.runtime} minutes to settle into`);
  if (a.era === "classic" && m.year) bits.push(`a classic from ${m.year}`);
  if (a.era === "new" && m.year) bits.push(`recent (${m.year})`);
  if (a.appetite === "surprise") bits.push("a lesser-known gem");
  if (a.appetite === "familiar") bits.push("a crowd favourite");
  return `${bits[0][0].toUpperCase()}${bits[0].slice(1)}${bits.length > 1 ? ": " + bits.slice(1).join(", ") : ""}`;
}
