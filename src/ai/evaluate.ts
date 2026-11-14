import { BOARD_SIZE } from '../engine/constants'
import { isInCheck } from '../engine/moves'
import type { Color, GameState, PieceType } from '../engine/types'
import { PIECE_VALUES, opponent } from '../engine/types'

const CENTER = (BOARD_SIZE - 1) / 2

const PIECE_SQUARE: Partial<Record<PieceType, number>> = {
  pawn: 8,
  knight: 6,
  bishop: 4,
  rook: 2,
  queen: 1,
  king: -4,
}

export function evaluate(state: GameState, perspective: Color): number {
  if (state.status === 'checkmate') {
    return state.winner === perspective ? 100_000 : -100_000
  }
  if (state.status === 'stalemate' || state.status === 'draw') return 0

  let score = 0

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const sq = state.board[row][col]
      if (!sq.piece) {
        if (sq.hazard === 'planet' && sq.planetOwner) {
          const s = sq.planetOwner === perspective ? 40 : -40
          score += s
        }
        continue
      }
      const sign = sq.piece.color === perspective ? 1 : -1
      score += sign * PIECE_VALUES[sq.piece.type]

      const dist =
        Math.abs(row - CENTER) + Math.abs(col - CENTER)
      const mobilityBias = PIECE_SQUARE[sq.piece.type] ?? 0
      score += sign * mobilityBias * (14 - dist)

      // Advance pawns
      if (sq.piece.type === 'pawn') {
        const progress =
          sq.piece.color === 'white' ? 15 - row : row
        score += sign * progress * 6
      }
    }
  }

  if (isInCheck(state, opponent(perspective))) score += 35
  if (isInCheck(state, perspective)) score -= 35

  const myCiv = state.civs[perspective]
  if (myCiv === 'blob') score += state.space.blackHoles.length * 12
  if (myCiv === 'solarite') score += state.space.stars.length * 6
  if (myCiv === 'crustacean') score += state.space.asteroids.length * 4
  if (myCiv === 'silicate') score += state.space.planets.length * 4
  if (myCiv === 'reptiloid') {
    const claimable = state.space.planets.filter((planet) => planet.owner !== perspective).length
    score += claimable * 8
  }

  return score
}
