import { CIV_ABILITIES, CIV_LABELS } from '../engine/constants'
import type {
  Civilization,
  Color,
  Difficulty,
  GameConfig,
  GameMode,
} from '../engine/types'

interface Props {
  value: GameConfig
  onChange: (next: GameConfig) => void
  onStart: () => void
}

const MODES: { id: GameMode; label: string; blurb: string }[] = [
  { id: 'pvai', label: 'Vs AI', blurb: 'Challenge the orbital computer' },
  { id: 'pvp', label: 'Hot-seat', blurb: 'Pass-and-play on one device' },
  { id: 'aivai', label: 'AI vs AI', blurb: 'Watch two fleets spar' },
]

const CIVS: Civilization[] = ['reptiloid', 'crustacean', 'blob']

export function SetupScreen({ value, onChange, onStart }: Props) {
  function set<K extends keyof GameConfig>(key: K, v: GameConfig[K]) {
    onChange({ ...value, [key]: v })
  }

  return (
    <section className="setup">
      <div className="setup-hero">
        <p className="brand">Space Chess</p>
        <h1>Claim the void between the stars.</h1>
        <p className="lede">
          A 16×16 chess war across asteroids, planets, wormholes, and black holes —
          each civilisation brings one lethal specialty.
        </p>
      </div>

      <div className="setup-panels">
        <fieldset>
          <legend>Mode</legend>
          <div className="chip-row">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={value.mode === m.id ? 'chip active' : 'chip'}
                onClick={() => set('mode', m.id)}
              >
                <strong>{m.label}</strong>
                <span>{m.blurb}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {value.mode !== 'aivai' && (
          <fieldset>
            <legend>Your colour</legend>
            <div className="chip-row compact">
              {(['white', 'black'] as Color[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  className={value.playerColor === c ? 'chip active' : 'chip'}
                  onClick={() => set('playerColor', c)}
                >
                  {c === 'white' ? 'White' : 'Black'}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {value.mode === 'pvai' && (
          <fieldset>
            <legend>AI difficulty</legend>
            <div className="chip-row compact">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={value.difficulty === d ? 'chip active' : 'chip'}
                  onClick={() => set('difficulty', d)}
                >
                  {d[0].toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend>
            {value.mode === 'pvp' ? 'White civilisation' : 'Your civilisation'}
          </legend>
          <CivPicker
            selected={value.civs.white}
            onSelect={(civ) =>
              set('civs', {
                ...value.civs,
                white: civ,
                black:
                  value.mode === 'pvp' && value.civs.black === civ
                    ? (CIVS.find((c) => c !== civ) as Civilization)
                    : value.civs.black,
              })
            }
          />
        </fieldset>

        <fieldset>
          <legend>
            {value.mode === 'pvp'
              ? 'Black civilisation'
              : value.mode === 'aivai'
                ? 'Black AI civilisation'
                : 'Opponent civilisation'}
          </legend>
          <CivPicker
            selected={value.civs.black}
            onSelect={(civ) => set('civs', { ...value.civs, black: civ })}
          />
        </fieldset>
      </div>

      <button type="button" className="cta" onClick={onStart}>
        Launch match
      </button>
    </section>
  )
}

function CivPicker({
  selected,
  onSelect,
}: {
  selected: Civilization
  onSelect: (c: Civilization) => void
}) {
  return (
    <div className="civ-grid">
      {CIVS.map((civ) => (
        <button
          key={civ}
          type="button"
          className={selected === civ ? `civ-card active civ-${civ}` : `civ-card civ-${civ}`}
          onClick={() => onSelect(civ)}
        >
          <strong>{CIV_LABELS[civ]}</strong>
          <span>{CIV_ABILITIES[civ]}</span>
        </button>
      ))}
    </div>
  )
}
