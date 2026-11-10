import {
  ASTEROID_PUSH_RANGE,
  BLACK_BACK,
  BOARD_SIZE,
  DEFAULT_SPAWN,
  PIECE_START_COL,
  REPTILOID_SPAWN,
  WHITE_BACK,
} from './constants'
import {
  adjacentEmpty,
  cloneState,
  findKing,
  findWormholeExit,
  getSquare,
  inBounds,
  isBlob,
  isCrustacean,
  isNearBlackHole,
  isReptiloid,
} from './board'
import type { Color, GameState, Move, Piece, PieceType, Pos } from './types'
import { opponent, samePos } from './types'

function pawnDir(color: Color): number {
  return color === 'white' ? -1 : 1
}

function addPseudo(
  moves: Move[],
  from: Pos,
  to: Pos,
  extras: Partial<Move> = {},
): void {
  moves.push({ from, to, ...extras })
}

/** Resolve where a piece actually ends after hazards (pre-check filter). */
export function resolveLanding(
  state: GameState,
  piece: Piece,
  to: Pos,
): { final: Pos; consumed: boolean; wormhole: boolean } | null {
  // Non-blobs may not enter the black-hole gravity well.
  if (isNearBlackHole(state, to) && !isBlob(state, piece.color)) {
    return null
  }

  if (getSquare(state, to).hazard === 'wormhole') {
    const exit = findWormholeExit(state, to)
    if (!exit) return null
    const exitSq = getSquare(state, exit)
    if (exitSq.piece && exitSq.piece.color === piece.color) return null
    // Exit also cannot dump a non-blob into a black hole.
    if (isNearBlackHole(state, exit) && !isBlob(state, piece.color)) {
      return null
    }
    return { final: exit, consumed: false, wormhole: true }
  }

  return { final: to, consumed: false, wormhole: false }
}

function canOccupy(
  state: GameState,
  piece: Piece,
  pos: Pos,
  opts: { allowAsteroid?: boolean; allowEnemy?: boolean } = {},
): boolean {
  const sq = getSquare(state, pos)
  if (sq.hazard === 'asteroid') {
    return !!opts.allowAsteroid && isCrustacean(state, piece.color)
  }
  if (sq.hazard === 'blackhole') {
    return isBlob(state, piece.color)
  }
  if (sq.piece) {
    if (sq.piece.color === piece.color) return false
    return opts.allowEnemy !== false
  }
  return true
}

function generatePawnMoves(state: GameState, from: Pos, piece: Piece): Move[] {
  const moves: Move[] = []
  const dir = pawnDir(piece.color)
  const startRow = piece.color === 'white' ? 14 : 1

  // Forward
  const one: Pos = { row: from.row + dir, col: from.col }
  if (inBounds(one.row, one.col)) {
    const sq = getSquare(state, one)
    if (!sq.piece && sq.hazard !== 'asteroid') {
      const land = resolveLanding(state, piece, one)
      if (land) {
        const promo = needsPromotion(piece, land.final)
        addPseudo(moves, from, one, {
          finalTo: land.wormhole ? land.final : undefined,
          promotion: promo,
        })
      }
      if (!piece.moved && from.row === startRow) {
        const two: Pos = { row: from.row + 2 * dir, col: from.col }
        if (inBounds(two.row, two.col)) {
          const sq2 = getSquare(state, two)
          if (!sq2.piece && sq2.hazard !== 'asteroid' && sq2.hazard !== 'planet') {
            const land2 = resolveLanding(state, piece, two)
            if (land2) {
              addPseudo(moves, from, two, {
                finalTo: land2.wormhole ? land2.final : undefined,
              })
            }
          }
        }
      }
    }
  }

  // Captures
  for (const dc of [-1, 1]) {
    const cap: Pos = { row: from.row + dir, col: from.col + dc }
    if (!inBounds(cap.row, cap.col)) continue
    const sq = getSquare(state, cap)
    const ep =
      state.enPassant && samePos(state.enPassant, cap) ? true : false
    const enemy = sq.piece && sq.piece.color !== piece.color
    if (!enemy && !ep) continue
    if (sq.hazard === 'asteroid' && !isCrustacean(state, piece.color)) continue
    const land = resolveLanding(state, piece, cap)
    if (!land) continue
    const promo = needsPromotion(piece, land.final)
    addPseudo(moves, from, cap, {
      finalTo: land.wormhole ? land.final : undefined,
      capture: true,
      promotion: promo,
    })
  }

  return moves
}

function needsPromotion(piece: Piece, final: Pos): PieceType | undefined {
  if (piece.type !== 'pawn') return undefined
  if (final.row === 0 || final.row === BOARD_SIZE - 1) return 'queen'
  return undefined
}

