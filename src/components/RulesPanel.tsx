import { CIV_ABILITIES, CIV_LABELS } from '../engine/constants'

interface Props {
  open: boolean
  onClose: () => void
}

export function RulesPanel({ open, onClose }: Props) {
  if (!open) return null
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="How to play">
      <div className="modal">
        <header>
          <h2>How to play</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="modal-body">
          <section>
            <h3>The board</h3>
            <p>
              Space Chess is chess on a <strong>16×16</strong> field. Armies start on the
              middle eight files. Pawns promote on the far rank. Castling, checks, and
              mates work as in chess once space hazards are accounted for.
            </p>
          </section>
          <section>
            <h3>Civilisations</h3>
            <ul>
              {(Object.keys(CIV_LABELS) as (keyof typeof CIV_LABELS)[]).map((civ) => (
                <li key={civ}>
                  <strong>{CIV_LABELS[civ]}:</strong> {CIV_ABILITIES[civ]}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3>Hazards</h3>
            <ul>
              <li>
                <strong>Asteroids</strong> block movement. Crustaceans may land on one and
                shove it up to four squares toward the enemy; collisions can crush a foe
                and destroy the rock.
              </li>
              <li>
                <strong>Planets</strong> stop sliding pieces. Landing claims the planet and
                spawns pawns on empty adjacent squares (1 normally, up to 3 for
                Reptiloids). Reclaiming your own planet does not spawn again.
              </li>
              <li>
                <strong>Black holes</strong> create a 3×3 gravity well. Non-Blob pieces
                cannot enter it. Blobs may occupy the hole itself.
              </li>
              <li>
                <strong>Wormholes</strong> come in colour-matched pairs. Entering one
                teleports you to its twin (capturing an enemy on the exit if present).
              </li>
            </ul>
          </section>
          <section>
            <h3>Wins & draws</h3>
            <p>
              Checkmate wins. Stalemate, threefold repetition, the 50-move rule
              (100 half-moves), and bare insufficient material are draws.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
