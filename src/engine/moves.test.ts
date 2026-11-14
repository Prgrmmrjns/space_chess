import { describe, expect, it } from 'vitest'
import { BOARD_SIZE } from './constants'
import {
  advanceHazards,
  createInitialState,
  emptySpace,
  findKings,
  forecastSpace,
  generateSpaceLayout,
  getSquare,
  paintSpace,
} from './board'
import {
  applyMove,
  generateLegalMoves,
  isInCheck,
  isSquareAttacked,
  updateStatus,
} from './moves'
import { playMove, startGame } from './game'
import type { GameState, PlanetBody, Pos, SpaceLayout } from './types'

function planet(row: number, col: number, owner: PlanetBody['owner'] = null): PlanetBody {
  return {
    pos: { row, col },
    owner,
    anchor: { row: row + 1, col },
    step: 0,
  }
}

function bare(
  civs: GameState['civs'] = { white: 'blob', black: 'blob' },
  space: SpaceLayout = emptySpace(),
): GameState {
  return createInitialState(civs, space)
}

describe('board setup', () => {
  it('fills every file with a doubled back rank and 16 fighters', () => {
    const state = bare()
    expect(state.board).toHaveLength(BOARD_SIZE)
    expect(findKings(state, 'white')).toEqual([
      { row: 15, col: 4 },
      { row: 15, col: 12 },
    ])
    expect(findKings(state, 'black')).toEqual([
      { row: 0, col: 4 },
      { row: 0, col: 12 },
    ])

    let whitePawns = 0
    let whiteRooks = 0
    let whiteQueens = 0
    for (const row of state.board) {
      for (const sq of row) {
        if (sq.piece?.color !== 'white') continue
        if (sq.piece.type === 'pawn') whitePawns++
        if (sq.piece.type === 'rook') whiteRooks++
        if (sq.piece.type === 'queen') whiteQueens++
      }
    }
    expect(whitePawns).toBe(16)
    expect(whiteRooks).toBe(4)
    expect(whiteQueens).toBe(2)
  })
})

describe('pawn moves', () => {
  it('allows single and double steps from the start row', () => {
    const state = bare()
    const from: Pos = { row: 14, col: 7 }
    const moves = generateLegalMoves(state, from)
    expect(moves.map((move) => move.to.row)).toEqual(expect.arrayContaining([13, 12]))
  })
})

describe('sliding pieces and asteroids', () => {
  it('blocks non-crustacean battleships with asteroids', () => {
    const state = bare(
      { white: 'reptiloid', black: 'blob' },
      {
        ...emptySpace(),
        asteroids: [{ pos: { row: 10, col: 0 }, dir: 1 }],
      },
    )
    state.board[14][0].piece = null
    const moves = generateLegalMoves(state, { row: 15, col: 0 })
    expect(moves.some((move) => move.to.row === 10 && move.to.col === 0)).toBe(false)
    expect(moves.some((move) => move.to.row > 10 && move.to.col === 0)).toBe(true)
  })

  it('lets crustaceans shove an asteroid three squares', () => {
    const state = bare(
      { white: 'crustacean', black: 'blob' },
      {
        ...emptySpace(),
        asteroids: [{ pos: { row: 12, col: 0 }, dir: 1 }],
      },
    )
    state.board[14][0].piece = null
    const onto = generateLegalMoves(state, { row: 15, col: 0 }).find(
      (move) => move.to.row === 12 && move.to.col === 0,
    )
    expect(onto).toBeTruthy()
    const next = applyMove(state, onto!)
    expect(next.board[12][0].piece?.type).toBe('rook')
    expect(next.board[12][0].hazard).not.toBe('asteroid')
    expect(next.space.asteroids[0]?.pos).toEqual({ row: 9, col: 0 })
  })

  it('shatters an asteroid that would crush a silicate', () => {
    const state = bare(
      { white: 'crustacean', black: 'silicate' },
      {
        ...emptySpace(),
        asteroids: [{ pos: { row: 12, col: 0 }, dir: 1 }],
      },
    )
    state.board[14][0].piece = null
    state.board[10][0].piece = { type: 'pawn', color: 'black', moved: true }
    const onto = generateLegalMoves(state, { row: 15, col: 0 }).find(
      (move) => move.to.row === 12 && move.to.col === 0,
    )!
    const next = applyMove(state, onto)
    expect(next.space.asteroids).toHaveLength(0)
    expect(next.board[10][0].piece?.color).toBe('black')
    expect(next.lastMove?.asteroidPush?.shattered).toBe(true)
  })
})

