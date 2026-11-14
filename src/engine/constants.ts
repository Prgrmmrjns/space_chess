export const BOARD_SIZE = 16
export const ASTEROID_COUNT = 8
export const PLANET_COUNT = 4
export const BLACK_HOLE_COUNT = 2
export const WORMHOLE_PAIRS = 2
export const STAR_COUNT = 4

/** White back rank / black back rank on the 16×16 board. */
export const WHITE_BACK = 15
export const BLACK_BACK = 0
export const WHITE_PAWN_ROW = 14
export const BLACK_PAWN_ROW = 1

/** Flagships sit on these files: the standard back rank, doubled. */
export const FLAGSHIP_COLS = [4, 12] as const

/** Crustacean asteroid push distance. */
export const ASTEROID_PUSH_RANGE = 3

/** Reptiloids spawn up to this many fighters on a fresh planet claim. */
export const REPTILOID_SPAWN = 2
/** Other civs spawn this many on a fresh planet claim. */
export const DEFAULT_SPAWN = 1

export const CIV_LABELS = {
  reptiloid: 'Reptiloids',
  crustacean: 'Crustaceans',
  blob: 'Blobs',
  solarite: 'Solarites',
  silicate: 'Silicates',
} as const

export const CIV_ABILITIES = {
  reptiloid: 'Claiming a planet spawns up to 2 allied fighters on empty adjacent squares.',
  crustacean: 'May land on asteroids and shove them up to 3 squares toward the enemy.',
  blob: 'Immune to black holes and stars. Entering a black hole hops to the other one.',
  solarite: 'Immune to stars. Ending a move beside a star shoves nearby enemies one square outward.',
  silicate: 'Capital ships glide through planets. An asteroid that would crush a silicate shatters instead.',
} as const

/** Player-facing names. Engine ids stay the chess set so move rules stay familiar. */
export const FLEET_NAMES: Record<
  'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king',
  string
> = {
  pawn: 'Fighter',
  knight: 'Cruiser',
  bishop: 'Frigate',
  rook: 'Battleship',
  queen: 'Dreadnought',
  king: 'Flagship',
}

export const DIFFICULTY_BLURB = {
  easy: 'One ply, and it sometimes flies sloppy.',
  medium: 'Looks two plies ahead.',
  hard: 'Looks three plies ahead, still on a budget.',
} as const

/** Clockwise ring around a planet anchor, starting north. */
export const PLANET_RING: readonly (readonly [number, number])[] = [
  [-1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, -1],
]
