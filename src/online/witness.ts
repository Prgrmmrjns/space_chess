import { positionKey } from '../engine/board'
import { playMoveObject } from '../engine/game'
import { generateLegalMoves } from '../engine/moves'
import type { Color } from '../engine/types'
import { opponent } from '../engine/types'
import type { MatchRow } from './server'

const CLAIM_MS = 60_000

/**
 * Whether `myColor` should record acceptance of an opponent's finish.
 * A resignation that hands me the win, a timeout the clock already earned,
 * or one legal move from the position I last saw. A frozen board that
 * declares me the loser is not accepted unless the minute has actually passed.
 */
export function opponentFinishIsAcceptable(
  prev: MatchRow,
  next: MatchRow,
  myColor: Color,
  now = Date.now(),
): boolean {
  if (prev.status !== 'playing' || next.status !== 'done') return false
  if (!prev.state || !next.state || !prev.black_id) return false
  if (prev.white_id !== next.white_id || prev.black_id !== next.black_id) return false
  if (next.winner !== myColor && next.winner !== opponent(myColor) && next.winner !== null) return false

  const frozen = positionKey(prev.state) === positionKey(next.state)
  const elapsed = now - Date.parse(prev.updated_at)
  if (frozen) {
    if (next.winner === myColor) return true
    return next.winner === opponent(myColor) && prev.state.turn === myColor && elapsed >= CLAIM_MS
  }

  for (const move of generateLegalMoves(prev.state)) {
    const played = playMoveObject(prev.state, move)
    const terminal =
      played.status === 'checkmate' || played.status === 'stalemate' || played.status === 'draw'
    if (!terminal) continue
    if (positionKey(played) !== positionKey(next.state)) continue
    const winner = played.status === 'checkmate' ? played.winner : null
    if (winner !== next.winner) continue
    return true
  }
  return false
}
