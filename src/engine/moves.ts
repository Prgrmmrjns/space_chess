import {
  ASTEROID_PUSH_RANGE,
  BOARD_SIZE,
  DEFAULT_SPAWN,
  REPTILOID_SPAWN,
  WHITE_BACK,
  BLACK_BACK,
} from './constants'
import {
  adjacentEmpty,
  advanceHazards,
  cloneState,
  countKings,
  findKings,
  findWormholeExit,
  getSquare,
  inBounds,
  isBlob,
  isCrustacean,
  isNearBlackHole,
  isReptiloid,
  isSilicate,
  isSolarite,
  isStarImmune,
  otherBlackHole,
  paintSpace,
} from './board'
import type { Color, GameState, Move, Piece, PieceType, Pos } from './types'
import { opponent, samePos } from './types'

function pawnDir(color: Color): number {
  return color === 'white' ? -1 : 1
}

function addPseudo(moves: Move[], from: Pos, to: Pos, extras: Partial<Move> = {}): void {
  moves.push({ from, to, ...extras })
}

function landExtras(to: Pos, final: Pos, capture?: boolean): Partial<Move> {
  return {
    finalTo: samePos(final, to) ? undefined : final,
    capture: capture || undefined,
  }
}

/** Where a ship actually stops, after wormholes and blob black-hole hops. */
export function resolveLanding(
  state: GameState,
  piece: Piece,
  to: Pos,
): { final: Pos } | null {
  const sq = getSquare(state, to)

  if (sq.hazard === 'blackhole') {
    if (!isBlob(state, piece.color)) return null
    const exit = otherBlackHole(state, to)
    if (!exit) return { final: to }
    const exitPiece = getSquare(state, exit).piece
    if (exitPiece && exitPiece.color === piece.color) return null
    return { final: exit }
  }

  if (isNearBlackHole(state, to) && !isBlob(state, piece.color)) return null

  if (sq.hazard === 'star' && !isStarImmune(state, piece.color)) return null

  if (sq.hazard === 'wormhole') {
    const exit = findWormholeExit(state, to)
    if (!exit) return null
    const exitSq = getSquare(state, exit)
    if (exitSq.piece && exitSq.piece.color === piece.color) return null
    if (isNearBlackHole(state, exit) && !isBlob(state, piece.color)) return null
    if (exitSq.hazard === 'star' && !isStarImmune(state, piece.color)) return null
    return { final: exit }
  }

  return { final: to }
}

function canOccupy(
  state: GameState,
  piece: Piece,
  pos: Pos,
  opts: { allowAsteroid?: boolean } = {},
): boolean {
  const sq = getSquare(state, pos)
  if (sq.hazard === 'asteroid') {
    return !!opts.allowAsteroid && isCrustacean(state, piece.color)
  }
  if (sq.hazard === 'blackhole') return isBlob(state, piece.color)
  if (sq.hazard === 'star') return isStarImmune(state, piece.color)
  if (sq.piece) return sq.piece.color !== piece.color
  return true
}

function needsPromotion(piece: Piece, final: Pos): PieceType | undefined {
  if (piece.type !== 'pawn') return undefined
  if (final.row === 0 || final.row === BOARD_SIZE - 1) return 'queen'
  return undefined
}

function pawnBlocked(state: GameState, piece: Piece, pos: Pos): boolean {
  const sq = getSquare(state, pos)
  if (sq.piece) return true
  if (sq.hazard === 'asteroid') return true
  if (sq.hazard === 'star' && !isStarImmune(state, piece.color)) return true
  if (sq.hazard === 'blackhole') return !isBlob(state, piece.color)
  return false
}

