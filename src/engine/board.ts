import {
  ASTEROID_COUNT,
  BLACK_BACK,
  BLACK_HOLE_COUNT,
  BLACK_PAWN_ROW,
  BOARD_SIZE,
  PLANET_COUNT,
  PLANET_RING,
  STAR_COUNT,
  WHITE_BACK,
  WHITE_PAWN_ROW,
  WORMHOLE_PAIRS,
} from './constants'
import type {
  AsteroidBody,
  CivilizationSetup,
  Color,
  GameState,
  Piece,
  PieceType,
  PlanetBody,
  Pos,
  SpaceLayout,
  Square,
  StarBody,
} from './types'
import { posKey, samePos } from './types'

export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE
}

export function emptySquare(): Square {
  return {
    piece: null,
    hazard: null,
    wormholeId: null,
    planetOwner: null,
  }
}

function makePiece(type: PieceType, color: Color): Piece {
  return { type, color, moved: false }
}

export function createEmptyBoard(): Square[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => emptySquare()),
  )
}

const BACK_RANK: PieceType[] = [
  'rook',
  'knight',
  'bishop',
  'queen',
  'king',
  'bishop',
  'knight',
  'rook',
]

/** Standard back rank, laid down twice, plus a full rank of fighters. */
export function placeStartingPieces(board: Square[][]): void {
  for (let col = 0; col < BOARD_SIZE; col++) {
    const type = BACK_RANK[col % BACK_RANK.length]
    board[BLACK_BACK][col].piece = makePiece(type, 'black')
    board[WHITE_BACK][col].piece = makePiece(type, 'white')
    board[BLACK_PAWN_ROW][col].piece = makePiece('pawn', 'black')
    board[WHITE_PAWN_ROW][col].piece = makePiece('pawn', 'white')
  }
}

/** Mulberry32 seeded RNG for reproducible layouts. */
export function createRng(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: T[], rng: () => number): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
}

export function emptySpace(): SpaceLayout {
  return {
    asteroids: [],
    planets: [],
    blackHoles: [],
    wormholePairs: [],
    stars: [],
  }
}

export function ringPos(anchor: Pos, step: number): Pos {
  const [dr, dc] = PLANET_RING[step % PLANET_RING.length]
  return { row: anchor.row + dr, col: anchor.col + dc }
}

export function generateSpaceLayout(seed = Date.now()): SpaceLayout {
  const rng = createRng(seed)
  const taken = new Set<string>()
  const spots: Pos[] = []
  for (let row = 3; row <= 12; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) spots.push({ row, col })
  }
  shuffle(spots, rng)

  let cursor = 0
  const take = (): Pos | null => {
    while (cursor < spots.length) {
      const spot = spots[cursor++]
      const key = posKey(spot)
      if (taken.has(key)) continue
      taken.add(key)
      return spot
    }
    return null
  }

  const blackHoles: Pos[] = []
  for (let n = 0; n < BLACK_HOLE_COUNT; n++) {
    const spot = take()
    if (spot) blackHoles.push(spot)
  }

  const wormholePairs: [Pos, Pos][] = []
  for (let n = 0; n < WORMHOLE_PAIRS; n++) {
    const a = take()
    const b = take()
    if (a && b) wormholePairs.push([a, b])
  }

  const stars: StarBody[] = []
  for (let n = 0; n < STAR_COUNT; n++) {
    const spot = take()
    if (!spot) break
    stars.push({
      pos: spot,
      dr: rng() < 0.5 ? -1 : 1,
      dc: rng() < 0.5 ? -1 : 1,
    })
  }

  const asteroids: AsteroidBody[] = []
  for (let n = 0; n < ASTEROID_COUNT; n++) {
    const spot = take()
    if (!spot) break
    asteroids.push({ pos: spot, dir: rng() < 0.5 ? -1 : 1 })
  }

  const anchors: Pos[] = []
  for (let row = 4; row <= 11; row++) {
    for (let col = 1; col <= 14; col++) anchors.push({ row, col })
  }
  shuffle(anchors, rng)

  const planets: PlanetBody[] = []
  for (const anchor of anchors) {
    if (planets.length >= PLANET_COUNT) break
    const step = Math.floor(rng() * PLANET_RING.length)
    const pos = ringPos(anchor, step)
    if (!inBounds(pos.row, pos.col)) continue
    const key = posKey(pos)
    if (taken.has(key)) continue
    taken.add(key)
    planets.push({ pos, owner: null, anchor, step })
  }

  return { asteroids, planets, blackHoles, wormholePairs, stars }
}

