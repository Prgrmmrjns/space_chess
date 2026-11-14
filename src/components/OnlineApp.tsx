import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { CIV_ABILITIES, CIV_LABELS, FLEET_NAMES } from '../engine/constants'
import { getLegalMoves, statusLabel } from '../engine/game'
import type { Civilization, Color, Move, PieceType, Pos } from '../engine/types'
import {
  callMatch,
  claimOwnRating,
  loadLobby,
  loadProfile,
  loadRanks,
  signIn as signInAccount,
  signOut,
  signUp,
  watchAuth,
  watchMatch,
} from '../online/client'
import type { MatchRow } from '../online/server'
import { Board } from './Board'
import { ShipKey } from './ShipKey'
import { CivPortrait } from './CivPortrait'
import { RulesPanel } from './RulesPanel'

const CIVS: Civilization[] = ['reptiloid', 'crustacean', 'blob', 'solarite', 'silicate']

interface Profile {
  username: string
  elo: number
  games: number
}

interface Props {
  initial: 'lobby' | 'ranks'
  onExit: () => void
  muted: boolean
  onToggleMute: () => void
  playEffect: (kind: 'move' | 'capture') => void
}

export function OnlineApp({ initial, onExit, muted, onToggleMute, playEffect }: Props) {
  const [view, setView] = useState<'auth' | 'lobby' | 'match' | 'ranks'>(
    initial === 'ranks' ? 'ranks' : 'auth',
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [mode, setMode] = useState<'in' | 'up'>('up')
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [civ, setCiv] = useState<Civilization>('reptiloid')
  const [code, setCode] = useState('')
  const [rows, setRows] = useState<MatchRow[]>([])
  const [ranks, setRanks] = useState<Profile[]>([])
  const [match, setMatch] = useState<MatchRow | null>(null)
  const [selected, setSelected] = useState<Pos | null>(null)
  const [promo, setPromo] = useState<{ from: Pos; to: Pos } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [confirmResign, setConfirmResign] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const heard = useRef<string | null>(null)

  useEffect(() => {
    return watchAuth((id) => {
      setUserId(id)
      if (id) setView((current) => (current === 'auth' ? (initial === 'ranks' ? 'ranks' : 'lobby') : current))
    })
  }, [initial])

  useEffect(() => {
    if (!userId) return
    void loadProfile(userId).then((data) => {
      if (data) setProfile(data)
    })
  }, [userId, match?.status])

  useEffect(() => {
    if (view !== 'match') return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [view])

  const matchId = match?.id
  useEffect(() => {
    if (!matchId) return
    return watchMatch(matchId, (next) => {
      setMatch(next)
      setSelected(null)
      setPromo(null)
      const move = next.state?.lastMove
      const repeat = heard.current === next.updated_at
      const opened = heard.current === null
      heard.current = next.updated_at
      if (next.status === 'done') void claimOwnRating(next.id).catch(() => undefined)
      if (!move || repeat || opened) return
      playEffect(move.capture || move.hazardDeaths?.length ? 'capture' : 'move')
    })
  }, [matchId, playEffect])

  async function refreshLobby() {
    if (!userId) return
    try {
      const loaded = await loadLobby(userId)
      setRows(loaded)
      for (const row of loaded) {
        if (row.status === 'done') void claimOwnRating(row.id).catch(() => undefined)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The lobby could not be loaded')
    }
  }

  async function refreshRanks() {
    try {
      setRanks(await loadRanks())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The leaderboard could not be loaded')
    }
  }

  useEffect(() => {
    if (view === 'lobby' && userId) void refreshLobby()
    if (view === 'ranks') void refreshRanks()
  }, [view, userId])

  function accept(next: MatchRow) {
    const move = next.state?.lastMove
    if (move && heard.current !== null && heard.current !== next.updated_at) {
      playEffect(move.capture || move.hazardDeaths?.length ? 'capture' : 'move')
    }
    heard.current = next.updated_at
    if (next.status === 'done') void claimOwnRating(next.id).catch(() => undefined)
    setMatch(next)
    setSelected(null)
    setPromo(null)
  }

  async function signIn(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'up') {
        if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) {
          setError('Username: 3–16 letters, numbers, or underscores.')
          return
        }
        const id = await signUp(email, password, username)
        setUserId(id)
        setView('lobby')
        return
      }
      const id = await signInAccount(email, password)
      setUserId(id)
      setView(initial === 'ranks' ? 'ranks' : 'lobby')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  async function createMatch() {
    setBusy(true)
    setError(null)
    const result = await callMatch({ action: 'create', civ })
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    accept(result.match)
    setView('match')
  }

  async function joinMatch(joinCode: string) {
    setBusy(true)
    setError(null)
    const result = await callMatch({ action: 'join', code: joinCode, civ })
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    accept(result.match)
    setView('match')
  }

  async function submit(from: Pos, to: Pos, promotion: PieceType = 'queen') {
    if (!match) return
    setBusy(true)
    setError(null)
    const result = await callMatch({
      action: 'move',
      matchId: match.id,
      from,
      to,
      promotion,
    })
    setBusy(false)
    setPromo(null)
    setSelected(null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    accept(result.match)
  }

  async function resign() {
    if (!match) return
    setBusy(true)
    const result = await callMatch({ action: 'resign', matchId: match.id })
    setBusy(false)
    setConfirmResign(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    accept(result.match)
  }

  async function claim() {
    if (!match) return
    setBusy(true)
    const result = await callMatch({ action: 'claim', matchId: match.id })
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    accept(result.match)
  }

  const myColor: Color | null =
    match && userId ? (match.white_id === userId ? 'white' : match.black_id === userId ? 'black' : null) : null

  const state = match?.state ?? null
  const impacts = useMemo(() => {
    const move = state?.lastMove
    if (!move || !match) return []
    if (Date.now() - Date.parse(match.updated_at) > 1600) return []
    return impactSquares(move)
  }, [state, match])
  const legalForSelected = useMemo(() => {
    if (!state || !selected) return []
    return getLegalMoves(state, selected)
  }, [state, selected])

  function onSelect(pos: Pos) {
    if (!state || !myColor || busy) return
    if (state.status === 'checkmate' || state.status === 'stalemate' || state.status === 'draw') return
    if (state.turn !== myColor) return
    if (selected) {
      const candidates = legalForSelected.filter((m) => m.to.row === pos.row && m.to.col === pos.col)
      if (candidates.length > 0) {
        const promotions = candidates.filter((m) => m.promotion)
        if (promotions.length > 1) {
          setPromo({ from: selected, to: pos })
          return
        }
        void submit(selected, pos, candidates[0].promotion ?? 'queen')
        return
      }
    }
    const piece = state.board[pos.row][pos.col].piece
    if (piece && piece.color === myColor) setSelected(pos)
    else setSelected(null)
  }

  return (
    <div className="app">
      {view === 'auth' && (
        <section className="account">
          <p className="brand">Space Chess</p>
          <h1>{mode === 'up' ? 'Create a pilot' : 'Sign in'}</h1>
          <p className="lede">Rated matches need an account. Guest games against the AI do not.</p>
          <form className="auth-form" onSubmit={(event) => void signIn(event)}>
            {mode === 'up' && (
              <label className="field">
                Username
                <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
              </label>
            )}
            <label className="field">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="field">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
                minLength={6}
                required
              />
            </label>
            {error && <p className="error-line">{error}</p>}
            <div className="setup-actions">
              <button type="submit" className="cta" disabled={busy}>
                {mode === 'up' ? 'Create account' : 'Sign in'}
              </button>
              <button
                type="button"
                className="chip"
                onClick={() => {
                  setMode(mode === 'up' ? 'in' : 'up')
                  setError(null)
                }}
              >
                <strong>{mode === 'up' ? 'I already have an account' : 'Need an account'}</strong>
              </button>
              <button type="button" className="chip" onClick={() => setView('ranks')}>
                <strong>Leaderboard</strong>
              </button>
              <button type="button" className="chip" onClick={onExit}>
                <strong>Local play</strong>
              </button>
            </div>
          </form>
        </section>
      )}

      {view === 'ranks' && (
        <section className="account">
          <p className="brand compact">Space Chess</p>
          <h1>Leaderboard</h1>
          <p className="lede">Everyone starts at 1200. A rated game moves that by 32 times the surprise.</p>
          {error && <p className="error-line">{error}</p>}
          <table className="ranks">
            <thead>
              <tr>
                <th>Pilot</th>
                <th>Elo</th>
                <th>Games</th>
              </tr>
            </thead>
            <tbody>
              {ranks.map((row) => (
                <tr key={row.username}>
                  <td>{row.username}</td>
                  <td>{row.elo}</td>
                  <td>{row.games}</td>
                </tr>
              ))}
              {ranks.length === 0 && (
                <tr>
                  <td colSpan={3}>No pilots yet.</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="setup-actions">
            <button type="button" className="cta" onClick={() => setView(userId ? 'lobby' : 'auth')}>
              {userId ? 'Lobby' : 'Sign in'}
            </button>
            <button type="button" className="chip" onClick={onExit}>
              <strong>Local play</strong>
            </button>
          </div>
        </section>
      )}

      {view === 'lobby' && (
        <section className="account">
          <header className="play-bar">
            <div>
              <p className="brand compact">Space Chess</p>
              <p className="status">
                {profile ? `${profile.username} · ${profile.elo} · ${profile.games} games` : 'Signed in'}
              </p>
            </div>
            <div className="bar-actions">
              <button type="button" onClick={() => setView('ranks')}>
                Leaderboard
              </button>
              <button
                type="button"
                onClick={() => {
                  void signOut()
                  setUserId(null)
                  setProfile(null)
                  setView('auth')
                }}
              >
                Sign out
              </button>
              <button type="button" className="ghost" onClick={onExit}>
                Local play
              </button>
            </div>
          </header>
          <h1>Open a rated table</h1>
          <p className="lede">You pick a civilisation now. The opponent picks theirs when they join.</p>
          <CivRow selected={civ} onSelect={setCiv} />
          {error && <p className="error-line">{error}</p>}
          <div className="setup-actions">
            <button type="button" className="cta" disabled={busy} onClick={() => void createMatch()}>
              Create match
            </button>
          </div>
          <form
            className="join-row"
            onSubmit={(event) => {
              event.preventDefault()
              void joinMatch(code)
            }}
          >
            <label className="field">
              Join with a code
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="ABC123"
              />
            </label>
            <button type="submit" disabled={busy || code.trim().length < 4}>
              Join
            </button>
          </form>
          <div className="match-list">
            {rows.map((row) => (
              <article key={row.id} className="match-row">
                <div>
                  <strong>{row.code}</strong>
                  <p>
                    {CIV_LABELS[row.white_civ]}
                    {row.black_civ ? ` vs ${CIV_LABELS[row.black_civ]}` : ' · waiting'}
                    {' · '}
                    {row.status}
                  </p>
                </div>
                {row.status === 'open' && row.white_id !== userId && (
                  <button type="button" disabled={busy} onClick={() => void joinMatch(row.code)}>
                    Take the seat
                  </button>
                )}
                {row.white_id === userId && row.status === 'open' && (
                  <button
                    type="button"
                    onClick={() => {
                      heard.current = row.updated_at
                      setMatch(row)
                      setView('match')
                    }}
                  >
                    Your table
                  </button>
                )}
                {row.status === 'playing' && (row.white_id === userId || row.black_id === userId) && (
                  <button
                    type="button"
                    onClick={() => {
                      heard.current = row.updated_at
                      setMatch(row)
                      setView('match')
                    }}
                  >
                    Resume
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {view === 'match' && match && (
        <main className="play">
          <header className="play-bar">
            <div>
              <p className="brand compact">Space Chess</p>
              <p className="status">
                {match.status === 'open'
                  ? `Waiting for an opponent · ${match.code}`
                  : state
                    ? statusLabel(state)
                    : match.status}
              </p>
            </div>
            <div className="bar-actions">
              <button type="button" onClick={() => setRulesOpen(true)}>
                Rules
              </button>
              <button type="button" onClick={onToggleMute}>
                {muted ? 'Music off' : 'Music on'}
              </button>
              {match.status === 'playing' &&
                (confirmResign ? (
                  <button type="button" onClick={() => void resign()} disabled={busy}>
                    Confirm resign
                  </button>
                ) : (
                  <button type="button" onClick={() => setConfirmResign(true)}>
                    Resign
                  </button>
                ))}
              {match.status === 'playing' && myColor && state && state.turn !== myColor && now - Date.parse(match.updated_at) >= 60_000 && (
                <button type="button" onClick={() => void claim()} disabled={busy}>
                  Claim disconnect
                </button>
              )}
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setMatch(null)
                  setView('lobby')
                  void refreshLobby()
                }}
              >
                Lobby
              </button>
            </div>
          </header>
          {match.status === 'open' && (
            <section className="account slim">
              <p>Share this code. The board appears when someone takes the black seat.</p>
              <p className="code-banner">{match.code}</p>
              <p>You fly {CIV_LABELS[match.white_civ]}.</p>
            </section>
          )}
          {state && myColor && match.black_civ && (
            <div className="play-layout">
              <aside className="side-panel left">
                <Seat
                  label="Black"
                  civ={state.civs.black}
                  active={state.turn === 'black'}
                  you={myColor === 'black'}
                />
              </aside>
              <Board
                state={state}
                selected={selected}
                legalTargets={legalForSelected}
                onSelect={onSelect}
                orientation={myColor}
                disabled={busy || state.turn !== myColor || match.status !== 'playing'}
                impacts={impacts}
              />
              <aside className="side-panel right">
                <Seat
                  label="White"
                  civ={state.civs.white}
                  active={state.turn === 'white'}
                  you={myColor === 'white'}
                />
                <div className="tips">
                  {error && <p className="error-line">{error}</p>}
                  {busy && <p className="thinking">Sending the order…</p>}
                  {match.status === 'done' && (
                    <p>
                      {match.winner
                        ? `${match.winner === myColor ? 'You' : 'Your opponent'} win${match.winner === myColor ? '' : 's'}. Ratings update on the leaderboard.`
                        : 'Draw. Both ratings move toward each other.'}
                    </p>
                  )}
                  <p className="hint">Both flagships must stay safe. The server rejects an illegal order.</p>
                </div>
              </aside>
            </div>
          )}
          {state && myColor && match.black_civ && (
            <ShipKey
              selected={selected ? (state.board[selected.row][selected.col].piece?.type ?? null) : null}
            />
          )}
        </main>
      )}

      <RulesPanel open={rulesOpen} onClose={() => setRulesOpen(false)} />
      {promo && (
        <div className="modal-backdrop">
          <div className="modal promo">
            <h2>Promote fighter</h2>
            <div className="promo-row">
              {(['queen', 'rook', 'bishop', 'knight'] as PieceType[]).map((type) => (
                <button key={type} type="button" onClick={() => void submit(promo.from, promo.to, type)}>
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

function CivRow({
  selected,
  onSelect,
}: {
  selected: Civilization
  onSelect: (civ: Civilization) => void
}) {
  return (
    <div className="civ-grid">
      {CIVS.map((id) => (
        <button
          key={id}
          type="button"
          className={selected === id ? `civ-card active civ-${id}` : `civ-card civ-${id}`}
          onClick={() => onSelect(id)}
        >
          <CivPortrait civ={id} />
          <strong>{CIV_LABELS[id]}</strong>
          <span>{CIV_ABILITIES[id]}</span>
        </button>
      ))}
    </div>
  )
}

function Seat({
  label,
  civ,
  active,
  you,
}: {
  label: string
  civ: Civilization
  active: boolean
  you: boolean
}) {
  return (
    <div className={`civ-badge civ-${civ} ${active ? 'active' : ''}`}>
      <CivPortrait civ={civ} talking={active} />
      <span className="eyebrow">
        {label}
        {you ? ' · you' : ''}
      </span>
      <strong>{CIV_LABELS[civ]}</strong>
    </div>
  )
}

function impactSquares(move: Move): Pos[] {
  const spots: Pos[] = []
  if (move.capture) spots.push(move.finalTo ?? move.to)
  if (move.asteroidPush?.destroyedEnemy) spots.push(move.asteroidPush.destroyedEnemy)
  if (move.hazardDeaths) spots.push(...move.hazardDeaths)
  return spots
}