function generateSlideMoves(
  state: GameState,
  from: Pos,
  piece: Piece,
  dirs: [number, number][],
): Move[] {
  const moves: Move[] = []
  for (const [dr, dc] of dirs) {
    let r = from.row + dr
    let c = from.col + dc
    while (inBounds(r, c)) {
      const pos = { row: r, col: c }
      const sq = getSquare(state, pos)

      if (sq.hazard === 'asteroid') {
        if (isCrustacean(state, piece.color) && !sq.piece) {
          const land = resolveLanding(state, piece, pos)
          if (land) addPseudo(moves, from, pos, { finalTo: land.wormhole ? land.final : undefined })
        }
        break
      }

      if (sq.hazard === 'blackhole') {
        if (isBlob(state, piece.color)) {
          addPseudo(moves, from, pos)
        }
        break
      }

      if (sq.hazard === 'wormhole') {
        const land = resolveLanding(state, piece, pos)
        if (land) {
          addPseudo(moves, from, pos, {
            finalTo: land.final,
            capture: !!getSquare(state, land.final).piece,
          })
        }
        break
      }

      if (sq.hazard === 'planet') {
        // Gravity well: must stop on the planet square.
        if (!sq.piece || sq.piece.color !== piece.color) {
          const land = resolveLanding(state, piece, pos)
          if (land) {
            addPseudo(moves, from, pos, {
              finalTo: land.wormhole ? land.final : undefined,
              capture: !!sq.piece,
            })
          }
        }
        break
      }

      if (sq.piece) {
        if (sq.piece.color !== piece.color) {
          const land = resolveLanding(state, piece, pos)
          if (land) {
            addPseudo(moves, from, pos, {
              finalTo: land.wormhole ? land.final : undefined,
              capture: true,
            })
          }
        }
        break
      }

      const land = resolveLanding(state, piece, pos)
      if (land) {
        addPseudo(moves, from, pos, {
          finalTo: land.wormhole ? land.final : undefined,
        })
      }

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
    addPseudo(moves, from, pos, {
      finalTo: land.wormhole ? land.final : undefined,
      capture: !!(destPiece && destPiece.color !== piece.color) || !!getSquare(state, pos).piece,
    })
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
  const moves = generateLeapMoves(state, from, piece, deltas).filter((m) => {
    const final = m.finalTo ?? m.to
    const enemyKing = findKing(state, opponent(piece.color))
    if (enemyKing && kingsAdjacent(final, enemyKing)) return false
    return true
  })

  // Castling — king starts at col 8 (PIECE_START_COL + 4 = 8).
  if (!piece.moved) {
    const back = piece.color === 'white' ? WHITE_BACK : BLACK_BACK
    if (from.row === back && from.col === PIECE_START_COL + 4) {
      // Kingside: rook at col 11, king → 10, rook → 9
      tryCastle(state, piece, from, moves, 'king')
      // Queenside: rook at col 4, king → 6, rook → 7
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
  const back = from.row
  const rookCol = side === 'king' ? PIECE_START_COL + 7 : PIECE_START_COL
  const kingToCol = side === 'king' ? from.col + 2 : from.col - 2
  const between =
    side === 'king'
      ? [from.col + 1, from.col + 2]
      : [from.col - 1, from.col - 2, from.col - 3]

  const rookSq = getSquare(state, { row: back, col: rookCol })
  if (!rookSq.piece || rookSq.piece.type !== 'rook' || rookSq.piece.moved) return
  if (rookSq.piece.color !== piece.color) return

  for (const c of between) {
    const sq = getSquare(state, { row: back, col: c })
    if (sq.piece || sq.hazard === 'asteroid' || sq.hazard === 'blackhole') return
  }

  // Cannot castle out of, through, or into check.
  if (isSquareAttacked(state, from, opponent(piece.color))) return
  for (const c of side === 'king' ? [from.col + 1, kingToCol] : [from.col - 1, kingToCol]) {
    const probe = cloneState(state)
    // Simulate king stepping
    probe.board[back][from.col].piece = null
    probe.board[back][c].piece = { ...piece, moved: true }
    if (isSquareAttacked(probe, { row: back, col: c }, opponent(piece.color))) return
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
export function isSquareAttacked(
  state: GameState,
  target: Pos,
  byColor: Color,
): boolean {
  // Pawns
  const dir = pawnDir(byColor)
  for (const dc of [-1, 1]) {
    const r = target.row - dir
    const c = target.col + dc
    if (inBounds(r, c)) {
      const p = state.board[r][c].piece
      if (p && p.color === byColor && p.type === 'pawn') return true
    }
  }

  // Knights
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
    const p = state.board[r][c].piece
    if (p && p.color === byColor && p.type === 'knight') return true
  }

  // King
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const r = target.row + dr
      const c = target.col + dc
      if (!inBounds(r, c)) continue
      const p = state.board[r][c].piece
      if (p && p.color === byColor && p.type === 'king') return true
    }
  }

  // Sliders
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
        if (sq.hazard === 'asteroid') break
        if (sq.piece) {
          if (sq.piece.color === byColor && types.includes(sq.piece.type)) {
            return true
          }
          break
        }
        // Planets / wormholes / BH stop sliding attacks beyond them
        if (sq.hazard === 'planet' || sq.hazard === 'wormhole' || sq.hazard === 'blackhole') {
          break
        }
        r += dr
        c += dc
      }
    }
  }

  return false
}

