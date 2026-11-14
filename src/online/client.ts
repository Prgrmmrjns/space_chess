import { initializeApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Transaction,
} from 'firebase/firestore'
import { nextElo } from '../engine/elo'
import { awardsMatch, type PlyRecord } from './replay'
import {
  handleAction,
  type MatchAction,
  type MatchDb,
  type MatchResult,
  type MatchRow,
  type ProfileRow,
} from './server'

/** Public web config for spacechess-fleet. Security rules, not this key, protect the data. */
const firebaseConfig = {
  apiKey: 'AIzaSyClGChiCxQ4uLkH5EuLmthMKaH8iL8lfjI',
  authDomain: 'spacechess-fleet.firebaseapp.com',
  projectId: 'spacechess-fleet',
  storageBucket: 'spacechess-fleet.firebasestorage.app',
  messagingSenderId: '434462457567',
  appId: '1:434462457567:web:6b63997759e30ef503b36a',
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export const firebaseConfigured = true

export interface PilotProfile {
  username: string
  elo: number
  games: number
}

export function watchAuth(onId: (uid: string | null) => void): () => void {
  return onAuthStateChanged(auth, (user) => onId(user?.uid ?? null))
}

export async function signUp(email: string, password: string, username: string): Promise<string> {
  const taken = await getDocs(query(collection(db, 'profiles'), where('username', '==', username), limit(1)))
  if (!taken.empty) throw new Error('That username is taken')
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await setDoc(doc(db, 'profiles', cred.user.uid), { username, elo: 1200, games: 0 })
  return cred.user.uid
}

export async function signIn(email: string, password: string): Promise<string> {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  return cred.user.uid
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}

export async function loadProfile(uid: string): Promise<PilotProfile | null> {
  const snap = await getDoc(doc(db, 'profiles', uid))
  if (!snap.exists()) return null
  const data = snap.data()
  return { username: String(data.username), elo: Number(data.elo), games: Number(data.games) }
}

export async function loadRanks(): Promise<PilotProfile[]> {
  const snap = await getDocs(query(collection(db, 'profiles'), orderBy('elo', 'desc'), limit(50)))
  return snap.docs.map((row) => {
    const data = row.data()
    return { username: String(data.username), elo: Number(data.elo), games: Number(data.games) }
  })
}

export async function loadLobby(uid: string): Promise<MatchRow[]> {
  const matches = collection(db, 'matches')
  const [open, asWhite, asBlack] = await Promise.all([
    getDocs(query(matches, where('status', '==', 'open'), limit(40))),
    getDocs(query(matches, where('white_id', '==', uid), limit(20))),
    getDocs(query(matches, where('black_id', '==', uid), limit(20))),
  ])
  const byId = new Map<string, MatchRow>()
  for (const snap of [...open.docs, ...asWhite.docs, ...asBlack.docs]) {
    byId.set(snap.id, asRow(snap.data()))
  }
  return [...byId.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

/** Record this pilot's own result. The rules reject a write to anyone else's profile. */
export async function claimOwnRating(matchId: string): Promise<void> {
  const uid = auth.currentUser?.uid
  if (!uid) return
  const snap = await getDoc(doc(db, 'matches', matchId))
  if (!snap.exists()) return
  const match = asRow(snap.data())
  if (match.status !== 'done' || match.white_accept !== true || match.black_accept !== true) return
  if (!awardsMatch(match)) return
  const award = match.white_id === uid ? match.white_elo : match.black_id === uid ? match.black_elo : null
  if (typeof award !== 'number') return
  const profileRef = doc(db, 'profiles', uid)
  const profile = await getDoc(profileRef)
  if (!profile.exists()) return
  const data = profile.data()
  if (data.lastMatch === matchId) return
  if (Math.abs(award - Number(data.elo)) > 32) return
  await updateDoc(profileRef, { elo: award, games: Number(data.games) + 1, lastMatch: matchId })
}

/** Record that this pilot stands behind a finished result. Only their own flag can change. */
export async function acceptResult(matchId: string): Promise<void> {
  const uid = auth.currentUser?.uid
  if (!uid) return
  const ref = doc(db, 'matches', matchId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) return
    const match = snap.data()
    if (match.status !== 'done') return
    if (match.white_id === uid) {
      if (match.white_accept === true) return
      tx.update(ref, { white_accept: true })
      return
    }
    if (match.black_id === uid) {
      if (match.black_accept === true) return
      tx.update(ref, { black_accept: true })
    }
  })
}

export function watchMatch(id: string, onMatch: (match: MatchRow) => void): () => void {
  return onSnapshot(doc(db, 'matches', id), (snap) => {
    if (snap.exists()) onMatch(asRow(snap.data()))
  })
}

export function watchPlies(matchId: string, onPlies: (plies: PlyRecord[]) => void): () => void {
  const rows = query(collection(db, 'matches', matchId, 'plies'), orderBy('n'))
  return onSnapshot(rows, (snap) => {
    onPlies(snap.docs.map((row) => asPly(row.data())))
  })
}

export async function callMatch(body: MatchAction): Promise<MatchResult> {
  const uid = auth.currentUser?.uid
  if (!uid) return { ok: false, error: 'Sign in first' }
  try {
    return await handleAction(firestoreDb(), uid, body)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'The match could not be saved'
    return { ok: false, error: message }
  }
}

function firestoreDb(): MatchDb {
  let ratedMatchId = ''
  return {
    async insertMatch(row) {
      const ref = doc(collection(db, 'matches'))
      const stored = {
        ...clean(row),
        id: ref.id,
        white_accept: false,
        black_accept: false,
        white_before: null,
        black_before: null,
        plyCount: 0,
        server_at: serverTimestamp(),
        created_at: serverTimestamp(),
      }
      await setDoc(ref, stored)
      return { ...row, id: ref.id }
    },
    async getByCode(code) {
      const snap = await getDocs(query(collection(db, 'matches'), where('code', '==', code), limit(1)))
      const first = snap.docs[0]
      return first ? asRow(first.data()) : null
    },
    async getById(id) {
      const snap = await getDoc(doc(db, 'matches', id))
      return snap.exists() ? asRow(snap.data()) : null
    },
    async listPlies(id) {
      const snap = await getDocs(query(collection(db, 'matches', id, 'plies'), orderBy('n')))
      return snap.docs.map((row) => asPly(row.data()))
    },
    async save(id, expectedUpdatedAt, next, ply) {
      ratedMatchId = id
      const ref = doc(db, 'matches', id)
      return runTransaction(db, async (tx) => {
        const current = await tx.get(ref)
        if (!current.exists() || asIso(current.data().updated_at) !== expectedUpdatedAt) return null
        const data = current.data()
        const count = Number(data.plyCount ?? 0)
        if (ply) {
          const plyRef = doc(db, 'matches', id, 'plies', String(count))
          if ((await tx.get(plyRef)).exists()) return null
          tx.set(plyRef, {
            n: count,
            by: auth.currentUser?.uid,
            kind: ply.kind,
            at: serverTimestamp(),
            ...(ply.from && ply.to ? { from: ply.from, to: ply.to, promotion: ply.promotion ?? 'queen' } : {}),
          })
        }
        const bases =
          data.status === 'open' && next.status === 'playing' && next.black_id
            ? await lockedRatings(tx, next.white_id, next.black_id)
            : { white_before: data.white_before ?? null, black_before: data.black_before ?? null }
        const awards = await finishAwards(next, bases)
        const stored = {
          ...clean(next),
          ...awards,
          ...acceptFlags(next),
          ...bases,
          plyCount: count + (ply ? 1 : 0),
          server_at: serverTimestamp(),
          created_at: data.created_at ?? serverTimestamp(),
        }
        tx.set(ref, stored)
        return clean(next)
      })
    },
    async getProfile(id) {
      const snap = await getDoc(doc(db, 'profiles', id))
      if (!snap.exists()) return null
      const data = snap.data()
      return {
        id,
        username: String(data.username),
        elo: Number(data.elo),
        games: Number(data.games),
      } satisfies ProfileRow
    },
    async setRating(id, _elo, games) {
      if (id !== auth.currentUser?.uid || !ratedMatchId) return
      const snap = await getDoc(doc(db, 'matches', ratedMatchId))
      if (!snap.exists()) return
      const data = snap.data()
      const award = data.white_id === id ? data.white_elo : data.black_elo
      if (typeof award !== 'number' || data.white_accept !== true || data.black_accept !== true) return
      if (!awardsMatch(asRow(data))) return
      await updateDoc(doc(db, 'profiles', id), { elo: award, games, lastMatch: ratedMatchId })
    },
  }
}

async function lockedRatings(
  tx: Transaction,
  whiteId: string,
  blackId: string,
): Promise<{ white_before: number; black_before: number }> {
  const whiteSnap = await tx.get(doc(db, 'profiles', whiteId))
  const blackSnap = await tx.get(doc(db, 'profiles', blackId))
  if (!whiteSnap.exists() || !blackSnap.exists()) throw new Error('Both pilots need a rating')
  return { white_before: Number(whiteSnap.data().elo), black_before: Number(blackSnap.data().elo) }
}

async function finishAwards(
  next: MatchRow,
  bases: { white_before?: number | null; black_before?: number | null },
): Promise<{ white_elo: number; black_elo: number } | Record<string, never>> {
  if (next.status !== 'done' || !next.rated || !next.black_id) return {}
  if (typeof bases.white_before !== 'number' || typeof bases.black_before !== 'number') return {}
  const whiteScore = next.winner === 'white' ? 1 : next.winner === 'black' ? 0 : 0.5
  return {
    white_elo: nextElo(bases.white_before, bases.black_before, whiteScore),
    black_elo: nextElo(bases.black_before, bases.white_before, 1 - whiteScore),
  }
}

function acceptFlags(next: MatchRow): { white_accept: boolean; black_accept: boolean } {
  if (next.status !== 'done') return { white_accept: false, black_accept: false }
  const uid = auth.currentUser?.uid
  return {
    white_accept: uid === next.white_id,
    black_accept: uid === next.black_id,
  }
}

function asIso(value: unknown): string {
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().toISOString()
  }
  return typeof value === 'string' ? value : new Date(0).toISOString()
}

function asMillis(value: unknown): number {
  return Date.parse(asIso(value))
}

function asRow(data: Record<string, unknown>): MatchRow {
  return {
    ...(data as unknown as MatchRow),
    updated_at: asIso(data.updated_at),
    created_at: data.created_at ? asIso(data.created_at) : undefined,
    server_at: data.server_at ? asIso(data.server_at) : undefined,
  }
}

function asPly(data: Record<string, unknown>): PlyRecord {
  const from = data.from as PlyRecord['from']
  const to = data.to as PlyRecord['to']
  return {
    n: Number(data.n),
    by: String(data.by),
    kind: data.kind === 'resign' || data.kind === 'claim' ? data.kind : 'move',
    from,
    to,
    promotion: data.promotion as PlyRecord['promotion'],
    at: asMillis(data.at),
  }
}

function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
