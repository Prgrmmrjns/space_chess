import type { Civilization } from '../engine/types'

interface Props {
  civ: Civilization
  talking?: boolean
}

export function CivPortrait({ civ, talking }: Props) {
  return (
    <svg
      viewBox="0 0 120 140"
      className={`portrait portrait-${civ}${talking ? ' talking' : ''}`}
      aria-hidden
    >
      {civ === 'reptiloid' && <Reptiloid />}
      {civ === 'crustacean' && <Crustacean />}
      {civ === 'blob' && <Blob />}
      {civ === 'solarite' && <Solarite />}
      {civ === 'silicate' && <Silicate />}
    </svg>
  )
}

function Reptiloid() {
  return (
    <g className="float">
      <ellipse cx="60" cy="118" rx="28" ry="6" fill="#000" opacity="0.25" />
      <path d="M40 108 C30 70 36 40 60 28 C84 40 90 70 80 108 Z" fill="#3e8f55" />
      <path d="M48 108 C46 78 52 52 60 42 C68 52 74 78 72 108 Z" fill="#6fbf73" />
      <g className="blink">
        <ellipse cx="50" cy="62" rx="6" ry="7" fill="#102016" />
        <ellipse cx="70" cy="62" rx="6" ry="7" fill="#102016" />
        <ellipse cx="52" cy="60" rx="2" ry="2" fill="#d8ffcf" />
        <ellipse cx="72" cy="60" rx="2" ry="2" fill="#d8ffcf" />
      </g>
      <path className="tongue" d="M58 78 H62 L60 96 Z" fill="#d45b6a" />
    </g>
  )
}

function Crustacean() {
  return (
    <g className="float">
      <ellipse cx="60" cy="118" rx="34" ry="6" fill="#000" opacity="0.25" />
      <ellipse cx="60" cy="78" rx="28" ry="24" fill="#c46a32" />
      <ellipse cx="60" cy="80" rx="16" ry="14" fill="#e08a4f" />
      <g className="claw left">
        <path d="M28 70 C10 50 8 30 24 28 C30 40 34 58 36 72 Z" fill="#a35328" />
      </g>
      <g className="claw right">
        <path d="M92 70 C110 50 112 30 96 28 C90 40 86 58 84 72 Z" fill="#a35328" />
      </g>
      <g className="blink">
        <circle cx="50" cy="74" r="4" fill="#1a100c" />
        <circle cx="70" cy="74" r="4" fill="#1a100c" />
      </g>
    </g>
  )
}

function Blob() {
  return (
    <g className="wobble">
      <ellipse cx="60" cy="120" rx="26" ry="5" fill="#000" opacity="0.25" />
      <path
        d="M30 84 C28 40 48 28 60 30 C78 26 96 48 90 86 C84 112 40 114 30 84 Z"
        fill="#3aa0b0"
      />
      <ellipse cx="58" cy="70" rx="18" ry="14" fill="#7ad4e0" opacity="0.7" />
      <g className="blink">
        <circle cx="50" cy="72" r="5" fill="#082026" />
        <circle cx="72" cy="68" r="5" fill="#082026" />
        <circle cx="52" cy="70" r="1.6" fill="#e7fbff" />
        <circle cx="74" cy="66" r="1.6" fill="#e7fbff" />
      </g>
      <path className="mouth" d="M52 90 Q60 98 70 88" fill="none" stroke="#083038" strokeWidth="3" />
    </g>
  )
}

function Solarite() {
  return (
    <g className="float">
      <circle className="corona" cx="60" cy="70" r="40" fill="#f0c14a" opacity="0.25" />
      <circle cx="60" cy="74" r="26" fill="#f6d56a" />
      <circle cx="60" cy="74" r="16" fill="#fff4c8" />
      <g className="blink">
        <ellipse cx="52" cy="72" rx="3" ry="4" fill="#6a4208" />
        <ellipse cx="68" cy="72" rx="3" ry="4" fill="#6a4208" />
      </g>
      <path className="mouth" d="M54 84 Q60 88 66 84" fill="none" stroke="#8a5a10" strokeWidth="2" />
    </g>
  )
}

function Silicate() {
  return (
    <g className="float">
      <polygon points="60,18 92,78 78,118 42,118 28,78" fill="#9aa3ad" />
      <polygon points="60,32 78,74 68,108 52,108 42,74" fill="#d5dbe2" />
      <g className="blink">
        <polygon points="52,70 58,70 55,78" fill="#243040" />
        <polygon points="66,70 72,70 69,78" fill="#243040" />
      </g>
      <path className="shimmer" d="M48 48 L60 36 L66 52" fill="#fff" opacity="0.7" />
    </g>
  )
}
