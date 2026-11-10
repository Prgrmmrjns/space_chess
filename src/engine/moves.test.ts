import { describe, expect, it } from 'vitest'
import { BOARD_SIZE, PIECE_START_COL } from './constants'
import { createInitialState, findKing, getSquare } from './board'
import {
  applyMove,
  generateLegalMoves,
  isInCheck,
  isSquareAttacked,
  updateStatus,
} from './moves'
import { playMove, startGame } from './game'
import type { GameState, Pos, SpaceLayout } from './types'

const emptySpace: SpaceLayout = {
  asteroids: [],
  planets: [],
  blackHoles: [],
  wormholePairs: [],
}

function bare(civs = { white: 'blob' as const, black: 'blob' as const }): GameState {
  return createInitialState(civs, emptySpace)
}

describe('board setup', () => {
  it('is 16×16 with kings on the back ranks', () => {
    const state = bare()
    expect(state.board).toHaveLength(BOARD_SIZE)
    expect(state.board[0]).toHaveLength(BOARD_SIZE)
    expect(findKing(state, 'white')).toEqual({ row: 15, col: PIECE_START_COL + 4 })
    expect(findKing(state, 'black')).toEqual({ row: 0, col: PIECE_START_COL + 4 })
  })

  it('places eight pawns per side', () => {
    const state = bare()
    let whitePawns = 0
    let blackPawns = 0
    for (const row of state.board) {
      for (const sq of row) {
        if (sq.piece?.type === 'pawn' && sq.piece.color === 'white') whitePawns++
        if (sq.piece?.type === 'pawn' && sq.piece.color === 'black') blackPawns++
      }
    }
    expect(whitePawns).toBe(8)
    expect(blackPawns).toBe(8)
  })
})

describe('pawn moves', () => {
  it('allows single and double steps from the start row', () => {
    const state = bare()
    const from: Pos = { row: 14, col: 7 }
    const moves = generateLegalMoves(state, from)
    const dests = moves.map((m) => m.to.row)
    expect(dests).toContain(13)
    expect(dests).toContain(12)
  })
})

describe('sliding pieces and asteroids', () => {
  it('blocks non-crustacean rooks with asteroids', () => {
    const layout: SpaceLayout = {
      asteroids: [{ row: 10, col: 4 }],
      planets: [],
      blackHoles: [],
      wormholePairs: [],
    }
    const state = createInitialState(
      { white: 'reptiloid', black: 'blob' },
      layout,
    )
    // Clear path partially — remove pawn in front of rook
    state.board[14][4].piece = null
    const moves = generateLegalMoves(state, { row: 15, col: 4 })
    expect(moves.some((m) => m.to.row === 10 && m.to.col === 4)).toBe(false)
    expect(moves.some((m) => m.to.row > 10 && m.to.col === 4)).toBe(true)
  })

  it('lets crustaceans land on asteroids and shove them', () => {
    const layout: SpaceLayout = {
      asteroids: [{ row: 12, col: 4 }],
      planets: [],
      blackHoles: [],
      wormholePairs: [],
    }
    const state = createInitialState(
      { white: 'crustacean', black: 'blob' },
      layout,
    )
    state.board[14][4].piece = null
    state.board[13][4].piece = null
    const moves = generateLegalMoves(state, { row: 15, col: 4 })
    const onto = moves.find((m) => m.to.row === 12 && m.to.col === 4)
    expect(onto).toBeTruthy()
    const next = applyMove(state, onto!)
    expect(next.board[12][4].piece?.type).toBe('rook')
    expect(next.board[12][4].hazard).not.toBe('asteroid')
    // Pushed toward black (up)
    expect(
      next.board.some((row, r) =>
        row.some((sq, c) => sq.hazard === 'asteroid' && r < 12 && c === 4),
      ),
    ).toBe(true)
  })
})

describe('black holes', () => {
  it('forbids non-blob landings in the gravity well', () => {
    const layout: SpaceLayout = {
      asteroids: [],
      planets: [],
      blackHoles: [{ row: 8, col: 8 }],
      wormholePairs: [],
    }
    const state = createInitialState(
      { white: 'reptiloid', black: 'reptiloid' },
      layout,
    )
    // Place a white knight that could leap adjacent
    state.board[14][8].piece = null
    state.board[10][7].piece = {
      type: 'knight',
      color: 'white',
      moved: true,
    }
    const moves = generateLegalMoves(state, { row: 10, col: 7 })
    expect(moves.some((m) => m.to.row === 8 && m.to.col === 8)).toBe(false)
    expect(moves.some((m) => m.to.row === 8 && m.to.col === 9)).toBe(false)
  })

  it('allows blobs onto black holes', () => {
    const layout: SpaceLayout = {
      asteroids: [],
      planets: [],
      blackHoles: [{ row: 8, col: 8 }],
      wormholePairs: [],
    }
    const state = createInitialState(
      { white: 'blob', black: 'reptiloid' },
      layout,
    )
    state.board[10][7].piece = {
      type: 'knight',
      color: 'white',
      moved: true,
    }
    const moves = generateLegalMoves(state, { row: 10, col: 7 })
    expect(moves.some((m) => m.to.row === 8 && m.to.col === 8)).toBe(true)
  })
})