function generatePawnMoves(state: GameState, from: Pos, piece: Piece): Move[] {
  const moves: Move[] = []
  const dir = pawnDir(piece.color)
  const startRow = piece.color === 'white' ? 14 : 1

  const one: Pos = { row: from.row + dir, col: from.col }
  if (inBounds(one.row, one.col) && !pawnBlocked(state, piece, one)) {
    const land = resolveLanding(state, piece, one)
    if (land) {
      addPseudo(moves, from, one, {
        ...landExtras(one, land.final),
        promotion: needsPromotion(piece, land.final),
      })
      const first = getSquare(state, one)
      if (!piece.moved && from.row === startRow && !first.hazard) {
        const two: Pos = { row: from.row + 2 * dir, col: from.col }
        if (
          inBounds(two.row, two.col) &&
          !pawnBlocked(state, piece, two) &&
          getSquare(state, two).hazard !== 'planet'
        ) {
          const land2 = resolveLanding(state, piece, two)
          if (land2) {
            addPseudo(moves, from, two, landExtras(two, land2.final))
          }
        }
      }
    }
  }

  for (const dc of [-1, 1]) {
    const cap: Pos = { row: from.row + dir, col: from.col + dc }
    if (!inBounds(cap.row, cap.col)) continue
    const sq = getSquare(state, cap)
    const ep = state.enPassant && samePos(state.enPassant, cap)
    const enemy = sq.piece && sq.piece.color !== piece.color
    if (!enemy && !ep) continue
    if (sq.hazard === 'asteroid' && !isCrustacean(state, piece.color)) continue
    if (sq.hazard === 'star' && !isStarImmune(state, piece.color)) continue
    const land = resolveLanding(state, piece, cap)
    if (!land) continue
    addPseudo(moves, from, cap, {
      ...landExtras(cap, land.final, true),
      promotion: needsPromotion(piece, land.final),
    })
  }

  return moves
}

function generateSlideMoves(
  state: GameState,
  from: Pos,
  piece: Piece,
  dirs: [number, number][],
): Move[] {
  const moves: Move[] = []
  const glidesPlanets =
    isSilicate(state, piece.color) &&
    (piece.type === 'rook' || piece.type === 'bishop' || piece.type === 'queen')

  for (const [dr, dc] of dirs) {
    let r = from.row + dr
    let c = from.col + dc
    while (inBounds(r, c)) {
      const pos = { row: r, col: c }
      const sq = getSquare(state, pos)

      if (sq.hazard === 'asteroid') {
        if (isCrustacean(state, piece.color) && !sq.piece) {
          const land = resolveLanding(state, piece, pos)
          if (land) addPseudo(moves, from, pos, landExtras(pos, land.final))
        }
        break
      }

      if (sq.hazard === 'star') {
        if (isStarImmune(state, piece.color) && (!sq.piece || sq.piece.color !== piece.color)) {
          const land = resolveLanding(state, piece, pos)
          if (land) addPseudo(moves, from, pos, landExtras(pos, land.final, !!sq.piece))
        }
        break
      }

      if (sq.hazard === 'blackhole') {
        if (isBlob(state, piece.color)) {
          const land = resolveLanding(state, piece, pos)
          if (land) {
            const captured = !!getSquare(state, land.final).piece
            addPseudo(moves, from, pos, landExtras(pos, land.final, captured))
          }
        }
        break
      }

      if (sq.hazard === 'wormhole') {
        const land = resolveLanding(state, piece, pos)
        if (land) {
          const captured = !!getSquare(state, land.final).piece
          addPseudo(moves, from, pos, landExtras(pos, land.final, captured))
        }
        break
      }

      if (sq.hazard === 'planet') {
        if (sq.piece?.color === piece.color) break
        const land = resolveLanding(state, piece, pos)
        if (land) addPseudo(moves, from, pos, landExtras(pos, land.final, !!sq.piece))
        if (sq.piece || !glidesPlanets) break
        r += dr
        c += dc
        continue
      }

      if (sq.piece) {
        if (sq.piece.color !== piece.color) {
          const land = resolveLanding(state, piece, pos)
          if (land) addPseudo(moves, from, pos, landExtras(pos, land.final, true))
        }
        break
      }

      const land = resolveLanding(state, piece, pos)
      if (!land) break
      addPseudo(moves, from, pos, landExtras(pos, land.final))
      r += dr
      c += dc
    }
  }
  return moves
}

function generateLeapMoves(
  state: GameState,
  from: Pos,
  piece: Piece,
  deltas: [number, number][],
): Move[] {
  const moves: Move[] = []
  for (const [dr, dc] of deltas) {
    const pos = { row: from.row + dr, col: from.col + dc }
    if (!inBounds(pos.row, pos.col)) continue
    if (!canOccupy(state, piece, pos, { allowAsteroid: true })) continue
    const land = resolveLanding(state, piece, pos)
    if (!land) continue
    const destPiece = getSquare(state, land.final).piece
    const onTarget = getSquare(state, pos).piece
    const capture =
      !!(destPiece && destPiece.color !== piece.color) ||
      !!(onTarget && onTarget.color !== piece.color)
    addPseudo(moves, from, pos, landExtras(pos, land.final, capture))
  }
  return moves
}

