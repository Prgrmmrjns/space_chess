import { FLEET_MOVES, FLEET_NAMES } from '../engine/constants'
import type { PieceType } from '../engine/types'

const ORDER: PieceType[] = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king']

export function ShipKey({ selected }: { selected: PieceType | null }) {
  return (
    <div className="guide">
      <p className="hint">
        Dashed ring: the circle that planet will travel around its sun. Corner mark: where that
        asteroid, planet, or sun will be after the next full turn.
      </p>
      <ul className="ship-key">
        {ORDER.map((type) => (
          <li key={type} className={selected === type ? 'on' : ''}>
            <strong>{FLEET_NAMES[type]}.</strong> {FLEET_MOVES[type]}
          </li>
        ))}
      </ul>
    </div>
  )
}
