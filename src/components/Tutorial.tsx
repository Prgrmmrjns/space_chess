import { useState } from 'react'
import { CIV_ABILITIES, CIV_LABELS } from '../engine/constants'
import type { Civilization } from '../engine/types'

const SEEN_KEY = 'space-chess-briefed'

export function tutorialSeen(): boolean {
  return localStorage.getItem(SEEN_KEY) === '1'
}

export function markTutorialSeen(): void {
  localStorage.setItem(SEEN_KEY, '1')
}

interface Props {
  civ: Civilization
  onClose: () => void
}

const STEPS = [
  {
    title: 'Pick a ship',
    body: 'Tap one of your ships. Fighters step and capture like pawns. Cruisers leap. Frigates take diagonals. Battleships take ranks and files. Dreadnoughts do both. Each side has two flagships.',
  },
  {
    title: 'Read the highlights',
    body: 'Copper marks the ship you selected. Teal dots are legal arrivals. A ring means a capture. The last move stays lit in gold, including a wormhole or black-hole exit.',
  },
  {
    title: 'Five hazards',
    body: 'Asteroids block lanes. Planets stop most ships and can be claimed. Stars drift on diagonals and burn whatever they land on. Black holes and the squares beside them swallow anyone who is not a Blob. Wormholes come in pairs and throw you to the twin.',
  },
  {
    title: 'Your civilisation',
    body: '',
  },
]

export function Tutorial({ civ, onClose }: Props) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const body = step === 3 ? `${CIV_LABELS[civ]}. ${CIV_ABILITIES[civ]}` : current.body
  const last = step === STEPS.length - 1

  function finish() {
    markTutorialSeen()
    onClose()
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Briefing">
      <div className="modal tutorial">
        <header>
          <h2>
            Briefing {step + 1} / {STEPS.length}
          </h2>
          <button type="button" className="icon-btn" onClick={finish} aria-label="Skip briefing">
            ×
          </button>
        </header>
        <div className="modal-body">
          <h3>{current.title}</h3>
          <p>{body}</p>
        </div>
        <div className="tutorial-actions">
          {step > 0 && (
            <button type="button" onClick={() => setStep((value) => value - 1)}>
              Back
            </button>
          )}
          <button type="button" className="cta slim" onClick={() => (last ? finish() : setStep((value) => value + 1))}>
            {last ? 'Launch' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
