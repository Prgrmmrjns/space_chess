import { cloneState, createInitialState, positionKey } from './board'
import {
  applyMove,
  findMove,
  generateLegalMoves,
  isInCheck,
  updateStatus,
} from './moves'
import type {
  GameConfig,
  GameState,
  Move,
  PieceType,
  Pos,
} from './types'

export function startGame(config: GameConfig): GameState {
  const state = createInitialState(config.civs, config.space, config.seed)
  const keyed = cloneState(state)
  keyed.positionHistory = [positionKey(state)]
  return updateStatus(keyed)
}

export function getLegalMoves(state: GameState, from?: Pos): Move[] {
  if (state.status === 'checkmate' || state.status === 'stalemate' || state.status === 'draw') {
    return []
  }
  return generateLegalMoves(state, from)
}

export function playMove(
  state: GameState,
  from: Pos,
  to: Pos,
  promotion: PieceType = 'queen',
): { ok: true; state: GameState } | { ok: false; reason: string } {
  const legal = generateLegalMoves(state, from)
  const preferred = findMove(legal, from, to, promotion)
  const move = preferred ?? findMove(legal, from, to)
  if (!move) return { ok: false, reason: 'Illegal move' }

  let next = applyMove(state, move)
  next = updateStatus(next)
  return { ok: true, state: next }
}

export function playMoveObject(
  state: GameState,
  move: Move,
): GameState {
  let next = applyMove(state, move)
  next = updateStatus(next)
  return next
}

export function statusLabel(state: GameState): string {
  switch (state.status) {
    case 'check':
      return `${capitalize(state.turn)} is in check`
    case 'checkmate':
      return `Checkmate — ${capitalize(state.winner!)} wins`
    case 'stalemate':
      return 'Stalemate — draw'
    case 'draw':
      return 'Draw'
    default:
      return `${capitalize(state.turn)} to move`
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function sideInCheck(state: GameState): boolean {
  return isInCheck(state, state.turn)
}
