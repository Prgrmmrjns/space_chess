import { describe, expect, it } from 'vitest'
import { getLegalMoves } from '../engine/game'
import type { Civilization } from '../engine/types'
import { handleAction, type MatchDb, type MatchRow, type ProfileRow } from './server'

class MemoryDb implements MatchDb {
  matches = new Map<string, MatchRow>()
  profiles = new Map<string, ProfileRow>()

  async insertMatch(row: Omit<MatchRow, 'id'>) {
    const stored = { ...row, id: `m-${this.matches.size + 1}` }
    this.matches.set(stored.id, stored)
    return stored
  }
  async getByCode(code: string) {
    return [...this.matches.values()].find((match) => match.code === code) ?? null
  }
  async getById(id: string) {
    return this.matches.get(id) ?? null
  }
  async save(id: string, expectedUpdatedAt: string, next: MatchRow) {
    const current = this.matches.get(id)
    if (!current || current.updated_at !== expectedUpdatedAt) return null
    this.matches.set(id, next)
    return next
  }
  async getProfile(id: string) {
    return this.profiles.get(id) ?? null
  }
  async setRating(id: string, elo: number, games: number) {
    const profile = this.profiles.get(id)
    if (profile) this.profiles.set(id, { ...profile, elo, games })
  }
}

function dbWithPilots(): MemoryDb {
  const db = new MemoryDb()
  db.profiles.set('white', { id: 'white', username: 'ada', elo: 1200, games: 0 })
  db.profiles.set('black', { id: 'black', username: 'bev', elo: 1200, games: 0 })
  return db
}

describe('rated match server', () => {
  it('opens a seat, deals a fleet, and rates a resignation', async () => {
    const db = dbWithPilots()
    const created = await handleAction(db, 'white', { action: 'create', civ: 'blob' }, 1_000, () => 0)
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const joined = await handleAction(
      db,
      'black',
      { action: 'join', code: created.match.code, civ: 'solarite' as Civilization },
      2_000,
      () => 0,
    )
    expect(joined.ok).toBe(true)
    if (!joined.ok) return
    expect(joined.match.status).toBe('playing')
    expect(joined.match.state?.civs).toEqual({ white: 'blob', black: 'solarite' })
    expect(joined.match.state?.board[14].filter((sq) => sq.piece?.type === 'pawn')).toHaveLength(16)

    const opening = getLegalMoves(joined.match.state!).find((move) => move.from.row === 14)
    expect(opening).toBeTruthy()
    const played = await handleAction(
      db,
      'white',
      {
        action: 'move',
        matchId: joined.match.id,
        from: opening!.from,
        to: opening!.to,
        promotion: opening!.promotion,
      },
      2_500,
    )
    expect(played.ok).toBe(true)
    if (!played.ok) return
    expect(played.match.state?.turn).toBe('black')

    const resigned = await handleAction(
      db,
      'white',
      { action: 'resign', matchId: joined.match.id },
      3_000,
    )
    expect(resigned.ok).toBe(true)
    if (!resigned.ok) return
    expect(resigned.match.winner).toBe('black')
    expect(db.profiles.get('black')?.elo).toBe(1216)
    expect(db.profiles.get('white')?.elo).toBe(1184)
    expect(db.profiles.get('white')?.games).toBe(1)
  })

  it('rejects a move on the wrong turn and a premature claim', async () => {
    const db = dbWithPilots()
    const created = await handleAction(db, 'white', { action: 'create', civ: 'silicate' }, 1_000, () => 0.2)
    if (!created.ok) throw new Error('create failed')
    const joined = await handleAction(
      db,
      'black',
      { action: 'join', code: created.match.code, civ: 'crustacean' },
      2_000,
      () => 0.2,
    )
    if (!joined.ok) throw new Error('join failed')

    const early = await handleAction(
      db,
      'black',
      { action: 'move', matchId: joined.match.id, from: { row: 1, col: 0 }, to: { row: 2, col: 0 } },
      2_500,
    )
    expect(early.ok).toBe(false)

    const claim = await handleAction(db, 'black', { action: 'claim', matchId: joined.match.id }, 2_500)
    expect(claim.ok).toBe(false)

    const later = await handleAction(
      db,
      'black',
      { action: 'claim', matchId: joined.match.id },
      2_000 + 61_000,
    )
    expect(later.ok).toBe(true)
    if (later.ok) expect(later.match.winner).toBe('black')
  })
})
