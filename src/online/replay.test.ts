import { describe, expect, it } from 'vitest'
import { getLegalMoves } from '../engine/game'
import { awardsMatch, openingSeed, replayMatch, type PlyRecord, type ReplaySeat } from './replay'

function seat(): ReplaySeat {
  return {
    id: 'match-1',
    white_id: 'white',
    black_id: 'black',
    white_civ: 'blob',
    black_civ: 'solarite',
    created_at: new Date(1_000).toISOString(),
    server_at: new Date(2_000).toISOString(),
    updated_at: new Date(2_000).toISOString(),
  }
}

describe('ply replay', () => {
  it('confirms a resignation and rejects a forged mate and a backdated claim', () => {
    const match = seat()
    const opening = replayMatch(match, [])
    expect(opening.ok).toBe(true)
    const move = getLegalMoves(opening.state!).find((item) => item.from.row === 14)
    expect(move).toBeTruthy()
    const resigned = replayMatch(match, [
      {
        by: 'white',
        kind: 'resign',
        at: 3_000,
      },
    ])
    expect(resigned.ok && resigned.over && resigned.winner).toBe('black')

    const forged: PlyRecord = {
      by: 'white',
      kind: 'move',
      from: { row: 0, col: 0 },
      to: { row: 7, col: 7 },
      promotion: 'queen',
      at: 4_000,
    }
    expect(replayMatch(match, [forged]).ok).toBe(false)

    const early: PlyRecord = { by: 'black', kind: 'claim', at: 3_000 }
    expect(replayMatch(match, [early]).ok).toBe(false)
    const earned: PlyRecord = { by: 'black', kind: 'claim', at: 2_000 + 61_000 }
    const claimed = replayMatch(match, [earned])
    expect(claimed.ok && claimed.winner).toBe('black')

    const legal: PlyRecord = {
      by: 'white',
      kind: 'move',
      from: move!.from,
      to: move!.to,
      promotion: move!.promotion ?? 'queen',
      at: 3_000,
    }
    const played = replayMatch(match, [legal])
    expect(played.ok).toBe(true)
    expect(played.state?.turn).toBe('black')
    expect(openingSeed(match.id)).toBe(openingSeed(match.id))
  })

  it('accepts only the award computed from the ratings locked at the start', () => {
    expect(
      awardsMatch({ winner: 'white', white_before: 1200, black_before: 1200, white_elo: 1216, black_elo: 1184 }),
    ).toBe(true)
    expect(
      awardsMatch({ winner: 'white', white_before: 1200, black_before: 1200, white_elo: 1232, black_elo: 1168 }),
    ).toBe(false)
  })
})