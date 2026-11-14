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
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
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
    byId.set(snap.id, snap.data() as MatchRow)
  }
  return [...byId.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export function watchMatch(id: string, onMatch: (match: MatchRow) => void): () => void {
  return onSnapshot(doc(db, 'matches', id), (snap) => {
    if (snap.exists()) onMatch(snap.data() as MatchRow)
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
      const stored = clean({ ...row, id: ref.id })
      await setDoc(ref, stored)
      return stored
    },
    async getByCode(code) {
      const snap = await getDocs(query(collection(db, 'matches'), where('code', '==', code), limit(1)))
      const first = snap.docs[0]
      return first ? (first.data() as MatchRow) : null
    },
    async getById(id) {
      const snap = await getDoc(doc(db, 'matches', id))
      return snap.exists() ? (snap.data() as MatchRow) : null
    },
    async save(id, expectedUpdatedAt, next) {
      ratedMatchId = id
      const ref = doc(db, 'matches', id)
      return runTransaction(db, async (tx) => {
        const current = await tx.get(ref)
        if (!current.exists() || current.data().updated_at !== expectedUpdatedAt) return null
        const stored = clean(next)
        tx.set(ref, stored)
        return stored
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
    async setRating(id, elo, games) {
      await updateDoc(doc(db, 'profiles', id), { elo, games, lastMatch: ratedMatchId })
    },
  }
}

function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
