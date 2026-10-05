/** Popularity/rating helpers used for cold-start fallbacks and discovery rows. */

/** IMDb-style Bayesian average so a 9.0 from 12 votes doesn't outrank an 8.4 from 20,000. */
export function weightedRating(avg: number, votes: number, globalMean = 6.5, minVotes = 500): number {
  return (votes / (votes + minVotes)) * avg + (minVotes / (votes + minVotes)) * globalMean;
}

/** "Hidden gem": strongly rated by enough people, but not widely known. */
export function isHiddenGem(m: { voteAverage: number; voteCount: number; popularity: number }, popularityCeiling: number): boolean {
  return m.voteAverage >= 7.3 && m.voteCount >= 300 && m.popularity <= popularityCeiling;
}
