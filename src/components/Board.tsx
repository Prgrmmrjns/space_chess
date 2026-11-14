import { BOARD_SIZE, FLEET_NAMES } from '../engine/constants'
import type { Civilization, Color, GameState, Move, Pos } from '../engine/types'
import { samePos } from '../engine/types'
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
                  exploding ? 'exploding' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => !disabled && onSelect(pos)}
                disabled={disabled}
                aria-label={`${fileLabel(col)}${BOARD_SIZE - row}${
                  sq.piece ? `, ${sq.piece.color} ${FLEET_NAMES[sq.piece.type]}` : ''
                }`}
              >
                {exploding && <span className="blast" />}
                <HazardMark square={sq} />
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
