import { useEffect, useMemo, useState } from 'react'
import { CIV_LABELS, FLEET_NAMES } from './engine/constants'
import { cloneState } from './engine/board'
import { getLegalMoves, playMove, playMoveObject, startGame, statusLabel } from './engine/game'
import type { Civilization, GameConfig, GameState, Move, PieceType, Pos } from './engine/types'
import { opponent } from './engine/types'
import { tauntLine, type TauntEvent } from './ai/taunts'
import { Board } from './components/Board'
import { CivPortrait } from './components/CivPortrait'
import { RulesPanel } from './components/RulesPanel'
import { OnlineApp } from './components/OnlineApp'
import { SetupScreen } from './components/SetupScreen'
import { Tutorial, tutorialSeen } from './components/Tutorial'
import { useAiWorker } from './hooks/useAiWorker'
import { useAudio } from './hooks/useAudio'

const DEFAULT_CONFIG: GameConfig = {
  mode: 'pvai',
  difficulty: 'medium',
  playerColor: 'white',
  civs: { white: 'reptiloid', black: 'crustacean' },
}

type Screen = 'setup' | 'play' | 'online' | 'ranks'

export default function App() {
  const [screen, setScreen] = useState<Screen>('setup')
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG)
  const [state, setState] = useState<GameState | null>(null)
  const [history, setHistory] = useState<GameState[]>([])
  const [selected, setSelected] = useState<Pos | null>(null)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [briefing, setBriefing] = useState(false)
  const [taunt, setTaunt] = useState<string | null>(null)
  const [impacts, setImpacts] = useState<Pos[]>([])
  const [promo, setPromo] = useState<{ from: Pos; to: Pos; moves: Move[] } | null>(null)
  const { requestMove } = useAiWorker()
  const { muted, toggleMute, playEffect } = useAudio()

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
    setImpacts([])
    setScreen('play')
    setBriefing(!tutorialSeen())
    if (config.mode === 'pvai') {
      const ai = config.playerColor === 'white' ? 'black' : 'white'
      setTaunt(tauntLine(fresh.civs[ai], config.difficulty, 'start'))
    } else {
      setTaunt(null)
    }
  }

  function noteMove(next: GameState) {
    const spots = impactSquares(next.lastMove)
    setImpacts(spots)
    if (next.lastMove?.capture || next.lastMove?.hazardDeaths?.length) playEffect('capture')
    else playEffect('move')
    if (config.mode === 'pvai' || config.mode === 'aivai') {
      const mover = opponent(next.turn)
      const aiColor = config.playerColor === 'white' ? 'black' : 'white'
      if (config.mode === 'aivai' || mover === aiColor) {
        setTaunt(tauntLine(next.civs[mover], config.difficulty, tauntEvent(next, mover)))
      }
    }
  }

  function pushMove(next: GameState) {
    if (!state) return
    setHistory((h) => [...h, cloneState(state)])
    setState(next)
    setSelected(null)
    setPromo(null)
    noteMove(next)
  }

  function handleSelect(pos: Pos) {
    if (!state || thinking) return
    if (state.status === 'checkmate' || state.status === 'stalemate' || state.status === 'draw') {
      return
    }
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

    if (piece && piece.color === state.turn) setSelected(pos)
    else setSelected(null)
  }

  function undo() {
    if (history.length === 0 || thinking) return
    let steps = 1
    if (config.mode === 'pvai' && history.length >= 2) steps = 2
    const restored = history[history.length - steps]
    setHistory(history.slice(0, -steps))
    setState(cloneState(restored))
    setSelected(null)
    setPromo(null)
    setImpacts([])
    setTaunt(null)
  }

  useEffect(() => {
    if (!state || screen !== 'play') return
    if (state.status !== 'playing' && state.status !== 'check') return
    if (isHumanTurn(state, config)) return

    let cancelled = false
    setThinking(true)
    const delay = config.mode === 'aivai' ? 700 : 180
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
        noteMove(next)
        setThinking(false)
      }
    }, delay)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
    // noteMove closes over config and playEffect; both are stable enough for a turn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, screen, config, requestMove])

  const aiCiv: Civilization | null =
    config.mode === 'pvai'
      ? config.civs[config.playerColor === 'white' ? 'black' : 'white']
      : null

  return (
    <div className="app">
      <div className="stars" aria-hidden />
      {screen === 'setup' ? (
        <SetupScreen
          value={config}
          onChange={setConfig}
          onStart={begin}
          onOnline={() => setScreen('online')}
          onLeaderboard={() => setScreen('ranks')}
        />
      ) : screen === 'online' || screen === 'ranks' ? (
        <OnlineApp
          key={screen}
          initial={screen === 'ranks' ? 'ranks' : 'lobby'}
          onExit={() => setScreen('setup')}
          muted={muted}
          onToggleMute={toggleMute}
          playEffect={playEffect}
        />
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
                <button type="button" onClick={toggleMute}>
                  {muted ? 'Music off' : 'Music on'}
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
                  talking={!!taunt && aiCiv === state.civs.black}
                  line={aiCiv === state.civs.black ? taunt : null}
                />
              </aside>

              <Board
                state={state}
                selected={selected}
                legalTargets={legalForSelected}
                onSelect={handleSelect}
                orientation={orientation}
                disabled={thinking || !isHumanTurn(state, config)}
                impacts={impacts}
              />

              <aside className="side-panel right">
                <CivBadge
                  label="White"
                  civ={state.civs.white}
                  active={state.turn === 'white'}
                  talking={!!taunt && aiCiv === state.civs.white}
                  line={aiCiv === state.civs.white ? taunt : null}
                />
                <div className="tips">
                  {thinking && <p className="thinking">Calculating trajectory…</p>}
                  {state.lastMove?.spawnedPawns?.length ? (
                    <p>Planet claimed — fighters inbound.</p>
                  ) : null}
                  {state.lastMove?.asteroidPush ? <p>Asteroid shoved down the file.</p> : null}
                  {state.lastMove?.solarPush?.length ? <p>A star flared and shoved a hull.</p> : null}
                  <p className="hint">
                    Select a ship, then a highlight. Both flagships must stay safe.
                  </p>
                </div>
              </aside>
            </div>
          </main>
        )
      )}

      <RulesPanel open={rulesOpen} onClose={() => setRulesOpen(false)} />
      {briefing && state && (
        <Tutorial
          civ={config.playerColor === 'black' ? state.civs.black : state.civs.white}
          onClose={() => setBriefing(false)}
        />
      )}

      {promo && (
        <div className="modal-backdrop">
          <div className="modal promo">
            <h2>Promote fighter</h2>
            <div className="promo-row">
              {(['queen', 'rook', 'bishop', 'knight'] as PieceType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    if (!state) return
                    const result = playMove(state, promo.from, promo.to, type)
                    if (result.ok) pushMove(result.state)
                  }}
                >
                  {FLEET_NAMES[type]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function impactSquares(move: Move | null): Pos[] {
  if (!move) return []
  const spots: Pos[] = []
  if (move.capture) spots.push(move.finalTo ?? move.to)
  if (move.asteroidPush?.destroyedEnemy) spots.push(move.asteroidPush.destroyedEnemy)
  if (move.hazardDeaths) spots.push(...move.hazardDeaths)
  return spots
}

function tauntEvent(state: GameState, mover: GameState['turn']): TauntEvent {
  if (state.status === 'checkmate' || state.status === 'stalemate' || state.status === 'draw') {
    return state.winner === mover ? 'win' : 'lose'
  }
  if (state.status === 'check') return 'check'
  const taken = state.lastMove?.captured
  if (taken === 'queen' || taken === 'rook') return 'blunder'
  if (state.lastMove?.capture || state.lastMove?.hazardDeaths?.length) return 'capture'
  return 'start'
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
  talking,
  line,
}: {
  label: string
  civ: keyof typeof CIV_LABELS
  active: boolean
  talking?: boolean
  line?: string | null
}) {
  return (
    <div className={`civ-badge civ-${civ} ${active ? 'active' : ''}`}>
      <CivPortrait civ={civ} talking={talking} />
      <span className="eyebrow">{label}</span>
      <strong>{CIV_LABELS[civ]}</strong>
      {line && <p className="taunt">{line}</p>}
    </div>
  )
}
