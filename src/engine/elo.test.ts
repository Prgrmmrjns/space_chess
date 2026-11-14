import { describe, expect, it } from 'vitest'
import { expectedScore, nextElo } from './elo'

describe('elo', () => {
  it('treats equal ratings as an even match', () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5)
  })

  it('awards 16 points for a win between equals at K=32', () => {
    expect(nextElo(1200, 1200, 1)).toBe(1216)
    expect(nextElo(1200, 1200, 0)).toBe(1184)
    expect(nextElo(1200, 1200, 0.5)).toBe(1200)
  })
})
