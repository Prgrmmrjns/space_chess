export type Color = 'white' | 'black'
export type PieceType = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king'
export type Civilization = 'reptiloid' | 'crustacean' | 'blob'
export type GameMode = 'pvai' | 'pvp' | 'aivai'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type GameStatus = 'playing' | 'check' | 'checkmate' | 'stalemate' | 'draw'

export interface Pos {
  row: number
  col: number
}

export interface Piece {
  type: PieceType
  color: Color
  moved: boolean
}

export type Hazard = 'asteroid' | 'planet' | 'blackhole' | 'wormhole'

export interface Square {
  piece: Piece | null
  hazard: Hazard | null
  wormholeId: number | null
  planetOwner: Color | null
}

export interface Move {
  from: Pos
  to: Pos
  /** Destination after wormhole teleport, if any */
  finalTo?: Pos
  promotion?: PieceType
  capture?: boolean
  asteroidPush?: { from: Pos; to: Pos | null; destroyedEnemy?: Pos }
  spawnedPawns?: Pos[]
  consumedByBlackHole?: boolean
  colonizedPlanet?: Pos
}

export interface CivilizationSetup {
  white: Civilization
  black: Civilization
}

export interface SpaceLayout {
  asteroids: Pos[]
  planets: Pos[]
  blackHoles: Pos[]
  wormholePairs: [Pos, Pos][]
}

export interface GameConfig {
  mode: GameMode
  difficulty: Difficulty
  playerColor: Color
  civs: CivilizationSetup
  /** Fixed layout for tests; random if omitted */
  space?: SpaceLayout
  seed?: number
}

export interface GameState {
  board: Square[][]
  turn: Color
  civs: CivilizationSetup
  enPassant: Pos | null
  lastMove: Move | null
  status: GameStatus
  winner: Color | null
  moveNumber: number
  halfmoveClock: number
  /** Recent position keys for threefold draw */
  positionHistory: string[]
}

export const PIECE_VALUES: Record<PieceType, number> = {
  pawn: 100,
  knight: 320,
  bishop: 330,
  rook: 500,
  queen: 900,
  king: 20000,
}

export function opponent(color: Color): Color {
  return color === 'white' ? 'black' : 'white'
}

export function posKey(p: Pos): string {
  return `${p.row},${p.col}`
}

export function samePos(a: Pos, b: Pos): boolean {
  return a.row === b.row && a.col === b.col
}
