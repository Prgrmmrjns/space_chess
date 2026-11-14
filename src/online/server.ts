import { nextElo } from '../engine/elo'
import { playMove, startGame } from '../engine/game'
import type { Civilization, Color, GameState, PieceType, Pos } from '../engine/types'

export type MatchStatus = 'open' | 'playing' | 'done'

export interface ProfileRow {
  id: string
  username: string
  elo: number
  games: number
}

export interface MatchRow {
  id: string
  code: string
  white_id: string
  black_id: string | null
  white_civ: Civilization
  black_civ: Civilization | null
  state: GameState | null
  status: MatchStatus
  winner: Color | null
  rated: boolean
  updated_at: string
}

export interface MatchDb {
  insertMatch(row: Omit<MatchRow, 'id'>): Promise<MatchRow>
  getByCode(code: string): Promise<MatchRow | null>
  getById(id: string): Promise<MatchRow | null>
  /** Compare-and-swap on updated_at. Returns null when the row moved. */
  save(id: string, expectedUpdatedAt: string, next: MatchRow): Promise<MatchRow | null>
  getProfile(id: string): Promise<ProfileRow | null>
  setRating(id: string, elo: number, games: number): Promise<void>
}

export type MatchAction =
  | { action: 'create'; civ: Civilization }
  | { action: 'join'; code: string; civ: Civilization }
  | { action: 'move'; matchId: string; from: Pos; to: Pos; promotion?: PieceType }
  | { action: 'resign'; matchId: string }
  | { action: 'claim'; matchId: string }

export type MatchResult =
  | { ok: true; match: MatchRow }
  | { ok: false; error: string }

const CLAIM_MS = 60_000

const CIVS: Civilization[] = ['reptiloid', 'crustacean', 'blob', 'solarite', 'silicate']

export async function handleAction(
  db: MatchDb,
  userId: string,
  body: MatchAction,
  now = Date.now(),
  rng: () => number = Math.random,
): Promise<MatchResult> {
  if (body.action === 'create') {
    if (!CIVS.includes(body.civ)) return { ok: false, error: 'Unknown civilisation' }
    const match = await db.insertMatch({
      code: makeCode(rng),
      white_id: userId,
      black_id: null,
      white_civ: body.civ,
      black_civ: null,
      state: null,
      status: 'open',
      winner: null,
      rated: true,
      updated_at: new Date(now).toISOString(),
    })
    return { ok: true, match }
  }

  if (body.action === 'join') {
    if (!CIVS.includes(body.civ)) return { ok: false, error: 'Unknown civilisation' }
    const match = await db.getByCode(body.code.trim().toUpperCase())
    if (!match || match.status !== 'open' || match.black_id) {
      return { ok: false, error: 'That code is not an open match' }
    }
    if (match.white_id === userId) return { ok: false, error: 'You are already in this match' }
    const state = startGame({
      mode: 'pvp',
      difficulty: 'medium',
      playerColor: 'white',
      civs: { white: match.white_civ, black: body.civ },
      seed: now,
    })
    const next: MatchRow = {
      ...match,
      black_id: userId,
      black_civ: body.civ,
      state,
      status: 'playing',
      updated_at: new Date(now).toISOString(),
    }
    const saved = await db.save(match.id, match.updated_at, next)
    if (!saved) return { ok: false, error: 'Someone else took that seat' }
    return { ok: true, match: saved }
  }

  const match = await db.getById(body.matchId)
  if (!match) return { ok: false, error: 'Match not found' }
  const color = seat(match, userId)
  if (!color) return { ok: false, error: 'You are not in this match' }
  if (match.status !== 'playing' || !match.state) {
    return { ok: false, error: 'This match is not in progress' }
  }

  if (body.action === 'resign') {
    return finish(db, match, color === 'white' ? 'black' : 'white', now)
  }

  if (body.action === 'claim') {
    const waiting = Date.parse(match.updated_at)
    if (match.state.turn === color) return { ok: false, error: 'It is your move' }
    if (now - waiting < CLAIM_MS) return { ok: false, error: 'The minute has not passed' }
    return finish(db, match, color, now)
  }

  if (match.state.turn !== color) return { ok: false, error: 'Not your turn' }
  const played = playMove(match.state, body.from, body.to, body.promotion ?? 'queen')
  if (!played.ok) return { ok: false, error: played.reason }

  const terminal =
    played.state.status === 'checkmate' ||
    played.state.status === 'stalemate' ||
    played.state.status === 'draw'
  if (!terminal) {
    const next: MatchRow = {
      ...match,
      state: played.state,
      updated_at: new Date(now).toISOString(),
    }
    const saved = await db.save(match.id, match.updated_at, next)
    if (!saved) return { ok: false, error: 'The match moved on. Refresh.' }
    return { ok: true, match: saved }
  }

  const winner =
    played.state.status === 'checkmate' ? played.state.winner : null
  return finish(db, { ...match, state: played.state }, winner, now)
}

async function finish(
  db: MatchDb,
  match: MatchRow,
  winner: Color | null,
  now: number,
): Promise<MatchResult> {
  const next: MatchRow = {
    ...match,
    status: 'done',
    winner,
    updated_at: new Date(now).toISOString(),
  }
  const saved = await db.save(match.id, match.updated_at, next)
  if (!saved) return { ok: false, error: 'The match moved on. Refresh.' }
  if (saved.rated && saved.white_id && saved.black_id) {
    await writeElo(db, saved.white_id, saved.black_id, winner)
  }
  return { ok: true, match: saved }
}

async function writeElo(
  db: MatchDb,
  whiteId: string,
  blackId: string,
  winner: Color | null,
): Promise<void> {
  const white = await db.getProfile(whiteId)
  const black = await db.getProfile(blackId)
  if (!white || !black) return
  const whiteScore = winner === 'white' ? 1 : winner === 'black' ? 0 : 0.5
  await db.setRating(whiteId, nextElo(white.elo, black.elo, whiteScore), white.games + 1)
  await db.setRating(blackId, nextElo(black.elo, white.elo, 1 - whiteScore), black.games + 1)
}

function seat(match: MatchRow, userId: string): Color | null {
  if (match.white_id === userId) return 'white'
  if (match.black_id === userId) return 'black'
  return null
}

function makeCode(rng: () => number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(rng() * alphabet.length)]
  return code
}