function kingsAdjacent(a: Pos, b: Pos): boolean {
  return Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1
}

function generateKingMoves(state: GameState, from: Pos, piece: Piece): Move[] {
  const deltas: [number, number][] = [
    [-1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
    [1, 0],
    [1, -1],
    [0, -1],
    [-1, -1],
  ]
  const enemyKings = findKings(state, opponent(piece.color))
  const moves = generateLeapMoves(state, from, piece, deltas).filter((move) => {
    const final = move.finalTo ?? move.to
    return !enemyKings.some((king) => kingsAdjacent(final, king))
  })

  if (!piece.moved) {
    const back = piece.color === 'white' ? WHITE_BACK : BLACK_BACK
    if (from.row === back) {
      tryCastle(state, piece, from, moves, 'king')
      tryCastle(state, piece, from, moves, 'queen')
    }
  }

  return moves
}

function tryCastle(
  state: GameState,
  piece: Piece,
  from: Pos,
  moves: Move[],
  side: 'king' | 'queen',
): void {
  const half = from.col < 8 ? 0 : 8
  if (from.col < half || from.col > half + 7) return

  const back = from.row
  const rookCol = side === 'king' ? half + 7 : half
  const kingToCol = side === 'king' ? from.col + 2 : from.col - 2
  if (kingToCol < half || kingToCol > half + 7) return

  const rookSq = getSquare(state, { row: back, col: rookCol })
  if (!rookSq.piece || rookSq.piece.type !== 'rook' || rookSq.piece.moved) return
  if (rookSq.piece.color !== piece.color) return

  const lo = Math.min(from.col, rookCol) + 1
  const hi = Math.max(from.col, rookCol) - 1
  for (let col = lo; col <= hi; col++) {
    const sq = getSquare(state, { row: back, col })
    if (sq.piece || sq.hazard) return
    if (!isBlob(state, piece.color) && isNearBlackHole(state, { row: back, col })) return
  }

  if (isSquareAttacked(state, from, opponent(piece.color))) return
  const passed = side === 'king' ? [from.col + 1, kingToCol] : [from.col - 1, kingToCol]
  for (const col of passed) {
    const probe = cloneState(state)
    probe.board[back][from.col].piece = null
    probe.board[back][col].piece = { ...piece, moved: true }
    if (isSquareAttacked(probe, { row: back, col }, opponent(piece.color))) return
  }

  addPseudo(moves, from, { row: back, col: kingToCol })
}

export function generatePseudoMoves(state: GameState, from: Pos): Move[] {
  const piece = getSquare(state, from).piece
  if (!piece || piece.color !== state.turn) return []

  switch (piece.type) {
    case 'pawn':
      return generatePawnMoves(state, from, piece)
    case 'knight':
      return generateLeapMoves(state, from, piece, [
        [-2, 1],
        [-1, 2],
        [1, 2],
        [2, 1],
        [2, -1],
        [1, -2],
        [-1, -2],
        [-2, -1],
      ])
    case 'bishop':
      return generateSlideMoves(state, from, piece, [
        [-1, 1],
        [-1, -1],
        [1, 1],
        [1, -1],
      ])
    case 'rook':
      return generateSlideMoves(state, from, piece, [
        [-1, 0],
        [0, 1],
        [1, 0],
        [0, -1],
      ])
    case 'queen':
      return generateSlideMoves(state, from, piece, [
        [-1, 1],
        [-1, -1],
        [1, 1],
        [1, -1],
        [-1, 0],
        [0, 1],
        [1, 0],
        [0, -1],
      ])
    case 'king':
      return generateKingMoves(state, from, piece)
  }
}

/** Attacks ignoring civ suicide rules (for check detection). */
export function isSquareAttacked(state: GameState, target: Pos, byColor: Color): boolean {
  const dir = pawnDir(byColor)
  for (const dc of [-1, 1]) {
    const r = target.row - dir
    const c = target.col + dc
    if (!inBounds(r, c)) continue
    const piece = state.board[r][c].piece
    if (piece && piece.color === byColor && piece.type === 'pawn') return true
  }

  for (const [dr, dc] of [
    [-2, 1],
    [-1, 2],
    [1, 2],
    [2, 1],
    [2, -1],
    [1, -2],
    [-1, -2],
    [-2, -1],
  ] as [number, number][]) {
    const r = target.row + dr
    const c = target.col + dc
    if (!inBounds(r, c)) continue
    const piece = state.board[r][c].piece
    if (piece && piece.color === byColor && piece.type === 'knight') return true
  }

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const r = target.row + dr
      const c = target.col + dc
      if (!inBounds(r, c)) continue
      const piece = state.board[r][c].piece
      if (piece && piece.color === byColor && piece.type === 'king') return true
    }
  }

  const rays: { dirs: [number, number][]; types: PieceType[] }[] = [
    {
      dirs: [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ],
      types: ['rook', 'queen'],
    },
    {
      dirs: [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ],
      types: ['bishop', 'queen'],
    },
  ]

  for (const { dirs, types } of rays) {
    for (const [dr, dc] of dirs) {
      let r = target.row + dr
      let c = target.col + dc
      while (inBounds(r, c)) {
        const sq = state.board[r][c]
        if (sq.hazard === 'asteroid' || sq.hazard === 'star') break
        if (sq.piece) {
          if (sq.piece.color === byColor && types.includes(sq.piece.type)) return true
          break
        }
        if (sq.hazard === 'planet') {
          if (!isSilicate(state, byColor)) break
          r += dr
          c += dc
          continue
        }
        if (sq.hazard === 'wormhole' || sq.hazard === 'blackhole') break
        r += dr
        c += dc
      }
    }
  }

  return false
}

