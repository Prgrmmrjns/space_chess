import { CIV_ABILITIES, CIV_LABELS, FLEET_NAMES } from '../engine/constants'

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
            <h3>The fleet</h3>
            <p>
              Space Chess is a 16×16 fleet battle. Every file starts occupied: a full rank of{' '}
              <strong>{FLEET_NAMES.pawn.toLowerCase()}s</strong>, and a back rank that is the
              standard line twice. Movement matches chess — fighters step and capture diagonally,
              cruisers leap, frigates ride diagonals, battleships ride ranks and files, dreadnoughts
              do both.
            </p>
            <p>
              Each side has <strong>two flagships</strong>. You are in check if either one is
              attacked, and a move that leaves either one in check is illegal. Checkmate is no
              legal reply while a flagship is under attack. A flagship may castle only inside its
              own half of the back rank. Fighters promote on the far rank. En passant still works.
            </p>
          </section>
          <section>
            <h3>Hazards move</h3>
            <ul>
              <li>
                <strong>Asteroids</strong> drift one file after every full turn and bounce off
                edges, ships, and other hazards.
              </li>
              <li>
                <strong>Planets</strong> walk a small clockwise loop and keep their owner. Most
                ships must stop on them. Landing claims the planet.
              </li>
              <li>
                <strong>Stars</strong> drift one diagonal step and burn any ship they land on.
                Blobs and Solarites are not burned.
              </li>
              <li>
                <strong>Black holes</strong> stay put. The hole and every adjacent square are
                forbidden unless you are a Blob.
              </li>
              <li>
                <strong>Wormholes</strong> stay paired. Enter one and you exit the other, capturing
                an enemy on the exit.
              </li>
            </ul>
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
            <h3>Wins, draws, ratings</h3>
            <p>
              Checkmate wins. So does losing a flagship to a star. Stalemate, threefold repetition,
              the 50-move rule, and bare kings are draws. Rated online games move Elo by the
              usual 32-point scale, starting at 1200. Guest games against the AI do not.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
