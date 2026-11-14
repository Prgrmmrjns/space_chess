import { useMemo } from 'react'
import { BOARD_SIZE, FLEET_MOVES, FLEET_NAMES } from '../engine/constants'
import { forecastSpace } from '../engine/board'
import type { Civilization, Color, GameState, Move, Pos } from '../engine/types'
import { posKey, samePos } from '../engine/types'
import { HazardMark } from './HazardMark'
import { PieceGlyph } from './PieceGlyph'

interface Props {
  state: GameState
  selected: Pos | null
  legalTargets: Move[]
  onSelect: (pos: Pos) => void
  orientation: Color
  disabled?: boolean
  impacts?: Pos[]
}

function fileLabel(col: number): string {
  return String.fromCharCode(97 + col)
}

export function Board({
  state,
  selected,
  legalTargets,
  onSelect,
  orientation,
  disabled,
  impacts = [],
}: Props) {
  const rows =
    orientation === 'white'
      ? [...Array(BOARD_SIZE).keys()]
      : [...Array(BOARD_SIZE).keys()].reverse()
  const cols =
    orientation === 'white'
      ? [...Array(BOARD_SIZE).keys()]
      : [...Array(BOARD_SIZE).keys()].reverse()

  const last = state.lastMove
  const finalLast = last ? (last.finalTo ?? last.to) : null
  const forecast = useMemo(() => forecastSpace(state), [state])
  const orbitKeys = new Set(forecast.orbits.map((pos) => posKey(pos)))
  const ghosts = new Map<string, 'asteroid' | 'planet' | 'star'>()
  for (const pos of forecast.nextAsteroids) ghosts.set(posKey(pos), 'asteroid')
  for (const pos of forecast.nextPlanets) ghosts.set(posKey(pos), 'planet')
  for (const pos of forecast.nextStars) ghosts.set(posKey(pos), 'star')

  return (
    <div className="board-shell" role="grid" aria-label="Space Chess board">
      <div className="board">
        {rows.map((row) =>
          cols.map((col) => {
            const sq = state.board[row][col]
            const pos = { row, col }
            const light = (row + col) % 2 === 0
            const isSelected = selected && samePos(selected, pos)
            const moveHit = legalTargets.find((m) => samePos(m.to, pos))
            const isLast =
              (last && samePos(last.from, pos)) ||
              (finalLast && samePos(finalLast, pos))
            const civ: Civilization = sq.piece
              ? state.civs[sq.piece.color]
              : state.civs.white
            const exploding = impacts.some((impact) => samePos(impact, pos))
            const ghost = ghosts.get(posKey(pos))
            const onOrbit = orbitKeys.has(posKey(pos)) && !ghost

            return (
              <button
                key={`${row}-${col}`}
                type="button"
                className={[
                  'square',
                  light ? 'light' : 'dark',
                  isSelected ? 'selected' : '',
                  moveHit ? (moveHit.capture ? 'target-capture' : 'target-move') : '',
                  isLast ? 'last-move' : '',
                  sq.hazard ? `has-${sq.hazard}` : '',
                  onOrbit ? 'orbit' : '',
                  exploding ? 'exploding' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => !disabled && onSelect(pos)}
                disabled={disabled}
                aria-label={`${fileLabel(col)}${BOARD_SIZE - row}${
                  sq.piece ? `, ${sq.piece.color} ${FLEET_NAMES[sq.piece.type]}. ${FLEET_MOVES[sq.piece.type]}` : ''
                }${ghost ? `, ${ghost} arrives next turn` : ''}${onOrbit ? ', on a planetary orbit' : ''}`}
              >
                {exploding && <span className="blast" />}
                <HazardMark square={sq} />
                {ghost && <span className={`ghost ${ghost}`} title={`${ghost} next turn`} />}
                {sq.piece && (
                  <span className="piece-wrap">
                    <PieceGlyph
                      type={sq.piece.type}
                      color={sq.piece.color}
                      civ={civ}
                    />
                  </span>
                )}
                {col === cols[0] && (
                  <span className="coord rank">{BOARD_SIZE - row}</span>
                )}
                {row === rows[rows.length - 1] && (
                  <span className="coord file">{fileLabel(col)}</span>
                )}
              </button>
            )
          }),
        )}
      </div>
    </div>
  )
}
