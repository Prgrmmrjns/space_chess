export type Color = 'white' | 'black'
export type PieceType = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king'
export type Civilization = 'reptiloid' | 'crustacean' | 'blob' | 'solarite' | 'silicate'
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

export type Hazard = 'asteroid' | 'planet' | 'blackhole' | 'wormhole' | 'star'

export interface Square {
  piece: Piece | null
  hazard: Hazard | null
  wormholeId: number | null
  planetOwner: Color | null
}

export interface Move {
  from: Pos
  to: Pos
  /** Square the piece actually occupies after a wormhole or black-hole hop. */
  finalTo?: Pos
  promotion?: PieceType
  capture?: boolean
  captured?: PieceType
  asteroidPush?: { from: Pos; to: Pos | null; destroyedEnemy?: Pos; shattered?: boolean }
  spawnedPawns?: Pos[]
  colonizedPlanet?: Pos
  solarPush?: { from: Pos; to: Pos }[]
  /** Pieces removed when stars drift at the end of a full turn. */
  hazardDeaths?: Pos[]
}

export interface CivilizationSetup {
  white: Civilization
  black: Civilization
}

export interface AsteroidBody {
  pos: Pos
  /** +1 drifts toward higher files, -1 toward lower. Bounces at the edge. */
  dir: 1 | -1
}

export interface PlanetBody {
  pos: Pos
  owner: Color | null
  /** Center of the clockwise ring. This tracks the planet's sun. */
  anchor: Pos
  step: number
  /** Index into `space.stars`. The planet walks that sun's ring. */
  sun?: number
}

export interface StarBody {
  pos: Pos
  dr: -1 | 1
  dc: -1 | 1
}

export interface SpaceLayout {
  asteroids: AsteroidBody[]
  planets: PlanetBody[]
  blackHoles: Pos[]
  wormholePairs: [Pos, Pos][]
  stars: StarBody[]
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
  space: SpaceLayout
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