export function isInCheck(state: GameState, color: Color): boolean {
  const king = findKing(state, color)
  if (!king) return true // missing king counts as check/loss
  return isSquareAttacked(state, king, opponent(color))
}

function pushAsteroid(
  state: GameState,
  from: Pos,
  color: Color,
): { to: Pos | null; destroyedEnemy?: Pos } {
  const dir = color === 'white' ? -1 : 1
  let lastSafe: Pos | null = null

  for (let step = 1; step <= ASTEROID_PUSH_RANGE; step++) {
    const row = from.row + dir * step
    const col = from.col
    if (!inBounds(row, col)) {
      // Flies off the board
      state.board[from.row][from.col].hazard = null
      return { to: null }
    }
    const sq = state.board[row][col]
    if (sq.hazard) {
      // Stop before obstacle
      if (lastSafe) {
        state.board[from.row][from.col].hazard = null
        state.board[lastSafe.row][lastSafe.col].hazard = 'asteroid'
        return { to: lastSafe }
      }
      return { to: from }
    }
    if (sq.piece) {
      const destroyed =
        sq.piece.color !== color ? { row, col } : undefined
      if (destroyed) sq.piece = null
      state.board[from.row][from.col].hazard = null
      return { to: null, destroyedEnemy: destroyed }
    }
    lastSafe = { row, col }
  }

  if (lastSafe) {
    state.board[from.row][from.col].hazard = null
    state.board[lastSafe.row][lastSafe.col].hazard = 'asteroid'
    return { to: lastSafe }
  }
  return { to: from }
}

function colonizePlanet(state: GameState, pos: Pos, color: Color): Pos[] {
  const sq = getSquare(state, pos)
  if (sq.hazard !== 'planet') return []
  const previous = sq.planetOwner
  sq.planetOwner = color
  // Spawn only when ownership changes (or first claim).
  if (previous === color) return []

  const empties = adjacentEmpty(state, pos)
  const count = Math.min(
    isReptiloid(state, color) ? REPTILOID_SPAWN : DEFAULT_SPAWN,
    empties.length,
  )
  const spawned: Pos[] = []
  for (let i = 0; i < count; i++) {
    const p = empties[i]
    state.board[p.row][p.col].piece = {
      type: 'pawn',
      color,
      moved: false,
    }
    spawned.push(p)
  }
  return spawned
}