export function isInCheck(state: GameState, color: Color): boolean {
  const kings = findKings(state, color)
  if (kings.length < 2) return true
  return kings.some((king) => isSquareAttacked(state, king, opponent(color)))
}

function removeAsteroid(state: GameState, pos: Pos): void {
  state.space.asteroids = state.space.asteroids.filter((body) => !samePos(body.pos, pos))
  paintSpace(state)
}

function moveAsteroid(state: GameState, from: Pos, to: Pos): void {
  const body = state.space.asteroids.find((asteroid) => samePos(asteroid.pos, from))
  if (body) body.pos = to
  paintSpace(state)
}

function pushAsteroid(
  state: GameState,
  from: Pos,
  color: Color,
): { to: Pos | null; destroyedEnemy?: Pos; shattered?: boolean; destroyedType?: PieceType } {
  const dir = color === 'white' ? -1 : 1
  let lastSafe: Pos | null = null

  for (let step = 1; step <= ASTEROID_PUSH_RANGE; step++) {
    const row = from.row + dir * step
    const col = from.col
    if (!inBounds(row, col)) {
      removeAsteroid(state, from)
      return { to: null }
    }
    const target = state.board[row][col]
    if (target.hazard) {
      if (lastSafe) {
        moveAsteroid(state, from, lastSafe)
        return { to: lastSafe }
      }
      return { to: from }
    }
    if (target.piece) {
      if (isSilicate(state, target.piece.color)) {
        removeAsteroid(state, from)
        return { to: null, shattered: true }
      }
      const destroyed = target.piece.color !== color ? { row, col } : undefined
      const destroyedType = destroyed ? target.piece.type : undefined
      if (destroyed) target.piece = null
      removeAsteroid(state, from)
      return { to: null, destroyedEnemy: destroyed, destroyedType }
    }
    lastSafe = { row, col }
  }

  if (lastSafe) {
    moveAsteroid(state, from, lastSafe)
    return { to: lastSafe }
  }
  return { to: from }
}

function colonizePlanet(state: GameState, pos: Pos, color: Color): Pos[] {
  const body = state.space.planets.find((planet) => samePos(planet.pos, pos))
  if (!body && getSquare(state, pos).hazard !== 'planet') return []
  const previous = body?.owner ?? getSquare(state, pos).planetOwner
  if (body) body.owner = color
  paintSpace(state)
  if (previous === color) return []

  const empties = adjacentEmpty(state, pos)
  const count = Math.min(
    isReptiloid(state, color) ? REPTILOID_SPAWN : DEFAULT_SPAWN,
    empties.length,
  )
  const spawned: Pos[] = []
  for (let i = 0; i < count; i++) {
    const spot = empties[i]
    state.board[spot.row][spot.col].piece = { type: 'pawn', color, moved: false }
    spawned.push(spot)
  }
  return spawned
}