/** Project `state.space` onto the board. Pieces are left where they are. */
export function paintSpace(state: GameState): void {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const sq = state.board[row][col]
      sq.hazard = null
      sq.wormholeId = null
      sq.planetOwner = null
    }
  }

  for (const asteroid of state.space.asteroids) {
    if (!inBounds(asteroid.pos.row, asteroid.pos.col)) continue
    state.board[asteroid.pos.row][asteroid.pos.col].hazard = 'asteroid'
  }
  for (const planet of state.space.planets) {
    if (!inBounds(planet.pos.row, planet.pos.col)) continue
    const sq = state.board[planet.pos.row][planet.pos.col]
    sq.hazard = 'planet'
    sq.planetOwner = planet.owner
  }
  for (const star of state.space.stars) {
    if (!inBounds(star.pos.row, star.pos.col)) continue
    const sq = state.board[star.pos.row][star.pos.col]
    if (!sq.hazard) sq.hazard = 'star'
  }
  for (const hole of state.space.blackHoles) {
    if (!inBounds(hole.row, hole.col)) continue
    state.board[hole.row][hole.col].hazard = 'blackhole'
  }
  state.space.wormholePairs.forEach(([a, b], id) => {
    for (const pos of [a, b]) {
      if (!inBounds(pos.row, pos.col)) continue
      const sq = state.board[pos.row][pos.col]
      sq.hazard = 'wormhole'
      sq.wormholeId = id
    }
  })
}

function hazardOccupied(state: GameState, pos: Pos, ignore?: Pos): boolean {
  if (ignore && samePos(pos, ignore)) return false
  for (const asteroid of state.space.asteroids) {
    if (samePos(asteroid.pos, pos) && !(ignore && samePos(asteroid.pos, ignore))) return true
  }
  for (const planet of state.space.planets) {
    if (samePos(planet.pos, pos) && !(ignore && samePos(planet.pos, ignore))) return true
  }
  for (const star of state.space.stars) {
    if (samePos(star.pos, pos) && !(ignore && samePos(star.pos, ignore))) return true
  }
  for (const hole of state.space.blackHoles) {
    if (samePos(hole, pos)) return true
  }
  for (const [a, b] of state.space.wormholePairs) {
    if (samePos(a, pos) || samePos(b, pos)) return true
  }
  return false
}

function flip(dir: 1 | -1): 1 | -1 {
  return dir === 1 ? -1 : 1
}

/**
 * Drift every moving body one step. Called once a full turn ends
 * (after Black moves, when White is to move again). Stars destroy
 * any piece they land on, except Blobs and Solarites.
 */
export function advanceHazards(state: GameState): Pos[] {
  const deaths: Pos[] = []

  for (const asteroid of state.space.asteroids) {
    const aheadCol = asteroid.pos.col + asteroid.dir
    const tryStep = (dir: 1 | -1): Pos | null => {
      const col = asteroid.pos.col + dir
      if (!inBounds(asteroid.pos.row, col)) return null
      const next = { row: asteroid.pos.row, col }
      if (hazardOccupied(state, next, asteroid.pos)) return null
      if (state.board[next.row][next.col].piece) return null
      return next
    }
    const ahead = inBounds(asteroid.pos.row, aheadCol) ? tryStep(asteroid.dir) : null
    if (ahead) {
      asteroid.pos = ahead
      continue
    }
    const bounced = flip(asteroid.dir)
    asteroid.dir = bounced
    const back = tryStep(bounced)
    if (back) asteroid.pos = back
  }

  for (const planet of state.space.planets) {
    const nextStep = (planet.step + 1) % PLANET_RING.length
    const next = ringPos(planet.anchor, nextStep)
    if (!inBounds(next.row, next.col)) continue
    if (hazardOccupied(state, next, planet.pos)) continue
    if (state.board[next.row][next.col].piece) continue
    planet.step = nextStep
    planet.pos = next
  }

  for (const star of state.space.stars) {
    let dr = star.dr
    let dc = star.dc
    if (!inBounds(star.pos.row + dr, star.pos.col)) dr = (dr * -1) as -1 | 1
    if (!inBounds(star.pos.row, star.pos.col + dc)) dc = (dc * -1) as -1 | 1
    const next = { row: star.pos.row + dr, col: star.pos.col + dc }
    star.dr = dr
    star.dc = dc
    if (!inBounds(next.row, next.col) || samePos(next, star.pos)) continue

    const victim = state.board[next.row][next.col].piece
    if (victim) {
      if (isStarImmune(state, victim.color)) {
        star.dr = (star.dr * -1) as -1 | 1
        star.dc = (star.dc * -1) as -1 | 1
        continue
      }
      deaths.push(next)
      state.board[next.row][next.col].piece = null
      star.pos = next
      continue
    }
    if (hazardOccupied(state, next, star.pos)) {
      star.dr = (dr * -1) as -1 | 1
      star.dc = (dc * -1) as -1 | 1
      continue
    }
    star.pos = next
  }

  paintSpace(state)
  return deaths
}

