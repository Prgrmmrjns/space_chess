/** Standard chess expectation. 400 points is a 10:1 favourite. */
export function expectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400))
}

/** Integer Elo update. `score` is 1 win, 0.5 draw, 0 loss. */
export function nextElo(
  rating: number,
  opponentRating: number,
  score: number,
  k = 32,
): number {
  return Math.round(rating + k * (score - expectedScore(rating, opponentRating)))
}
