import type { Civilization, Difficulty } from '../engine/types'

export type TauntEvent = 'start' | 'capture' | 'check' | 'blunder' | 'win' | 'lose'

const LINES: Record<Civilization, Record<TauntEvent, string[]>> = {
  reptiloid: {
    start: ['The nest is already growing.', 'Warm your engines. The brood is patient.'],
    capture: ['Another hull for the nursery.', 'That one will not be missed.'],
    check: ['Your flagships can hear the eggs hatching.', 'Check. Try not to shed a wing.'],
    blunder: ['You flew that dreadnought into my mouth.', 'Bold. Stupid. Delicious.'],
    win: ['The clutch inherits the sector.', 'Two flags down. The nest keeps them.'],
    lose: ['The brood will remember this cold.', 'Enjoy the quiet. It will not last.'],
  },
  crustacean: {
    start: ['Rocks first. Then you.', 'I have already picked the asteroid with your name on it.'],
    capture: ['Crunch. Next.', 'That was not armour. That was a suggestion.'],
    check: ['Check. The tide does not negotiate.', 'Your flags are in the crush zone.'],
    blunder: ['You parked a capital ship in a rockslide.', 'I shove. You regret.'],
    win: ['The field is mine. The rubble is yours.', 'Shells closed. Game closed.'],
    lose: ['Leave the rocks. I will be back under them.', 'A clean kill. I hate that.'],
  },
  blob: {
    start: ['I fit through the holes you are afraid of.', 'Hold still. I am deciding which shape to wear.'],
    capture: ['Absorbed.', 'You can have the paint. I kept the ship.'],
    check: ['Check. I am already on the other side of the hole.', 'Your flags are touching my weather.'],
    blunder: ['You handed me a dreadnought. I am wearing it.', 'That was not a sacrifice. That was lunch.'],
    win: ['Both flags, one puddle.', 'I did not even have to pick a shape.'],
    lose: ['I will seep back through the bulkhead.', 'Fine. I was getting thin anyway.'],
  },
  solarite: {
    start: ['Stand near the light if you enjoy burns.', 'I brought my own star. You brought targets.'],
    capture: ['Flared off the board.', 'That hull is a cinder now.'],
    check: ['Check. The corona has your flags.', 'Step back. Or do not. I like the glow.'],
    blunder: ['You flew a capital ship into daylight.', 'I did not even have to aim. You did.'],
    win: ['The sector is noon forever.', 'Two flags, no shadow.'],
    lose: ['The star keeps burning without me.', 'Mark the orbit. I will cross it again.'],
  },
  silicate: {
    start: ['Planets are doors. You keep stopping at them.', 'I do not chip. You will.'],
    capture: ['Fracture confirmed.', 'Your alloy was softer than it looked.'],
    check: ['Check. Crystal does not blink.', 'The flags are in the lattice.'],
    blunder: ['You threw a dreadnought at a rock and lost both.', 'I counted that mistake in angles.'],
    win: ['The lattice holds. Your fleet does not.', 'Quiet now. Stone is thinking.'],
    lose: ['Cracks are data.', 'I will recrystallise. Do not get comfortable.'],
  },
}

const EASY_PREFIX = ['Heh. ', 'Watch this. ', 'Easy sky. ']
const HARD_PREFIX = ['', 'Noted. ', 'Calculated. ']

export function tauntLine(
  civ: Civilization,
  difficulty: Difficulty,
  event: TauntEvent,
  rng: () => number = Math.random,
): string {
  const pool = LINES[civ][event]
  const line = pool[Math.floor(rng() * pool.length)] ?? pool[0]
  if (difficulty === 'easy' && event !== 'lose') {
    return `${EASY_PREFIX[Math.floor(rng() * EASY_PREFIX.length)]}${line}`
  }
  if (difficulty === 'hard' && (event === 'check' || event === 'blunder' || event === 'win')) {
    return `${HARD_PREFIX[Math.floor(rng() * HARD_PREFIX.length)]}${line}`
  }
  return line
}