function solarFlare(state: GameState, landing: Pos, color: Color): { from: Pos; to: Pos }[] {
  if (!isSolarite(state, color)) return []
  const pushes: { from: Pos; to: Pos }[] = []
  const ortho: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]

  for (const star of state.space.stars) {
    const near =
      Math.max(Math.abs(star.pos.row - landing.row), Math.abs(star.pos.col - landing.col)) <= 1
    if (!near) continue
    for (const [dr, dc] of ortho) {
      const from = { row: star.pos.row + dr, col: star.pos.col + dc }
      const to = { row: star.pos.row + dr * 2, col: star.pos.col + dc * 2 }
      if (!inBounds(from.row, from.col) || !inBounds(to.row, to.col)) continue
      if (samePos(from, landing)) continue
      const victim = state.board[from.row][from.col].piece
      if (!victim || victim.color === color) continue
      const dest = state.board[to.row][to.col]
      if (dest.piece || dest.hazard) continue
      dest.piece = victim
      state.board[from.row][from.col].piece = null
      pushes.push({ from, to })
    }
  }
  return pushes
}

/** Apply a legal move. Mutates a clone and returns it. */
export function applyMove(state: GameState, move: Move): GameState {
  const next = cloneState(state)
  const piece = getSquare(next, move.from).piece
  if (!piece) return next

  const hintedFinal = move.finalTo ?? move.to
  const promo =
    move.promotion ??
    (piece.type === 'pawn' && (hintedFinal.row === 0 || hintedFinal.row === BOARD_SIZE - 1)
      ? 'queen'
      : undefined)

  let landing = move.to
  let capture = false
  let captured: PieceType | undefined
  let asteroidPush: Move['asteroidPush']
  let spawnedPawns: Pos[] | undefined
  let colonizedPlanet: Pos | undefined

  if (
    piece.type === 'pawn' &&
    next.enPassant &&
    samePos(move.to, next.enPassant) &&
    !getSquare(next, move.to).piece
  ) {
    next.board[move.from.row][move.to.col].piece = null
    capture = true
    captured = 'pawn'
  }

  next.board[move.from.row][move.from.col].piece = null

  if (getSquare(next, move.to).hazard === 'asteroid' && isCrustacean(next, piece.color)) {
    const pushed = pushAsteroid(next, move.to, piece.color)
    asteroidPush = { from: move.to, ...pushed }
    if (pushed.destroyedEnemy) {
      capture = true
      captured = pushed.destroyedType
    }
  }

  if (getSquare(next, move.to).hazard === 'wormhole') {
    const exit = findWormholeExit(next, move.to)
    if (exit) {
      const victim = getSquare(next, exit).piece
      if (victim) {
        capture = true
        captured = victim.type
        next.board[exit.row][exit.col].piece = null
      }
      landing = exit
    }
  } else if (getSquare(next, move.to).hazard === 'blackhole' && isBlob(next, piece.color)) {
    const exit = otherBlackHole(next, move.to)
    if (exit) {
      const victim = getSquare(next, exit).piece
      if (victim) {
        capture = true
        captured = victim.type
        next.board[exit.row][exit.col].piece = null
      }
      landing = exit
    }
  } else if (getSquare(next, move.to).piece) {
    captured = getSquare(next, move.to).piece?.type
    capture = true
  }

  const movedPiece: Piece = {
    type: promo && piece.type === 'pawn' ? promo : piece.type,
    color: piece.color,
    moved: true,
  }
  next.board[landing.row][landing.col].piece = movedPiece

  if (piece.type === 'king' && Math.abs(move.to.col - move.from.col) === 2) {
    const back = move.from.row
    const half = move.from.col < 8 ? 0 : 8
    const kingside = move.to.col > move.from.col
    const rookFrom = kingside ? half + 7 : half
    const rookTo = kingside ? move.to.col - 1 : move.to.col + 1
    const rook = next.board[back][rookFrom].piece
    next.board[back][rookFrom].piece = null
    if (rook) next.board[back][rookTo].piece = { ...rook, moved: true }
  }

  if (getSquare(next, landing).hazard === 'planet') {
    spawnedPawns = colonizePlanet(next, landing, piece.color)
    colonizedPlanet = landing
  }

  const solarPush = solarFlare(next, landing, piece.color)

  next.enPassant = null
  if (piece.type === 'pawn' && Math.abs(move.to.row - move.from.row) === 2) {
    next.enPassant = {
      row: (move.to.row + move.from.row) / 2,
      col: move.from.col,
    }
  }

  let hazardDeaths: Pos[] | undefined
  if (piece.color === 'black') {
    const deaths = advanceHazards(next)
    if (deaths.length) hazardDeaths = deaths
    next.moveNumber += 1
  }

  const annotated: Move = {
    ...move,
    finalTo: landing,
    capture: capture || !!move.capture,
    captured,
    promotion: promo,
    asteroidPush,
    spawnedPawns,
    colonizedPlanet,
    solarPush: solarPush.length ? solarPush : undefined,
    hazardDeaths,
  }

  next.lastMove = annotated
  const noisy =
    piece.type === 'pawn' ||
    capture ||
    !!hazardDeaths?.length ||
    solarPush.length > 0
  next.halfmoveClock = noisy ? 0 : next.halfmoveClock + 1
  next.turn = opponent(piece.color)
  return next
}