export function cloneSquare(sq: Square): Square {
  return {
    piece: sq.piece ? { ...sq.piece } : null,
    hazard: sq.hazard,
    wormholeId: sq.wormholeId,
    planetOwner: sq.planetOwner,
  }
}

export function cloneBoard(board: Square[][]): Square[][] {
  return board.map((row) => row.map(cloneSquare))
}

export function cloneState(state: GameState): GameState {
  return {
    board: cloneBoard(state.board),
    turn: state.turn,
    civs: { ...state.civs },
    space: structuredClone(state.space),
    enPassant: state.enPassant ? { ...state.enPassant } : null,
    lastMove: state.lastMove ? structuredClone(state.lastMove) : null,
    status: state.status,
    winner: state.winner,
    moveNumber: state.moveNumber,
    halfmoveClock: state.halfmoveClock,
    positionHistory: [...state.positionHistory],
  }
}

export function createInitialState(
  civs: CivilizationSetup,
  layout?: SpaceLayout,
  seed?: number,
): GameState {
  const board = createEmptyBoard()
  placeStartingPieces(board)
  const state: GameState = {
    board,
    turn: 'white',
    civs,
    space: structuredClone(layout ?? generateSpaceLayout(seed)),
    enPassant: null,
    lastMove: null,
    status: 'playing',
    winner: null,
    moveNumber: 1,
    halfmoveClock: 0,
    positionHistory: [],
  }
  paintSpace(state)
  return state
}

export function getSquare(state: GameState, pos: Pos): Square {
  return state.board[pos.row][pos.col]
}

export function findKings(state: GameState, color: Color): Pos[] {
  const found: Pos[] = []
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = state.board[row][col].piece
      if (piece && piece.type === 'king' && piece.color === color) {
        found.push({ row, col })
      }
    }
  }
  return found
}

export function findKing(state: GameState, color: Color): Pos | null {
  return findKings(state, color)[0] ?? null
}

export function countKings(state: GameState, color: Color): number {
  return findKings(state, color).length
}

export function findWormholeExit(state: GameState, entrance: Pos): Pos | null {
  for (const [a, b] of state.space.wormholePairs) {
    if (samePos(a, entrance)) return b
    if (samePos(b, entrance)) return a
  }
  return null
}

export function otherBlackHole(state: GameState, pos: Pos): Pos | null {
  return state.space.blackHoles.find((hole) => !samePos(hole, pos)) ?? null
}

export function isNearBlackHole(state: GameState, pos: Pos): boolean {
  return state.space.blackHoles.some(
    (hole) => Math.abs(hole.row - pos.row) <= 1 && Math.abs(hole.col - pos.col) <= 1,
  )
}

export function civOf(state: GameState, color: Color) {
  return state.civs[color]
}

export function isBlob(state: GameState, color: Color): boolean {
  return civOf(state, color) === 'blob'
}

export function isCrustacean(state: GameState, color: Color): boolean {
  return civOf(state, color) === 'crustacean'
}

export function isReptiloid(state: GameState, color: Color): boolean {
  return civOf(state, color) === 'reptiloid'
}

export function isSolarite(state: GameState, color: Color): boolean {
  return civOf(state, color) === 'solarite'
}

export function isSilicate(state: GameState, color: Color): boolean {
  return civOf(state, color) === 'silicate'
}

export function isStarImmune(state: GameState, color: Color): boolean {
  return isBlob(state, color) || isSolarite(state, color)
}

export function positionKey(state: GameState): string {
  const parts: string[] = [state.turn]
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const sq = state.board[row][col]
      if (sq.piece) {
        parts.push(
          `${row},${col}:${sq.piece.color[0]}${sq.piece.type[0]}${sq.piece.moved ? '1' : '0'}`,
        )
      }
      if (sq.hazard === 'asteroid') parts.push(`A${row},${col}`)
      if (sq.hazard === 'planet') parts.push(`P${row},${col}:${sq.planetOwner ?? '-'}`)
      if (sq.hazard === 'star') parts.push(`S${row},${col}`)
      if (sq.hazard === 'blackhole') parts.push(`H${row},${col}`)
    }
  }
  if (state.enPassant) parts.push(`ep${posKey(state.enPassant)}`)
  return parts.join('|')
}

export function adjacentEmpty(state: GameState, center: Pos): Pos[] {
  const out: Pos[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const row = center.row + dr
      const col = center.col + dc
      if (!inBounds(row, col)) continue
      const sq = state.board[row][col]
      if (!sq.piece && !sq.hazard) out.push({ row, col })
    }
  }
  return out
}
