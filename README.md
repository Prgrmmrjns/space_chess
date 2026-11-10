# Space Chess

A 16×16 browser chess variant set in deep space. Three civilisations clash across asteroids, planets, wormholes, and black holes — play against an AI (Web Worker alpha-beta), hot-seat a friend, or spectate AI vs AI.

**Live idea:** static Vite site → drop on Vercel with zero config.

![Space Chess setup screen](docs/screenshot-setup.png)

![Space Chess board](docs/screenshot-board.png)

## Play locally

```bash
npm install
npm run dev
```

```bash
npm test          # rules + AI unit tests
npm run build     # static output in dist/
npm run preview   # serve the production build
```

## Deploy on Vercel

1. Import the GitHub repo in Vercel.
2. Framework preset: **Vite** (auto-detected).
3. Build command: `npm run build`
4. Output directory: `dist`
5. No environment variables required.

`vercel.json` is optional; the defaults above are enough for a static deploy.

## Rules summary

### Board & chess baseline

- **16×16** board; each army occupies the middle eight files on opposite ranks.
- Standard piece movement, checks, checkmates, stalemates, castling, en passant, and promotion.
- Draws: threefold repetition, 50-move rule (100 half-moves), insufficient material.

### Civilisations

| Civ | Ability |
|---|---|
| **Reptiloids** | Claiming a planet spawns up to **3** allied pawns on empty adjacent squares. |
| **Crustaceans** | May land on **asteroids** and shove them up to **4** squares toward the enemy (can crush a foe). |
| **Blobs** | **Immune** to black holes — may occupy the hole and its 3×3 gravity well. |

### Hazards

- **Asteroids** — block movement (except Crustacean landings).
- **Planets** — stop sliders; landing **claims** the planet and spawns pawns (1 for most civs). Reclaiming your own planet does not spawn again.
- **Black holes** — non-Blob pieces cannot enter the hole or any adjacent square.
- **Wormholes** — colour-matched pairs; enter one to teleport to its twin (captures an enemy on the exit).

### Modes

- Player vs AI (Easy / Medium / Hard)
- Player vs Player (local hot-seat)
- AI vs AI

Online multiplayer is intentionally omitted (would need a backend).

## Design changes from the Pygame original

The spirit of the desktop game is preserved; a few rules were clarified or fixed:

1. **Castling** — original 16×16 castling used inconsistent squares; kingside/queenside now mirror chess relative to the king’s true start file (col 8).
2. **Black holes** — landing on *or adjacent to* a hole is illegal for non-Blobs (was an instant-death move that confused check detection). Blobs remain fully immune.
3. **Planet spawns** — README/code disagreed (2 vs 4 vs 3). Reptiloids now spawn **up to 3**; others **1**. Spawns fire only when ownership **changes**, preventing infinite pawn farms.
4. **Wormhole exits** — teleporting onto an allied piece is illegal; enemy pieces on the exit are captured.
5. **Both sides pick a civ** in setup (PvP and PvAI), instead of a random leftover for the opponent.
6. **AI** — replaced the old one-ply heuristic with **alpha-beta search** in a Web Worker (depths ≈1/2/3 by difficulty, with node budgets for responsiveness).

## Stack

- TypeScript + React 19 + Vite 8
- Pure rules engine under `src/engine/` (unit-tested with Vitest)
- AI under `src/ai/` running in a module Worker
- Static `dist/` output for Vercel

## Project layout

```
src/engine/     typed rules (moves, hazards, civs, status)
src/ai/         evaluation + alpha-beta + worker
src/components/ board, setup, rules UI
legacy/         original Pygame desktop game (archived)
docs/           screenshots
```

## Controls

- Tap/click a piece, then a highlighted square
- **Undo** (PvAI undoes your move and the reply)
- **Rules** panel for civs & hazards
- **New map** reshuffles space elements; **Setup** returns to the lobby

## Known limitations

- 16×16 with full legal-move check filtering is heavy; Hard AI uses a node budget and may stop mid-iteration on complex midgames.
- No online multiplayer.
- No sound (the legacy desktop build kept audio assets under `legacy/assets/`).