/** Apply a legal move; mutates a clone and returns it. */
export function applyMove(state: GameState, move: Move): GameState {
  const next = cloneState(state)
  const piece = getSquare(next, move.from).piece
  if (!piece) return next

  const promo = move.promotion ?? (piece.type === 'pawn' &&
    ((move.finalTo ?? move.to).row === 0 || (move.finalTo ?? move.to).row === BOARD_SIZE - 1)
    ? 'queen'
    : undefined)

  let landing = move.to
  let capture = false
  let asteroidPush: Move['asteroidPush']
  let spawnedPawns: Pos[] | undefined
  let colonizedPlanet: Pos | undefined

  // En passant capture
  if (
    piece.type === 'pawn' &&
    next.enPassant &&
    samePos(move.to, next.enPassant) &&
    !getSquare(next, move.to).piece
  ) {
    const capRow = move.from.row
    next.board[capRow][move.to.col].piece = null
    capture = true
  }

  // Clear origin
  next.board[move.from.row][move.from.col].piece = null

  // Crustacean asteroid shove
  if (
    getSquare(next, move.to).hazard === 'asteroid' &&
    isCrustacean(next, piece.color)
  ) {
    const pushed = pushAsteroid(next, move.to, piece.color)
    asteroidPush = { from: move.to, ...pushed }
    if (pushed.destroyedEnemy) capture = true
  }

  // Wormhole teleport
  if (getSquare(next, move.to).hazard === 'wormhole') {
    const exit = findWormholeExit(next, move.to)
    if (exit) {
      if (getSquare(next, exit).piece) {
        capture = true
        next.board[exit.row][exit.col].piece = null
      }
      landing = exit
    }
  } else if (getSquare(next, move.to).piece) {
    capture = true
  }

  const movedPiece: Piece = {
    type: promo && piece.type === 'pawn' ? promo : piece.type,
    color: piece.color,
    moved: true,
  }
  next.board[landing.row][landing.col].piece = movedPiece

  // Castling rook move
  if (piece.type === 'king' && Math.abs(move.to.col - move.from.col) === 2) {
    const back = move.from.row
    if (move.to.col > move.from.col) {
      // kingside
      const rookFrom = PIECE_START_COL + 7
      const rookTo = move.to.col - 1
      const rook = next.board[back][rookFrom].piece
      next.board[back][rookFrom].piece = null
      if (rook) next.board[back][rookTo].piece = { ...rook, moved: true }
    } else {
      const rookFrom = PIECE_START_COL
      const rookTo = move.to.col + 1
      const rook = next.board[back][rookFrom].piece
      next.board[back][rookFrom].piece = null
      if (rook) next.board[back][rookTo].piece = { ...rook, moved: true }
    }
  }

  // Planet colonization
  if (getSquare(next, landing).hazard === 'planet') {
    spawnedPawns = colonizePlanet(next, landing, piece.color)
    colonizedPlanet = landing
  }

  // En passant target
  next.enPassant = null
  if (piece.type === 'pawn' && Math.abs(move.to.row - move.from.row) === 2) {
    next.enPassant = {
      row: (move.to.row + move.from.row) / 2,
      col: move.from.col,
    }
  }

  const annotated: Move = {
    ...move,
    finalTo: landing,
    capture: capture || !!move.capture,
    promotion: promo,
    asteroidPush,
    spawnedPawns,
    colonizedPlanet,
  }

  next.lastMove = annotated
  next.halfmoveClock = piece.type === 'pawn' || capture ? 0 : next.halfmoveClock + 1
  if (piece.color === 'black') next.moveNumber += 1
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
        const p = state.board[row][col].piece
        if (p && p.color === state.turn) origins.push({ row, col })
      }
    }
  }

  const legal: Move[] = []
  for (const origin of origins) {
    const piece = getSquare(state, origin).piece
    if (!piece) continue
    for (const move of generatePseudoMoves(state, origin)) {
      // Expand promotions
      const variants: Move[] =
        move.promotion && piece.type === 'pawn'
          ? (['queen', 'rook', 'bishop', 'knight'] as PieceType[]).map((promotion) => ({
              ...move,
              promotion,
            }))
          : [move]

      for (const variant of variants) {
        const next = applyMove(state, variant)
        // Moving side must not leave their king in check
        if (!isInCheck(next, piece.color)) {
          // Also: if own king vanished (shouldn't), illegal
          if (findKing(next, piece.color)) legal.push(variant)
        }
      }
    }
  }
  return legal
}

export function updateStatus(state: GameState): GameState {
  const next = cloneState(state)
  const key = (() => {
    // reuse board positionKey via dynamic import avoidance — inline light key
    return `${next.turn}:${next.moveNumber}:${JSON.stringify(
      next.board.map((row) =>
        row.map((sq) =>
          sq.piece
            ? `${sq.piece.color[0]}${sq.piece.type[0]}`
            : sq.hazard
              ? sq.hazard[0]
              : '.',
        ),
      ),
    )}`
  })()
  next.positionHistory.push(key)
  const repeats = next.positionHistory.filter((k) => k === key).length

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

  // Insufficient material: only kings (ignore hazards)
  let pieces = 0
  let minor = 0
  for (const row of next.board) {
    for (const sq of row) {
      if (!sq.piece) continue
      pieces++
      if (sq.piece.type === 'knight' || sq.piece.type === 'bishop') minor++
    }
  }
  if (pieces === 2 || (pieces === 3 && minor === 1)) {
    next.status = 'draw'
    next.winner = null
    return next
  }

  next.status = inCheck ? 'check' : 'playing'
  next.winner = null
  return next
}

export function movesEqual(a: Move, b: Move): boolean {
  return (
    samePos(a.from, b.from) &&
    samePos(a.to, b.to) &&
    a.promotion === b.promotion
  )
}

export function findMove(
  legal: Move[],
  from: Pos,
  to: Pos,
  promotion?: PieceType,
): Move | undefined {
  return legal.find(
    (m) =>
      samePos(m.from, from) &&
      samePos(m.to, to) &&
      (promotion ? m.promotion === promotion : true),
  )
}