describe('black holes', () => {
  it('forbids non-blob landings in the gravity well', () => {
    const state = bare(
      { white: 'reptiloid', black: 'reptiloid' },
      {
        ...emptySpace(),
        blackHoles: [
          { row: 8, col: 8 },
          { row: 8, col: 12 },
        ],
      },
    )
    state.board[6][8].piece = { type: 'knight', color: 'white', moved: true }
    const moves = generateLegalMoves(state, { row: 6, col: 8 })
    expect(moves.some((move) => move.to.row === 8 && move.to.col === 9)).toBe(false)
    expect(moves.some((move) => move.to.row === 8 && move.to.col === 7)).toBe(false)
  })

  it('lets blobs hop from one black hole to the other and capture', () => {
    const state = bare(
      { white: 'blob', black: 'reptiloid' },
      {
        ...emptySpace(),
        blackHoles: [
          { row: 8, col: 8 },
          { row: 8, col: 12 },
        ],
      },
    )
    state.board[6][7].piece = { type: 'knight', color: 'white', moved: true }
    state.board[8][12].piece = { type: 'pawn', color: 'black', moved: true }
    const hop = generateLegalMoves(state, { row: 6, col: 7 }).find(
      (move) => move.to.row === 8 && move.to.col === 8,
    )
    expect(hop?.finalTo).toEqual({ row: 8, col: 12 })
    const next = applyMove(state, hop!)
    expect(next.board[8][8].piece).toBeNull()
    expect(next.board[8][12].piece?.type).toBe('knight')
    expect(next.board[8][12].piece?.color).toBe('white')
  })
})

describe('wormholes', () => {
  it('teleports a ship to the paired exit and can capture', () => {
    const state = bare(
      { white: 'blob', black: 'blob' },
      {
        ...emptySpace(),
        wormholePairs: [
          [
            { row: 10, col: 0 },
            { row: 5, col: 10 },
          ],
        ],
      },
    )
    state.board[14][0].piece = null
    state.board[5][10].piece = { type: 'pawn', color: 'black', moved: true }
    const enter = generateLegalMoves(state, { row: 15, col: 0 }).find(
      (move) => move.to.row === 10 && move.to.col === 0,
    )
    expect(enter).toBeTruthy()
    const next = applyMove(state, enter!)
    expect(next.board[10][0].piece).toBeNull()
    expect(next.board[5][10].piece).toMatchObject({ type: 'rook', color: 'white' })
  })
})

describe('planets and reptiles', () => {
  it('spawns one fighter for most civs and two for reptiloids', () => {
    const layout = (): SpaceLayout => ({
      ...emptySpace(),
      planets: [planet(12, 7)],
    })

    const normal = bare({ white: 'blob', black: 'blob' }, layout())
    normal.board[14][7].piece = null
    const moveN = generateLegalMoves(normal, { row: 15, col: 7 }).find(
      (move) => move.to.row === 12 && move.to.col === 7,
    )!
    expect(applyMove(normal, moveN).lastMove?.spawnedPawns).toHaveLength(1)

    const reptiles = bare({ white: 'reptiloid', black: 'blob' }, layout())
    reptiles.board[14][7].piece = null
    const moveR = generateLegalMoves(reptiles, { row: 15, col: 7 }).find(
      (move) => move.to.row === 12 && move.to.col === 7,
    )!
    expect(applyMove(reptiles, moveR).lastMove?.spawnedPawns).toHaveLength(2)
  })

  it('does not respawn when reclaiming your own planet', () => {
    const state = bare(
      { white: 'reptiloid', black: 'blob' },
      { ...emptySpace(), planets: [planet(12, 7, 'white')] },
    )
    state.board[14][7].piece = null
    const move = generateLegalMoves(state, { row: 15, col: 7 }).find(
      (candidate) => candidate.to.row === 12 && candidate.to.col === 7,
    )!
    expect(applyMove(state, move).lastMove?.spawnedPawns?.length ?? 0).toBe(0)
  })

  it('lets silicate capital ships glide through an empty planet', () => {
    const state = bare(
      { white: 'silicate', black: 'blob' },
      { ...emptySpace(), planets: [planet(12, 0)] },
    )
    state.board[14][0].piece = null
    const moves = generateLegalMoves(state, { row: 15, col: 0 })
    expect(moves.some((move) => move.to.row === 12 && move.to.col === 0)).toBe(true)
    expect(moves.some((move) => move.to.row === 11 && move.to.col === 0)).toBe(true)
    const through = moves.find((move) => move.to.row === 11 && move.to.col === 0)!
    const next = applyMove(state, through)
    expect(next.board[11][0].piece?.type).toBe('rook')
    expect(next.space.planets[0]?.owner).toBeNull()
  })
})

