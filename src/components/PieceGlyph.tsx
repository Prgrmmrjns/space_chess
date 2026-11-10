import type { Civilization, Color, PieceType } from '../engine/types'

const ACCENT: Record<Civilization, string> = {
  reptiloid: '#6fbf73',
  crustacean: '#e08a4f',
  blob: '#5ec8d8',
}

interface Props {
  type: PieceType
  color: Color
  civ: Civilization
}

export function PieceGlyph({ type, color, civ }: Props) {
  const fill = color === 'white' ? '#f4efe6' : '#1c2430'
  const stroke = color === 'white' ? '#2a3340' : '#d7dee8'
  const accent = ACCENT[civ]

  return (
    <svg viewBox="0 0 64 64" className="piece-glyph" aria-hidden>
      <defs>
        <radialGradient id={`g-${color}-${civ}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor={color === 'white' ? '#fff' : '#3a4555'} />
          <stop offset="100%" stopColor={fill} />
        </radialGradient>
      </defs>
      {type === 'pawn' && <Pawn fill={`url(#g-${color}-${civ})`} stroke={stroke} accent={accent} />}
      {type === 'knight' && <Knight fill={`url(#g-${color}-${civ})`} stroke={stroke} accent={accent} />}
      {type === 'bishop' && <Bishop fill={`url(#g-${color}-${civ})`} stroke={stroke} accent={accent} />}
      {type === 'rook' && <Rook fill={`url(#g-${color}-${civ})`} stroke={stroke} accent={accent} />}
      {type === 'queen' && <Queen fill={`url(#g-${color}-${civ})`} stroke={stroke} accent={accent} />}
      {type === 'king' && <King fill={`url(#g-${color}-${civ})`} stroke={stroke} accent={accent} />}
    </svg>
  )
}

function Pawn({ fill, stroke, accent }: { fill: string; stroke: string; accent: string }) {
  return (
    <g stroke={stroke} strokeWidth="2" strokeLinejoin="round">
      <circle cx="32" cy="22" r="8" fill={fill} />
      <path d="M20 52c2-12 8-18 12-18s10 6 12 18" fill={fill} />
      <ellipse cx="32" cy="34" rx="10" ry="5" fill={accent} opacity="0.85" />
      <path d="M18 54h28" stroke={accent} strokeWidth="3" />
    </g>
  )
}

function Knight({ fill, stroke, accent }: { fill: string; stroke: string; accent: string }) {
  return (
    <g stroke={stroke} strokeWidth="2" strokeLinejoin="round">
      <path
        d="M18 52h28l-2-8c-6-2-8-8-7-16 4-2 8-8 7-14-6 2-12 2-16 8-2-4-2-8 0-12-8 6-12 14-10 24l0 18z"
        fill={fill}
      />
      <circle cx="28" cy="24" r="2" fill={accent} />
      <path d="M20 52h24" stroke={accent} strokeWidth="3" />
    </g>
  )
}

function Bishop({ fill, stroke, accent }: { fill: string; stroke: string; accent: string }) {
  return (
    <g stroke={stroke} strokeWidth="2" strokeLinejoin="round">
      <circle cx="32" cy="14" r="3" fill={accent} />
      <path d="M32 18c8 8 12 16 10 28H22c-2-12 2-20 10-28z" fill={fill} />
      <path d="M28 30l8 8" stroke={accent} strokeWidth="2" />
      <path d="M18 52h28" stroke={accent} strokeWidth="3" />
    </g>
  )
}

function Rook({ fill, stroke, accent }: { fill: string; stroke: string; accent: string }) {
  return (
    <g stroke={stroke} strokeWidth="2" strokeLinejoin="round">
      <path d="M18 20h8v-6h4v6h4v-6h4v6h8v10H18z" fill={fill} />
      <path d="M20 30h24v16H20z" fill={fill} />
      <rect x="16" y="46" width="32" height="8" rx="1" fill={fill} />
      <path d="M22 36h20" stroke={accent} strokeWidth="2" />
    </g>
  )
}

function Queen({ fill, stroke, accent }: { fill: string; stroke: string; accent: string }) {
  return (
    <g stroke={stroke} strokeWidth="2" strokeLinejoin="round">
      <circle cx="16" cy="18" r="3" fill={accent} />
      <circle cx="32" cy="12" r="3" fill={accent} />
      <circle cx="48" cy="18" r="3" fill={accent} />
      <path d="M16 20l6 28h20l6-28-10 12-6-16-6 16z" fill={fill} />
      <path d="M18 52h28" stroke={accent} strokeWidth="3" />
    </g>
  )
}

function King({ fill, stroke, accent }: { fill: string; stroke: string; accent: string }) {
  return (
    <g stroke={stroke} strokeWidth="2" strokeLinejoin="round">
      <path d="M32 8v10M27 13h10" stroke={accent} strokeWidth="3" />
      <path d="M20 24h24l-4 22H24z" fill={fill} />
      <path d="M18 52h28" stroke={accent} strokeWidth="3" />
      <circle cx="32" cy="30" r="4" fill={accent} opacity="0.9" />
    </g>
  )
}
