import { nextElo } from '../engine/elo'
import { playMove, startGame } from '../engine/game'
import type { Civilization, Color, GameState, PieceType, Pos } from '../engine/types'

const CLAIM_MS = 60_000

export interface PlyRecord {
  n?: number
  by: string
  kind: 'move' | 'resign' | 'claim'
  from?: Pos
  to?: Pos
  promotion?: PieceType
  at: number
}

export interface ReplaySeat {
  id: string
  white_id: string
  black_id: string | null
  white_civ: Civilization
  black_civ: Civilization | null
  updated_at: string
  created_at?: string
  server_at?: string
}

export interface ReplayResult {
  ok: boolean
  state: GameState | null
  over: boolean
  winner: Color | null
  /** Server time of the last accepted ply, or of the opening. */
  clockAt: number
}

/** Same opening for both pilots. Neither player picks the seed after seeing the other. */
export function openingSeed(matchId: string): number {
  let hash = 2166136261
  for (let i = 0; i < matchId.length; i++) {
    hash ^= matchId.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/**
 * Replay the append-only ply list from the opening.
 * A stored board is never consulted: a poisoned position or a backdated clock cannot confirm a result.
 */
export function replayMatch(match: ReplaySeat, plies: PlyRecord[]): ReplayResult {
  const openedAt = Date.parse(match.server_at ?? match.created_at ?? match.updated_at)
  if (!match.black_id || !match.black_civ) {
    return { ok: true, state: null, over: false, winner: null, clockAt: openedAt }
  }
  let state = startGame({
    mode: 'pvp',
    difficulty: 'medium',
    playerColor: 'white',
    civs: { white: match.white_civ, black: match.black_civ },
    seed: openingSeed(match.id),
  })
  let clockAt = Number.isFinite(openedAt) ? openedAt : 0
  for (let index = 0; index < plies.length; index++) {
    const ply = plies[index]
    if (typeof ply.n === 'number' && ply.n !== index) {
      return { ok: false, state, over: false, winner: null, clockAt }
    }
    const color = ply.by === match.white_id ? 'white' : ply.by === match.black_id ? 'black' : null
    if (!color) return { ok: false, state, over: false, winner: null, clockAt }
    if (ply.kind === 'resign') {
      return {
        ok: true,
        state,
        over: true,
        winner: color === 'white' ? 'black' : 'white',
        clockAt: ply.at,
      }
    }
    if (ply.kind === 'claim') {
      if (state.turn === color || ply.at - clockAt < CLAIM_MS) {
        return { ok: false, state, over: false, winner: null, clockAt }
      }
      return { ok: true, state, over: true, winner: color, clockAt: ply.at }
    }
    if (state.turn !== color || !ply.from || !ply.to) {
      return { ok: false, state, over: false, winner: null, clockAt }
    }
    const played = playMove(state, ply.from, ply.to, ply.promotion ?? 'queen')
    if (!played.ok) return { ok: false, state, over: false, winner: null, clockAt }
    state = played.state
    clockAt = ply.at
    if (state.status === 'checkmate' || state.status === 'stalemate' || state.status === 'draw') {
      return {
        ok: true,
        state,
        over: true,
        winner: state.status === 'checkmate' ? state.winner : null,
        clockAt,
      }
    }
  }
  return { ok: true, state, over: false, winner: null, clockAt }
}

export function awardsMatch(match: {
  winner: Color | null
  white_before?: number | null
  black_before?: number | null
  white_elo?: number | null
  black_elo?: number | null
}): boolean {
  if (typeof match.white_before !== 'number' || typeof match.black_before !== 'number') return false
  if (typeof match.white_elo !== 'number' || typeof match.black_elo !== 'number') return false
  const whiteScore = match.winner === 'white' ? 1 : match.winner === 'black' ? 0 : 0.5
  return (
    match.white_elo === nextElo(match.white_before, match.black_before, whiteScore) &&
    match.black_elo === nextElo(match.black_before, match.white_before, 1 - whiteScore)
  )
}