describe('stars', () => {
  it('drifts on a diagonal and destroys a ship in the way', () => {
    const state = bare({ white: 'reptiloid', black: 'crustacean' })
    state.space.stars = [{ pos: { row: 5, col: 5 }, dr: 1, dc: 1 }]
    state.board[6][6].piece = { type: 'pawn', color: 'white', moved: true }
    paintSpace(state)
    const deaths = advanceHazards(state)
    expect(deaths).toEqual([{ row: 6, col: 6 }])
    expect(state.board[6][6].piece).toBeNull()
    expect(state.space.stars[0]?.pos).toEqual({ row: 6, col: 6 })
  })

  it('bounces off solarites', () => {
    const state = bare({ white: 'solarite', black: 'blob' })
    state.space.stars = [{ pos: { row: 5, col: 5 }, dr: 1, dc: 1 }]
    state.board[6][6].piece = { type: 'pawn', color: 'white', moved: true }
    paintSpace(state)
    expect(advanceHazards(state)).toEqual([])
    expect(state.board[6][6].piece?.type).toBe('pawn')
    expect(state.space.stars[0]?.pos).toEqual({ row: 5, col: 5 })
  })

  it('walks each planet one step clockwise around its sun', () => {
    const state = bare(
      { white: 'blob', black: 'blob' },
      {
        ...emptySpace(),
        stars: [{ pos: { row: 8, col: 8 }, dr: 1, dc: 1 }],
        planets: [
          {
            pos: { row: 7, col: 8 },
            owner: null,
            anchor: { row: 8, col: 8 },
            step: 0,
            sun: 0,
          },
        ],
      },
    )
    paintSpace(state)
    const forecast = forecastSpace(state)
    expect(forecast.nextStars).toEqual([{ row: 9, col: 9 }])
    expect(forecast.nextPlanets).toEqual([{ row: 8, col: 10 }])
    expect(forecast.orbits).toContainEqual({ row: 8, col: 10 })
    expect(forecast.orbits).toContainEqual({ row: 8, col: 9 })

    advanceHazards(state)
    expect(state.space.stars[0]?.pos).toEqual({ row: 9, col: 9 })
    expect(state.space.planets[0]?.pos).toEqual({ row: 8, col: 10 })
    expect(state.space.planets[0]?.anchor).toEqual({ row: 9, col: 9 })
    expect(state.space.planets[0]?.step).toBe(1)
  })

  it('pairs every generated planet with the ring around its sun', () => {
    const layout = generateSpaceLayout(7)
    expect(layout.planets).toHaveLength(layout.stars.length)
    expect(layout.planets.length).toBeGreaterThan(0)
    for (const planet of layout.planets) {
      const sun = layout.stars[planet.sun ?? -1]
      expect(sun).toBeTruthy()
      expect(planet.anchor).toEqual(sun.pos)
      expect(planet.pos).toEqual({
        row: sun.pos.row + [-1, -1, 0, 1, 1, 1, 0, -1][planet.step],
        col: sun.pos.col + [0, 1, 1, 1, 0, -1, -1, -1][planet.step],
      })
    }
  })

  it('lets a solarite flare push an enemy off a star', () => {
    const state = bare(
      { white: 'solarite', black: 'reptiloid' },
      {
        ...emptySpace(),
        stars: [{ pos: { row: 8, col: 8 }, dr: 1, dc: 1 }],
      },
    )
    state.board[6][7].piece = { type: 'knight', color: 'white', moved: true }
    state.board[8][9].piece = { type: 'pawn', color: 'black', moved: true }
    const hop = generateLegalMoves(state, { row: 6, col: 7 }).find(
      (move) => move.to.row === 8 && move.to.col === 8,
    )
    expect(hop).toBeTruthy()
    const next = applyMove(state, hop!)
    expect(next.board[8][8].piece?.type).toBe('knight')
    expect(next.board[8][9].piece).toBeNull()
    expect(next.board[8][10].piece?.color).toBe('black')
  })

  it('waits until Black has moved before the hazards drift', () => {
    const state = bare({ white: 'blob', black: 'blob' }, {
      ...emptySpace(),
      asteroids: [{ pos: { row: 8, col: 3 }, dir: 1 }],
    })
    const white = applyMove(
      state,
      generateLegalMoves(state, { row: 14, col: 0 }).find((move) => move.to.row === 13)!,
    )
    expect(white.space.asteroids[0]?.pos).toEqual({ row: 8, col: 3 })
    const black = applyMove(
      white,
      generateLegalMoves(white, { row: 1, col: 15 }).find((move) => move.to.row === 2)!,
    )
    expect(black.space.asteroids[0]?.pos).toEqual({ row: 8, col: 4 })
  })
})

