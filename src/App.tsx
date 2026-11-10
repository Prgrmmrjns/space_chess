import { useEffect, useMemo, useState } from 'react'
import { CIV_LABELS } from './engine/constants'
import { cloneState } from './engine/board'
import { getLegalMoves, playMove, playMoveObject, startGame, statusLabel } from './engine/game'
import type { GameConfig, GameState, Move, PieceType, Pos } from './engine/types'
import { Board } from './components/Board'
import { RulesPanel } from './components/RulesPanel'
import { SetupScreen } from './components/SetupScreen'
import { useAiWorker } from './hooks/useAiWorker'

const DEFAULT_CONFIG: GameConfig = {
  mode: 'pvai',
  difficulty: 'medium',
  playerColor: 'white',
  civs: { white: 'reptiloid', black: 'crustacean' },
}

type Screen = 'setup' | 'play'

export default function App() {
  const [screen, setScreen] = useState<Screen>('setup')
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG)
  const [state, setState] = useState<GameState | null>(null)
  const [history, setHistory] = useState<GameState[]>([])
  const [selected, setSelected] = useState<Pos | null>(null)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [promo, setPromo] = useState<{ from: Pos; to: Pos; moves: Move[] } | null>(null)
  const { requestMove } = useAiWorker()

  const legalForSelected = useMemo(() => {
    if (!state || !selected) return []
    return getLegalMoves(state, selected)
  }, [state, selected])

  const orientation = config.mode === 'pvai' ? config.playerColor : 'white'

  function begin() {
    const fresh = startGame({ ...config, seed: Date.now() })
    setState(fresh)
    setHistory([])
    setSelected(null)
    setPromo(null)
    setScreen('play')
  }

  function pushMove(next: GameState) {
    if (!state) return
    setHistory((h) => [...h, cloneState(state)])
    setState(next)
    setSelected(null)
    setPromo(null)
  }

  function handleSelect(pos: Pos) {
    if (!state || thinking) return
    if (state.status === 'checkmate' || state.status === 'stalemate' || state.status === 'draw') {
      return
    }

    // Human may only move when it's their turn
    if (!isHumanTurn(state, config)) return

    const piece = state.board[pos.row][pos.col].piece
    if (selected) {
      const candidates = legalForSelected.filter((m) => m.to.row === pos.row && m.to.col === pos.col)
      if (candidates.length > 0) {
        const promotions = candidates.filter((m) => m.promotion)
        if (promotions.length > 1) {
          setPromo({ from: selected, to: pos, moves: promotions })
          return
        }
        const result = playMove(state, selected, pos, candidates[0].promotion ?? 'queen')
        if (result.ok) pushMove(result.state)
        return
      }
    }

    if (piece && piece.color === state.turn) {
      setSelected(pos)
    } else {
      setSelected(null)
    }
  }

  function undo() {
    if (history.length === 0 || thinking) return
    // In PvAI, undo the AI reply as well when present
    let steps = 1
    if (config.mode === 'pvai' && history.length >= 2) steps = 2
    const nextHistory = history.slice(0, -steps)
    const restored = history[history.length - steps]
    setHistory(nextHistory)
    setState(cloneState(restored))
    setSelected(null)
    setPromo(null)
  }

  // AI turns
  useEffect(() => {
    if (!state || screen !== 'play') return
    if (state.status !== 'playing' && state.status !== 'check') return
    if (isHumanTurn(state, config)) return

    let cancelled = false
    setThinking(true)
    const delay = config.mode === 'aivai' ? 350 : 120
    const timer = window.setTimeout(async () => {
      const move = await requestMove(state, config.difficulty)
      if (cancelled || !move) {
        setThinking(false)
        return
      }
      const next = playMoveObject(state, move)
      if (!cancelled) {
        setHistory((h) => [...h, cloneState(state)])
        setState(next)
        setThinking(false)
      }
    }, delay)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [state, screen, config, requestMove])

  return (
    <div className="app">
      <div className="stars" aria-hidden />
      {screen === 'setup' ? (
        <SetupScreen value={config} onChange={setConfig} onStart={begin} />
      ) : (
        state && (
          <main className="play">
            <header className="play-bar">
              <div>
                <p className="brand compact">Space Chess</p>
                <p className="status">{statusLabel(state)}</p>
              </div>
              <div className="bar-actions">
                <button type="button" onClick={() => setRulesOpen(true)}>
                  Rules
                </button>
                <button type="button" onClick={undo} disabled={history.length === 0 || thinking}>
                  Undo
                </button>
                <button type="button" onClick={begin}>
                  New map
                </button>
                <button type="button" className="ghost" onClick={() => setScreen('setup')}>
                  Setup
                </button>
              </div>
            </header>

            <div className="play-layout">
              <aside className="side-panel left">
                <CivBadge
                  label="Black"
                  civ={state.civs.black}
                  active={state.turn === 'black'}
                />
              </aside>

              <Board
                state={state}
                selected={selected}
                legalTargets={legalForSelected}
                onSelect={handleSelect}
                orientation={orientation}
                disabled={thinking || !isHumanTurn(state, config)}
              />

              <aside className="side-panel right">
                <CivBadge
                  label="White"
                  civ={state.civs.white}
                  active={state.turn === 'white'}
                />
                <div className="tips">
                  {thinking && <p className="thinking">Calculating trajectory…</p>}
                  {state.lastMove?.spawnedPawns?.length ? (
                    <p>Planet claimed — reinforcements inbound.</p>
                  ) : null}
                  {state.lastMove?.asteroidPush ? (
                    <p>Asteroid shoved through the corridor.</p>
                  ) : null}
                </div>
              </aside>
            </div>
          </main>
        )
      )}

      <RulesPanel open={rulesOpen} onClose={() => setRulesOpen(false)} />

      {promo && (
        <div className="modal-backdrop">
          <div className="modal promo">
            <h2>Promote pawn</h2>
            <div className="promo-row">
              {(['queen', 'rook', 'bishop', 'knight'] as PieceType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    if (!state) return
                    const result = playMove(state, promo.from, promo.to, t)
                    if (result.ok) pushMove(result.state)
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function isHumanTurn(state: GameState, config: GameConfig): boolean {
  if (config.mode === 'pvp') return true
  if (config.mode === 'aivai') return false
  return state.turn === config.playerColor
}

function CivBadge({
  label,
  civ,
  active,
}: {
  label: string
  civ: keyof typeof CIV_LABELS
  active: boolean
}) {
  return (
    <div className={`civ-badge civ-${civ} ${active ? 'active' : ''}`}>
      <span className="eyebrow">{label}</span>
      <strong>{CIV_LABELS[civ]}</strong>
    </div>
  )
}
