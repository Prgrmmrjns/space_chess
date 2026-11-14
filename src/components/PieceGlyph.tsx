import { useId } from 'react'
import type { Civilization, Color, PieceType } from '../engine/types'

const ACCENT: Record<Civilization, string> = {
  reptiloid: '#6fbf73',
  crustacean: '#e08a4f',
  blob: '#5ec8d8',
  solarite: '#f0c14a',
  silicate: '#c5ccd4',
}

interface Props {
  type: PieceType
  color: Color
  civ: Civilization
}

export function PieceGlyph({ type, color, civ }: Props) {
  const raw = useId().replace(/:/g, '')
  const fill = color === 'white' ? '#f4efe6' : '#1c2430'
  const stroke = color === 'white' ? '#2a3340' : '#d7dee8'
  const accent = ACCENT[civ]
  const hull = `url(#hull-${raw})`

  return (
    <svg viewBox="0 0 64 64" className="piece-glyph" aria-hidden>
      <defs>
        <linearGradient id={`hull-${raw}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color === 'white' ? '#fff' : '#3d4b5e'} />
          <stop offset="100%" stopColor={fill} />
        </linearGradient>
      </defs>
      {type === 'pawn' && <Fighter hull={hull} stroke={stroke} accent={accent} />}
      {type === 'knight' && <Cruiser hull={hull} stroke={stroke} accent={accent} />}
      {type === 'bishop' && <Frigate hull={hull} stroke={stroke} accent={accent} />}
      {type === 'rook' && <Battleship hull={hull} stroke={stroke} accent={accent} />}
      {type === 'queen' && <Dreadnought hull={hull} stroke={stroke} accent={accent} />}
      {type === 'king' && <Flagship hull={hull} stroke={stroke} accent={accent} />}
    </svg>
  )
}

function Fighter({ hull, stroke, accent }: Ship) {
  return (
    <g stroke={stroke} strokeWidth="2" strokeLinejoin="round">
      <path d="M32 6 L42 28 L32 24 L22 28 Z" fill={hull} />
      <path d="M18 34 H46 L40 52 H24 Z" fill={hull} />
      <path d="M28 36 H36" stroke={accent} strokeWidth="3" />
      <circle cx="32" cy="44" r="2.5" fill={accent} stroke="none" />
    </g>
  )
}

function Cruiser({ hull, stroke, accent }: Ship) {
  return (
    <g stroke={stroke} strokeWidth="2" strokeLinejoin="round">
      <path d="M14 22 L30 10 L34 22 L30 46 L18 46 Z" fill={hull} />
      <path d="M34 26 H50 L46 40 H34 Z" fill={hull} />
      <path d="M22 28 H30" stroke={accent} strokeWidth="3" />
      <circle cx="40" cy="33" r="2" fill={accent} stroke="none" />
    </g>
  )
}

function Frigate({ hull, stroke, accent }: Ship) {
  return (
    <g stroke={stroke} strokeWidth="2" strokeLinejoin="round">
      <path d="M30 8 H34 L36 48 H28 Z" fill={hull} />
      <path d="M18 30 L32 16 L32 42 Z" fill={accent} opacity="0.85" />
      <path d="M22 50 H42 L38 56 H26 Z" fill={hull} />
    </g>
  )
}

function Battleship({ hull, stroke, accent }: Ship) {
  return (
    <g stroke={stroke} strokeWidth="2" strokeLinejoin="round">
      <path d="M12 26 H52 L48 48 H16 Z" fill={hull} />
      <rect x="20" y="16" width="10" height="12" fill={hull} />
      <rect x="34" y="16" width="10" height="12" fill={hull} />
      <path d="M22 20 H28 M36 20 H42" stroke={accent} strokeWidth="3" />
      <path d="M18 36 H46" stroke={accent} strokeWidth="2" />
    </g>
  )
}

function Dreadnought({ hull, stroke, accent }: Ship) {
  return (
    <g stroke={stroke} strokeWidth="2" strokeLinejoin="round">
      <path d="M32 6 L40 18 L54 24 L46 46 L32 56 L18 46 L10 24 L24 18 Z" fill={hull} />
      <path d="M32 16 L36 28 H28 Z" fill={accent} />
      <circle cx="22" cy="34" r="2" fill={accent} stroke="none" />
      <circle cx="42" cy="34" r="2" fill={accent} stroke="none" />
      <path d="M24 44 H40" stroke={accent} strokeWidth="2" />
    </g>
  )
}

function Flagship({ hull, stroke, accent }: Ship) {
  return (
    <g stroke={stroke} strokeWidth="2" strokeLinejoin="round">
      <path d="M16 34 H48 L44 52 H20 Z" fill={hull} />
      <path d="M26 18 H38 L36 34 H28 Z" fill={hull} />
      <path d="M32 6 V18 M26 12 H38" stroke={accent} strokeWidth="3" />
      <circle cx="32" cy="42" r="4" fill={accent} stroke="none" />
    </g>
  )
}

interface Ship {
  hull: string
  stroke: string
  accent: string
}
