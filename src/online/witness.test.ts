import { describe, expect, it } from 'vitest'
import { handleAction, type MatchDb, type MatchRow, type ProfileRow } from './server'
import { opponentFinishIsAcceptable } from './witness'

class MemoryDb implements MatchDb {
  matches = new Map<string, MatchRow>()
  profiles = new Map<string, ProfileRow>()
  async insertMatch(row: Omit<MatchRow, 'id'>) {
    const stored = { ...row, id: 'm1' }
    this.matches.set(stored.id, stored)
    return stored
  }
  async getByCode(code: string) {
    return [...this.matches.values()].find((match) => match.code === code) ?? null
  }
  async getById(id: string) {
    return this.matches.get(id) ?? null
  }
  async save(_id: string, expectedUpdatedAt: string, next: MatchRow) {
    const current = this.matches.get(next.id)
    if (!current || current.updated_at !== expectedUpdatedAt) return null
    this.matches.set(next.id, next)
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

async function playingMatch(): Promise<{ prev: MatchRow; resigned: MatchRow }> {
  const db = new MemoryDb()
  db.profiles.set('white', { id: 'white', username: 'ada', elo: 1200, games: 0 })
  db.profiles.set('black', { id: 'black', username: 'bev', elo: 1200, games: 0 })
  const created = await handleAction(db, 'white', { action: 'create', civ: 'blob' }, 1_000, () => 0)
  if (!created.ok) throw new Error('create')
  const joined = await handleAction(
    db,
    'black',
    { action: 'join', code: created.match.code, civ: 'solarite' },
    2_000,
  )
  if (!joined.ok) throw new Error('join')
  const resigned = await handleAction(db, 'white', { action: 'resign', matchId: joined.match.id }, 3_000)
  if (!resigned.ok) throw new Error('resign')
  return { prev: joined.match, resigned: resigned.match }
}

describe('witnessed finishes', () => {
  it('accepts an opponent resignation and a mating move, and rejects a forged win', async () => {
    const { prev, resigned } = await playingMatch()
    expect(opponentFinishIsAcceptable(prev, resigned, 'black', 3_000)).toBe(true)
    expect(
      opponentFinishIsAcceptable(prev, { ...resigned, winner: 'white' }, 'black', 3_000),
    ).toBe(false)
    expect(
      opponentFinishIsAcceptable(prev, { ...prev, status: 'done', winner: 'black' }, 'white', 3_000),
    ).toBe(false)
    expect(
      opponentFinishIsAcceptable(
        prev,
        { ...prev, status: 'done', winner: 'black' },
        'white',
        2_000 + 61_000,
      ),
    ).toBe(true)
  })
})
