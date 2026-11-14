import type { Civilization, Difficulty } from '../engine/types'

export type TauntEvent = 'start' | 'move' | 'capture' | 'check' | 'blunder' | 'win' | 'lose'

const LINES: Record<Civilization, Record<TauntEvent, string[]>> = {
  reptiloid: {
    start: [
      'The nest is already growing.',
      'Warm your engines. The brood is patient.',
      'I counted your flagships. Both of them.',
      'Eggs first. Then the sector.',
      'You brought a fleet. I brought a nursery.',
    ],
    move: [
      'Closer. The eggs like the heat.',
      'I am not rushing. Rushing cracks shells.',
      'That file looks like a feeding lane.',
      'Keep flying in straight lines. It helps.',
      'The brood can wait one more move. Can you?',
      'I smell exhaust. You are working too hard.',
    ],
    capture: [
      'Another hull for the nursery.',
      'That one will not be missed.',
      'Strip the paint. Keep the crew for later.',
      'Crunch, then quiet. That is the order.',
      'I will name a hatchling after that wreck.',
    ],
    check: [
      'Your flagships can hear the eggs hatching.',
      'Check. Try not to shed a wing.',
      'Both flags, one nest. Pick a favourite.',
      'Check. The brood is already aboard.',
      'Your admirals are standing in the hatching pit.',
    ],
    blunder: [
      'You flew that dreadnought into my mouth.',
      'Bold. Stupid. Delicious.',
      'I did not hunt that ship. It came home.',
      'Capital ships should not volunteer.',
      'That was a gift. The nest accepts.',
    ],
    win: [
      'The clutch inherits the sector.',
      'Two flags down. The nest keeps them.',
      'Tell the next fleet the eggs were patient.',
      'Warm metal. Cold flags. Perfect.',
    ],
    lose: [
      'The brood will remember this cold.',
      'Enjoy the quiet. It will not last.',
      'You burned a nest. Nests grow back.',
      'Mark the stars. I hatch meaner.',
    ],
  },
  crustacean: {
    start: [
      'Rocks first. Then you.',
      'I have already picked the asteroid with your name on it.',
      'Shell closed. Claws open.',
      'The field is full of things I can throw.',
      'You polish armour. I throw geology.',
    ],
    move: [
      'I am just lining up the next rock.',
      'That lane will not be a lane for long.',
      'Scuttle, scuttle. Then the crush.',
      'I can hear your hull flexing.',
      'Move. I need a clear shot at the rubble.',
      'Patience is a claw. It closes once.',
    ],
    capture: [
      'Crunch. Next.',
      'That was not armour. That was a suggestion.',
      'I will wear a piece of that as a buckle.',
      'Soft in the middle. They always are.',
      'One less light in your formation.',
    ],
    check: [
      'Check. The tide does not negotiate.',
      'Your flags are in the crush zone.',
      'Check. I brought a rock for each flagship.',
      'Admirals first. The rest can drift.',
      'Check. Claws on the throne.',
    ],
    blunder: [
      'You parked a capital ship in a rockslide.',
      'I shove. You regret.',
      'That dreadnought met a pebble and lost.',
      'I did not even aim. The asteroid did.',
      'Capital ship, meet sediment.',
    ],
    win: [
      'The field is mine. The rubble is yours.',
      'Shells closed. Game closed.',
      'Leave the wrecks. They make good cover.',
      'Two flags, one landslide.',
    ],
    lose: [
      'Leave the rocks. I will be back under them.',
      'A clean kill. I hate that.',
      'You cracked the shell. The meat remembers.',
      'I will grow a thicker one. You will not enjoy it.',
    ],
  },
  blob: {
    start: [
      'I fit through the holes you are afraid of.',
      'Hold still. I am deciding which shape to wear.',
      'Doors are a suggestion. So are you.',
      'I have already been on your side of the board.',
      'Pick a shape for me. I will not keep it.',
    ],
    move: [
      'I am oozing into a better argument.',
      'You keep your corners. I do not need them.',
      'That gap is exactly my size. Every gap is.',
      'I am not late. I was under the square.',
      'Hold your formation. It gives me a mold.',
      'One more seep and I am behind you.',
    ],
    capture: [
      'Absorbed.',
      'You can have the paint. I kept the ship.',
      'That hull is a coat now.',
      'I did not break it. I became it.',
      'Delicious edges. Thank you for the corners.',
    ],
    check: [
      'Check. I am already on the other side of the hole.',
      'Your flags are touching my weather.',
      'Check. Both admirals, one puddle.',
      'I am wearing the square under your flagship.',
      'Check. You cannot blockade a liquid.',
    ],
    blunder: [
      'You handed me a dreadnought. I am wearing it.',
      'That was not a sacrifice. That was lunch.',
      'Big ship. Easy to pour into.',
      'I will keep the nameplate.',
      'You flew a palace into a puddle.',
    ],
    win: [
      'Both flags, one puddle.',
      'I did not even have to pick a shape.',
      'The sector takes my outline now.',
      'Mopping up is redundant. I am the mop.',
    ],
    lose: [
      'I will seep back through the bulkhead.',
      'Fine. I was getting thin anyway.',
      'You cannot spill all of me.',
      'I left a film on your flagships. Sleep well.',
    ],
  },
  solarite: {
    start: [
      'Stand near the light if you enjoy burns.',
      'I brought my own star. You brought targets.',
      'Noon is a weapon. I keep it with me.',
      'Shade is for people who intend to survive.',
      'Your fleet is a line of wicks.',
    ],
    move: [
      'I am just walking the corona closer.',
      'That square was cooler a moment ago.',
      'I do not chase. The light does.',
      'Step toward the sun. Everyone does, once.',
      'I can see your welds from here.',
      'Another file in daylight. How generous.',
    ],
    capture: [
      'Flared off the board.',
      'That hull is a cinder now.',
      'I kept the shadow. You can have the ash.',
      'Bright, brief, gone.',
      'It did not explode. It agreed with me.',
    ],
    check: [
      'Check. The corona has your flags.',
      'Step back. Or do not. I like the glow.',
      'Check. Both thrones are in direct light.',
      'Your admirals are squinting. That is check.',
      'Check. I turned the bridge into noon.',
    ],
    blunder: [
      'You flew a capital ship into daylight.',
      'I did not even have to aim. You did.',
      'A dreadnought is just a larger candle.',
      'Thank you for the kindling.',
      'That ship volunteered for the photosphere.',
    ],
    win: [
      'The sector is noon forever.',
      'Two flags, no shadow.',
      'I will leave the lights on.',
      'Burn the map. I know the way by heat.',
    ],
    lose: [
      'The star keeps burning without me.',
      'Mark the orbit. I will cross it again.',
      'You won in the shade. It will not last.',
      'I set. I also rise.',
    ],
  },
  silicate: {
    start: [
      'Planets are doors. You keep stopping at them.',
      'I do not chip. You will.',
      'Count the angles. I already did.',
      'Your fleet is a pile of softer rock.',
      'I brought a lattice. You brought hopes.',
    ],
    move: [
      'Every step is a measurement.',
      'I am not slow. Stone is exact.',
      'That file has a fracture. I will stand on it.',
      'You fidget. I set.',
      'The orbit is a clock. I am the hand.',
      'I heard your hull tick. Metal does that before it splits.',
    ],
    capture: [
      'Fracture confirmed.',
      'Your alloy was softer than it looked.',
      'Clean break. I respect that.',
      'One less variable.',
      'I will keep the shard. Data.',
    ],
    check: [
      'Check. Crystal does not blink.',
      'The flags are in the lattice.',
      'Check. Both thrones, one fault line.',
      'Your admirals are standing on a crack.',
      'Check. I do not raise my voice. The board does.',
    ],
    blunder: [
      'You threw a dreadnought at a rock and lost both.',
      'I counted that mistake in angles.',
      'Capital ships shear. That is the whole lesson.',
      'You aimed a palace at a pebble.',
      'That was not a plan. That was a cleavage plane.',
    ],
    win: [
      'The lattice holds. Your fleet does not.',
      'Quiet now. Stone is thinking.',
      'Two flags, filed under sediment.',
      'I will not celebrate. I will crystallise.',
    ],
    lose: [
      'Cracks are data.',
      'I will recrystallise. Do not get comfortable.',
      'You chipped me. The lattice noted the vector.',
      'Stone loses slowly, and then it does not.',
    ],
  },
}

const EASY_PREFIX = ['Heh. ', 'Watch this. ', 'Easy sky. ', 'Oops, on purpose. ']
const HARD_PREFIX = ['', 'Noted. ', 'Calculated. ', 'Recorded. ']

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