export function generateLegalMoves(state: GameState, from?: Pos): Move[] {
  const origins: Pos[] = []
  if (from) {
    origins.push(from)
  } else {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = state.board[row][col].piece
        if (piece && piece.color === state.turn) origins.push({ row, col })
      }
    }
  }

  const legal: Move[] = []
  for (const origin of origins) {
    const piece = getSquare(state, origin).piece
    if (!piece) continue
    for (const move of generatePseudoMoves(state, origin)) {
      const variants: Move[] =
        move.promotion && piece.type === 'pawn'
          ? (['queen', 'rook', 'bishop', 'knight'] as PieceType[]).map((promotion) => ({
              ...move,
              promotion,
            }))
          : [move]

      for (const variant of variants) {
        const next = applyMove(state, variant)
        if (countKings(next, piece.color) < 2) continue
        if (!isInCheck(next, piece.color)) legal.push(variant)
      }
    }
  }
  return legal
}

export function updateStatus(state: GameState): GameState {
  const next = cloneState(state)
  const key = `${next.turn}:${next.moveNumber}:${JSON.stringify(
    next.board.map((row) =>
      row.map((sq) =>
        sq.piece ? `${sq.piece.color[0]}${sq.piece.type[0]}` : sq.hazard ? sq.hazard[0] : '.',
      ),
    ),
  )}:${next.space.planets.map((planet) => planet.owner ?? '-').join('')}`
  next.positionHistory.push(key)
  const repeats = next.positionHistory.filter((entry) => entry === key).length

  const whiteKings = countKings(next, 'white')
  const blackKings = countKings(next, 'black')
  if (whiteKings < 2 && blackKings < 2) {
    next.status = 'draw'
    next.winner = null
    return next
  }
  if (whiteKings < 2) {
    next.status = 'checkmate'
    next.winner = 'black'
    return next
  }
  if (blackKings < 2) {
    next.status = 'checkmate'
    next.winner = 'white'
    return next
  }

  const legal = generateLegalMoves(next)
  const inCheck = isInCheck(next, next.turn)

  if (legal.length === 0) {
    if (inCheck) {
      next.status = 'checkmate'
      next.winner = opponent(next.turn)
    } else {
      next.status = 'stalemate'
      next.winner = null
    }
    return next
  }

  if (repeats >= 3 || next.halfmoveClock >= 100) {
    next.status = 'draw'
    next.winner = null
    return next
  }

  let nonKing = 0
  let minor = 0
  for (const row of next.board) {
    for (const sq of row) {
      if (!sq.piece) continue
      if (sq.piece.type !== 'king') nonKing++
      if (sq.piece.type === 'knight' || sq.piece.type === 'bishop') minor++
    }
  }
  if (nonKing === 0 || (nonKing === 1 && minor === 1)) {
    next.status = 'draw'
    next.winner = null
    return next
  }

  next.status = inCheck ? 'check' : 'playing'
  next.winner = null
  return next
}

export function movesEqual(a: Move, b: Move): boolean {
  return samePos(a.from, b.from) && samePos(a.to, b.to) && a.promotion === b.promotion
}

export function findMove(
  legal: Move[],
  from: Pos,
  to: Pos,
  promotion?: PieceType,
): Move | undefined {
  return legal.find(
    (move) =>
      samePos(move.from, from) &&
      samePos(move.to, to) &&
      (promotion ? move.promotion === promotion : true),
  )
}