describe('wormholes', () => {
  it('teleports a piece to the paired exit and can capture', () => {
    const layout: SpaceLayout = {
      asteroids: [],
      planets: [],
      blackHoles: [],
      wormholePairs: [
        [
          { row: 10, col: 4 },
          { row: 5, col: 10 },
        ],
      ],
    }
    const state = createInitialState(
      { white: 'blob', black: 'blob' },
      layout,
    )
    state.board[14][4].piece = null
    state.board[5][10].piece = {
      type: 'pawn',
      color: 'black',
      moved: true,
    }
    const moves = generateLegalMoves(state, { row: 15, col: 4 })
    const enter = moves.find((m) => m.to.row === 10 && m.to.col === 4)
    expect(enter).toBeTruthy()
    const next = applyMove(state, enter!)
    expect(next.board[10][4].piece).toBeNull()
    expect(next.board[5][10].piece?.type).toBe('rook')
    expect(next.board[5][10].piece?.color).toBe('white')
  })
})

describe('planets and reptiloids', () => {
  it('spawns one pawn for non-reptiloids and three for reptiloids', () => {
    const layout: SpaceLayout = {
      asteroids: [],
      planets: [{ row: 12, col: 7 }],
      blackHoles: [],
      wormholePairs: [],
    }

    const normal = createInitialState(
      { white: 'blob', black: 'blob' },
      layout,
    )
    normal.board[14][7].piece = null
    normal.board[13][7].piece = null
    const moveN = generateLegalMoves(normal, { row: 15, col: 7 }).find(
      (m) => m.to.row === 12 && m.to.col === 7,
    )
    expect(moveN).toBeTruthy()
    const afterN = applyMove(normal, moveN!)
    expect(afterN.lastMove?.spawnedPawns?.length).toBe(1)

    const rep = createInitialState(
      { white: 'reptiloid', black: 'blob' },
      structuredClone(layout),
    )
    rep.board[14][7].piece = null
    rep.board[13][7].piece = null
    const moveR = generateLegalMoves(rep, { row: 15, col: 7 }).find(
      (m) => m.to.row === 12 && m.to.col === 7,
    )
    const afterR = applyMove(rep, moveR!)
    expect(afterR.lastMove?.spawnedPawns?.length).toBe(3)
  })

  it('does not re-spawn when reclaiming own planet', () => {
    const layout: SpaceLayout = {
      asteroids: [],
      planets: [{ row: 12, col: 7 }],
      blackHoles: [],
      wormholePairs: [],
    }
    const state = createInitialState(
      { white: 'reptiloid', black: 'blob' },
      layout,
    )
    state.board[12][7].planetOwner = 'white'
    state.board[14][7].piece = null
    state.board[13][7].piece = null
    const move = generateLegalMoves(state, { row: 15, col: 7 }).find(
      (m) => m.to.row === 12 && m.to.col === 7,
    )!
    const after = applyMove(state, move)
    expect(after.lastMove?.spawnedPawns?.length ?? 0).toBe(0)
  })
})

describe('check and mate', () => {
  it('detects check from a rook', () => {
    const state = bare()
    // Clear board to a simple K+R vs K
    for (const row of state.board) {
      for (const sq of row) sq.piece = null
    }
    state.board[15][8].piece = { type: 'king', color: 'white', moved: true }
    state.board[0][8].piece = { type: 'king', color: 'black', moved: true }
    state.board[0][0].piece = { type: 'rook', color: 'white', moved: true }
    expect(isSquareAttacked(state, { row: 0, col: 8 }, 'white')).toBe(true)
    expect(isInCheck(state, 'black')).toBe(true)
  })

  it('reports checkmate when the side to move has no legal replies', () => {
    const state = bare()
    for (const row of state.board) {
      for (const sq of row) sq.piece = null
    }
    // Black king trapped on a1-equivalent corner with white rook and king support
    state.board[0][0].piece = { type: 'king', color: 'black', moved: true }
    state.board[2][1].piece = { type: 'king', color: 'white', moved: true }
    state.board[0][2].piece = { type: 'rook', color: 'white', moved: true }
    state.turn = 'black'
    const ended = updateStatus(state)
    expect(ended.status).toBe('checkmate')
    expect(ended.winner).toBe('white')
  })
})

describe('castling', () => {
  it('allows kingside castling when path is clear', () => {
    const state = bare()
    // Clear between king (col 8) and kingside rook (col 11)
    state.board[15][9].piece = null
    state.board[15][10].piece = null
    const moves = generateLegalMoves(state, { row: 15, col: 8 })
    expect(moves.some((m) => m.to.col === 10 && m.to.row === 15)).toBe(true)
    const castle = moves.find((m) => m.to.col === 10)!
    const next = applyMove(state, castle)
    expect(next.board[15][10].piece?.type).toBe('king')
    expect(next.board[15][9].piece?.type).toBe('rook')
  })
})

describe('playMove API', () => {
  it('rejects illegal moves and accepts legal ones', () => {
    const state = startGame({
      mode: 'pvp',
      difficulty: 'easy',
      playerColor: 'white',
      civs: { white: 'blob', black: 'blob' },
      space: emptySpace,
    })
    const bad = playMove(state, { row: 15, col: 8 }, { row: 10, col: 8 })
    expect(bad.ok).toBe(false)
    const good = playMove(state, { row: 14, col: 7 }, { row: 12, col: 7 })
    expect(good.ok).toBe(true)
    if (good.ok) {
      expect(getSquare(good.state, { row: 12, col: 7 }).piece?.type).toBe('pawn')
      expect(good.state.turn).toBe('black')
    }
  })
})
