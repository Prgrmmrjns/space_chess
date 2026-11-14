# Space Chess

A 16×16 fleet battle in a browser. Every file starts occupied, both flagships have to survive, and the sky moves after every full turn. Five civilisations, three AI difficulties, local hot-seat, and rated online play stored in Firebase.

![Space Chess setup](docs/screenshot-setup.png)

![A fleet in the middle of a match](docs/screenshot-board.png)

## Play locally

```bash
npm install
npm run dev
```

```bash
npm test          # rules, Elo, and the match server
npm run build     # static site in dist/, plus the match-function bundle
npm run preview   # serve the production build
```

Guest games (vs AI, hot-seat, AI vs AI) need no account. Music starts after the first click. The first launch shows a four-step briefing.

## Rated online

Accounts, open tables, live boards, and the Elo list live in the Firebase project `spacechess-fleet` (Firestore in `europe-west3`, email/password auth). The public web config is in `src/online/client.ts`. Firestore security rules are in `firestore.rules`.

The same rules engine that runs the local game writes each match. A seat can only be taken by the pilot who joins it, and a pilot can update only their own rating, by the result stored on a finished match they played. Resign, or claim the game after the opponent has left the clock untouched for a minute.

Deploy rule changes with `firebase deploy --only firestore,auth` from this repo. Vercel stays a static Vite site: build `npm run build`, output `dist`. No extra environment variables are required for rated play. Add the Vercel hostname under Firebase Authentication → Settings → Authorized domains before signing in from that site.

A Supabase migration and Edge Function remain in `supabase/` if that backend is used later. They are not what the lobby calls.

## Rules

### The fleet

- **16×16** board. The rank in front of each back rank is 16 fighters. The back rank is the standard line twice, so all 16 files are filled: battleship, cruiser, frigate, dreadnought, flagship, frigate, cruiser, battleship, and the same again.
- The engine still calls those pieces pawn, knight, bishop, rook, queen, and king. The board shows the fleet names.
- Movement, promotion, and en passant follow chess.
- Each side has **two flagships**. A side is in check if either is attacked. A move that leaves either in check is illegal. Checkmate is no legal move while in check.
- Each flagship castles only inside its own half of the back rank (files a–h, or i–p).
- Draws: stalemate, threefold repetition, the 50-move rule, and insufficient material. A star that destroys a flagship wins the game. If one tick destroys a flagship on both sides, the game is a draw.

### Hazards

The layout is seeded, so both players see the same sky. After Black moves, every body steps once:

| Body | Movement |
|---|---|
| Asteroid | Drifts one file and bounces off the edge, a ship, or another hazard. A corner mark shows the next square. |
| Planet | After its sun steps, the planet takes the next clockwise square on that sun’s ring and keeps its owner. The dashed ring is the circle it is about to travel. |
| Star | The sun. Drifts one diagonal step. A ship it lands on is destroyed, unless that ship is a Blob or a Solarite. A corner mark shows the next square. |
| Black hole | Stays put. The hole and every adjacent square are closed to anyone who is not a Blob. |
| Wormhole | Stays paired. Enter one, exit the other, and capture an enemy standing on the exit. |

### Civilisations

| Civ | Ability |
|---|---|
| Reptiloids | Claiming a planet spawns up to **2** allied fighters on empty adjacent squares. |
| Crustaceans | May land on an asteroid and shove it up to **3** squares toward the enemy. The shove can crush a ship. |
| Blobs | Immune to the black-hole well and to stars. Entering one black hole hops to the other and can capture. |
| Solarites | Immune to stars. Ending a move beside a star pushes orthogonally adjacent enemies one square away, when that square is empty. |
| Silicates | Battleships, frigates, and dreadnoughts are not forced to stop on an empty planet. They claim it only if they stop there. An asteroid that would crush a silicate shatters, and the silicate stays. |

A planet spawns fighters only when ownership changes.

### AI

Easy, Medium, and Hard search 1, 2, and 3 plies with node budgets of 600, 3,500, and 10,000. The search uses the same move applier, including the hazard tick, so it will not step onto a star. Easy still mixes in blunders. Against the AI, the portrait talks in canned lines. No model is called.

### Ratings

New pilots start at 1200. A rated game updates both ratings by `32 * (score - expected)`, with the usual 400-point expectation. Guest games are unrated.

## What changed from the first browser version

The first browser build kept a middle-eight army and three civilisations, and it left hazards where they spawned. This version fills the board, doubles the back rank, treats either flagship as a king, and lets asteroids, planets, and stars drift. Reptiloid spawns dropped from 3 to 2, and the crustacean shove from 4 to 3, because a full-width board was snowballing. Blobs gained a hop between the two black holes and immunity to stars, which gives the old immunity something to do every game. Solarites and Silicates are new. Ship silhouettes, portraits, a kill flash, music, a first-launch briefing, and the rated lobby are new too.

The earlier fixes still hold: castling is half-relative, non-blobs cannot enter a black-hole well, wormholes cannot land on a friend, and planet spawns do not repeat on a planet you already own.

## Stack

- TypeScript, React 19, Vite 8, Vitest
- Rules in `src/engine/` (no DOM)
- Alpha-beta in a Web Worker (`src/ai/`)
- Match actions in `src/online/server.ts`, bundled into the Edge Function
- Static `dist/` for Vercel

## Layout

```
src/engine/        rules, Elo
src/ai/            search, worker, trash talk
src/components/    board, setup, portraits, lobby
src/online/        match server and the browser client
firebase.json      Firestore rules and the spacechess-fleet project
public/audio/      music, move, capture
legacy/            original Pygame game
```

## Controls

- Select a ship, then a highlighted square
- Undo (against the AI this also takes back the reply)
- Rules, from the match bar
- Music on / off
- Rated match and Leaderboard, from the setup screen

## Known limitations

- Hard still stops at its node budget on a crowded board.
- A rating can move by at most 32 points per finished match, and only on the signed-in pilot's own profile. The board is still written by the two clients, so a seated player can submit a result; they cannot put another account in the empty seat or edit that account's rating.
- A disconnect claim is a full minute with no move. Closing the tab does not by itself stop the clock.
