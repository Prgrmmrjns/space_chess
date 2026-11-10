import {
  ASTEROID_COUNT,
  BLACK_BACK,
  BLACK_HOLE_COUNT,
  BLACK_PAWN_ROW,
  BOARD_SIZE,
  PIECE_START_COL,
  PLANET_COUNT,
  WHITE_BACK,
  WHITE_PAWN_ROW,
  WORMHOLE_PAIRS,
} from './constants'
import type {
  CivilizationSetup,
  Color,
  GameState,
  Piece,
  PieceType,
  Pos,
  SpaceLayout,
  Square,
} from './types'
import { posKey } from './types'

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

export function placeStartingPieces(board: Square[][]): void {
  const order: PieceType[] = [
    'rook',
    'knight',
    'bishop',
    'queen',
    'king',
    'bishop',
    'knight',
    'rook',
  ]

  for (let i = 0; i < order.length; i++) {
    const col = PIECE_START_COL + i
    board[BLACK_BACK][col].piece = makePiece(order[i], 'black')
    board[WHITE_BACK][col].piece = makePiece(order[i], 'white')
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

export function generateSpaceLayout(seed = Date.now()): SpaceLayout {
  const rng = createRng(seed)
  const available: Pos[] = []
  // Keep the first/last three ranks clear so opening setups stay sane.
  for (let row = 3; row < BOARD_SIZE - 3; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      available.push({ row, col })
    }
  }

  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[available[i], available[j]] = [available[j], available[i]]
  }

  let idx = 0
  const asteroids = available.slice(idx, (idx += ASTEROID_COUNT))
  const planets = available.slice(idx, (idx += PLANET_COUNT))
  const blackHoles = available.slice(idx, (idx += BLACK_HOLE_COUNT))
  const wormholePairs: [Pos, Pos][] = []
  for (let i = 0; i < WORMHOLE_PAIRS; i++) {
    wormholePairs.push([available[idx++], available[idx++]])
  }

  return { asteroids, planets, blackHoles, wormholePairs }
}

export function applySpaceLayout(board: Square[][], layout: SpaceLayout): void {
  for (const p of layout.asteroids) {
    board[p.row][p.col].hazard = 'asteroid'
  }
  for (const p of layout.planets) {
    board[p.row][p.col].hazard = 'planet'
    board[p.row][p.col].planetOwner = null
  }
  for (const p of layout.blackHoles) {
    board[p.row][p.col].hazard = 'blackhole'
  }
  layout.wormholePairs.forEach(([a, b], id) => {
    board[a.row][a.col].hazard = 'wormhole'
    board[a.row][a.col].wormholeId = id
    board[b.row][b.col].hazard = 'wormhole'
    board[b.row][b.col].wormholeId = id
  })
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
  applySpaceLayout(board, layout ?? generateSpaceLayout(seed))
  return {
    board,
    turn: 'white',
    civs,
    enPassant: null,
    lastMove: null,
    status: 'playing',
    winner: null,
    moveNumber: 1,
    halfmoveClock: 0,
    positionHistory: [],
  }
}

export function getSquare(state: GameState, pos: Pos): Square {
  return state.board[pos.row][pos.col]
}

export function findKing(state: GameState, color: Color): Pos | null {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const p = state.board[row][col].piece
      if (p && p.type === 'king' && p.color === color) {
        return { row, col }
      }
    }
  }
  return null
}

export function findWormholeExit(state: GameState, entrance: Pos): Pos | null {
  const sq = getSquare(state, entrance)
  if (sq.hazard !== 'wormhole' || sq.wormholeId === null) return null
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const other = state.board[row][col]
      if (
        other.hazard === 'wormhole' &&
        other.wormholeId === sq.wormholeId &&
        (row !== entrance.row || col !== entrance.col)
      ) {
        return { row, col }
      }
    }
  }
  return null
}

export function isNearBlackHole(state: GameState, pos: Pos): boolean {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (state.board[row][col].hazard === 'blackhole') {
        if (Math.abs(row - pos.row) <= 1 && Math.abs(col - pos.col) <= 1) {
          return true
        }
      }
    }
  }
  return false
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

export function positionKey(state: GameState): string {
  const parts: string[] = [state.turn]
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const sq = state.board[row][col]
      if (sq.piece) {
        parts.push(`${row},${col}:${sq.piece.color[0]}${sq.piece.type[0]}${sq.piece.moved ? '1' : '0'}`)
      }
      if (sq.hazard === 'asteroid') parts.push(`A${row},${col}`)
      if (sq.hazard === 'planet') parts.push(`P${row},${col}:${sq.planetOwner ?? '-'}`)
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
