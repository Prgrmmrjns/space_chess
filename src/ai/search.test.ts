import { describe, expect, it } from 'vitest'
import { startGame } from '../engine/game'
import { chooseMove } from './search'

describe('AI search', () => {
  it('returns a legal move on the opening position', () => {
    const state = startGame({
      mode: 'pvai',
      difficulty: 'easy',
      playerColor: 'white',
      civs: { white: 'reptiloid', black: 'blob' },
      seed: 42,
    })
    const result = chooseMove(state, 'easy', () => 0.9)
    expect(result.move).not.toBeNull()
    expect(result.move!.from).toBeDefined()
    expect(result.move!.to).toBeDefined()
  })

  it('prefers a capture when obvious at depth 1', () => {
    const state = startGame({
      mode: 'pvai',
      difficulty: 'medium',
      playerColor: 'white',
      civs: { white: 'blob', black: 'blob' },
      space: {
        asteroids: [],
        planets: [],
        blackHoles: [],
        wormholePairs: [],
      },
    })
    // Clear and set hanging queen
    for (const row of state.board) {
      for (const sq of row) sq.piece = null
    }
    state.board[15][8].piece = { type: 'king', color: 'white', moved: true }
    state.board[0][8].piece = { type: 'king', color: 'black', moved: true }
    state.board[10][8].piece = { type: 'queen', color: 'black', moved: true }
    state.board[12][8].piece = { type: 'rook', color: 'white', moved: true }
    state.turn = 'white'
    const result = chooseMove(state, 'medium', () => 0.5)
    expect(result.move?.to).toEqual({ row: 10, col: 8 })
  })
})