describe('check and mate', () => {
  it('is check when either flagship is attacked', () => {
    const state = bare()
    for (const row of state.board) {
      for (const sq of row) sq.piece = null
    }
    state.board[0][8].piece = { type: 'king', color: 'black', moved: true }
    state.board[5][5].piece = { type: 'king', color: 'black', moved: true }
    state.board[15][0].piece = { type: 'king', color: 'white', moved: true }
    state.board[15][15].piece = { type: 'king', color: 'white', moved: true }
    state.board[0][0].piece = { type: 'rook', color: 'white', moved: true }
    expect(isSquareAttacked(state, { row: 0, col: 8 }, 'white')).toBe(true)
    expect(isInCheck(state, 'black')).toBe(true)
  })

  it('is checkmate when the side to move cannot save a flagship', () => {
    const state = bare()
    for (const row of state.board) {
      for (const sq of row) sq.piece = null
    }
    state.board[0][0].piece = { type: 'king', color: 'black', moved: true }
    state.board[0][1].piece = { type: 'king', color: 'black', moved: true }
    state.board[2][1].piece = { type: 'king', color: 'white', moved: true }
    state.board[15][15].piece = { type: 'king', color: 'white', moved: true }
    state.board[0][3].piece = { type: 'rook', color: 'white', moved: true }
    state.turn = 'black'
    const ended = updateStatus(state)
    expect(ended.status).toBe('checkmate')
    expect(ended.winner).toBe('white')
  })
})

describe('castling', () => {
  it('castles inside the flagship half', () => {
    const state = bare()
    state.board[15][5].piece = null
    state.board[15][6].piece = null
    const moves = generateLegalMoves(state, { row: 15, col: 4 })
    expect(moves.some((move) => move.to.col === 6 && move.to.row === 15)).toBe(true)
    const castle = moves.find((move) => move.to.col === 6)!
    const next = applyMove(state, castle)
    expect(next.board[15][6].piece?.type).toBe('king')
    expect(next.board[15][5].piece?.type).toBe('rook')
    expect(next.board[15][7].piece).toBeNull()
  })
})

describe('playMove API', () => {
  it('rejects illegal moves and accepts legal ones', () => {
    const state = startGame({
      mode: 'pvp',
      difficulty: 'easy',
      playerColor: 'white',
      civs: { white: 'blob', black: 'blob' },
      space: emptySpace(),
    })
    expect(playMove(state, { row: 15, col: 4 }, { row: 10, col: 4 }).ok).toBe(false)
    const good = playMove(state, { row: 14, col: 7 }, { row: 12, col: 7 })
    expect(good.ok).toBe(true)
    if (good.ok) {
      expect(getSquare(good.state, { row: 12, col: 7 }).piece?.type).toBe('pawn')
      expect(good.state.turn).toBe('black')
    }
  })
})
