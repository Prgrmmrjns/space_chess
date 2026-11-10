export const BOARD_SIZE = 16
export const ASTEROID_COUNT = 8
export const PLANET_COUNT = 4
export const BLACK_HOLE_COUNT = 2
export const WORMHOLE_PAIRS = 2

/** Standard pieces occupy the middle 8 files (cols 4–11). */
export const PIECE_START_COL = 4
export const PIECE_END_COL = 11

/** White back rank / black back rank on the 16×16 board. */
export const WHITE_BACK = 15
export const BLACK_BACK = 0
export const WHITE_PAWN_ROW = 14
export const BLACK_PAWN_ROW = 1

/** Crustacean asteroid push distance. */
export const ASTEROID_PUSH_RANGE = 4

/** Reptiloids spawn up to this many pawns on planet claim. */
export const REPTILOID_SPAWN = 3
/** Other civs spawn this many on planet claim. */
export const DEFAULT_SPAWN = 1

export const CIV_LABELS = {
  reptiloid: 'Reptiloids',
  crustacean: 'Crustaceans',
  blob: 'Blobs',
} as const

export const CIV_ABILITIES = {
  reptiloid: 'Claiming a planet spawns up to 3 allied pawns on empty adjacent squares.',
  crustacean: 'May land on asteroids and shove them up to 4 squares toward the enemy, crushing foes.',
  blob: 'Immune to black holes — may occupy the hole and its gravity well.',
} as const
