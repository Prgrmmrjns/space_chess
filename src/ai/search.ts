import { generateLegalMoves } from '../engine/moves'
import { playMoveObject } from '../engine/game'
import type { Difficulty, GameState, Move } from '../engine/types'
import { evaluate } from './evaluate'

export interface SearchResult {
  move: Move | null
  score: number
  nodes: number
  depth: number
}

const DIFFICULTY_DEPTH: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
}

/** Soft node budget so Hard stays responsive on 16×16. */
const DIFFICULTY_NODES: Record<Difficulty, number> = {
  easy: 2_000,
  medium: 12_000,
  hard: 40_000,
}

function orderMoves(_state: GameState, moves: Move[]): Move[] {
  return [...moves].sort((a, b) => {
    const score = (m: Move) => {
      let s = 0
      if (m.capture) s += 100
      if (m.promotion) s += 80
      if (m.colonizedPlanet || m.spawnedPawns?.length) s += 60
      // Prefer central advances lightly via destination
      const dest = m.finalTo ?? m.to
      s += 7 - Math.abs(dest.row - 7.5) * 0.3
      return s
    }
    return score(b) - score(a)
  })
}

export function chooseMove(
  state: GameState,
  difficulty: Difficulty,
  rng: () => number = Math.random,
): SearchResult {
  const moves = orderMoves(state, generateLegalMoves(state))
  if (moves.length === 0) {
    return { move: null, score: 0, nodes: 0, depth: 0 }
  }

  if (difficulty === 'easy' && rng() < 0.35) {
    // Occasional random blunder for Easy
    const move = moves[Math.floor(rng() * moves.length)]
    return { move, score: 0, nodes: moves.length, depth: 0 }
  }

  const maxDepth = DIFFICULTY_DEPTH[difficulty]
  const budget = { left: DIFFICULTY_NODES[difficulty], nodes: 0 }
  const perspective = state.turn

  let best: Move = moves[0]
  let bestScore = -Infinity

  for (const move of moves) {
    const child = playMoveObject(state, move)
    const score = -alphabeta(
      child,
      maxDepth - 1,
      -Infinity,
      Infinity,
      perspective,
      budget,
    )
    if (score > bestScore) {
      bestScore = score
      best = move
    }
    if (budget.left <= 0) break
  }

  // On Easy, sometimes pick second-best-ish
  if (difficulty === 'easy' && moves.length > 1 && rng() < 0.25) {
    best = moves[Math.floor(rng() * Math.min(3, moves.length))]
  }

  return {
    move: best,
    score: bestScore,
    nodes: budget.nodes,
    depth: maxDepth,
  }
}

function alphabeta(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  perspective: string,
  budget: { left: number; nodes: number },
): number {
  budget.nodes++
  budget.left--

  if (
    budget.left <= 0 ||
    depth <= 0 ||
    state.status === 'checkmate' ||
    state.status === 'stalemate' ||
    state.status === 'draw'
  ) {
    return evaluate(state, perspective as 'white' | 'black')
  }

  const moves = orderMoves(state, generateLegalMoves(state))
  if (moves.length === 0) {
    return evaluate(state, perspective as 'white' | 'black')
  }

  let best = -Infinity
  for (const move of moves) {
    const child = playMoveObject(state, move)
    const score = -alphabeta(child, depth - 1, -beta, -alpha, perspective, budget)
    if (score > best) best = score
    if (best > alpha) alpha = best
    if (alpha >= beta) break
    if (budget.left <= 0) break
  }
  return best
}
