import type { Square } from '../engine/types'

export function HazardMark({ square }: { square: Square }) {
  if (!square.hazard) return null

  if (square.hazard === 'asteroid') {
    return (
      <span className="hazard asteroid" title="Asteroid">
        <svg viewBox="0 0 40 40" aria-hidden>
          <polygon
            points="12,8 28,10 34,22 26,34 10,30 6,16"
            fill="#8a6a4a"
            stroke="#5c4030"
            strokeWidth="2"
          />
          <circle cx="18" cy="18" r="2" fill="#5c4030" />
          <circle cx="24" cy="24" r="1.5" fill="#5c4030" />
        </svg>
      </span>
    )
  }

  if (square.hazard === 'planet') {
    const tint =
      square.planetOwner === 'white'
        ? '#9ec7ff'
        : square.planetOwner === 'black'
          ? '#4a6db5'
          : '#3d8fd4'
    return (
      <span className="hazard planet" title="Planet">
        <svg viewBox="0 0 40 40" aria-hidden>
          <circle cx="20" cy="20" r="11" fill={tint} stroke="#1a3a5c" strokeWidth="2" />
          <ellipse
            cx="20"
            cy="20"
            rx="16"
            ry="5"
            fill="none"
            stroke="#c9e4ff"
            strokeWidth="1.5"
            opacity="0.7"
            transform="rotate(-20 20 20)"
          />
        </svg>
      </span>
    )
  }

  if (square.hazard === 'star') {
    return (
      <span className="hazard star" title="Star">
        <svg viewBox="0 0 40 40" aria-hidden>
          <polygon
            points="20,4 24,16 36,16 26,24 30,36 20,28 10,36 14,24 4,16 16,16"
            fill="#f2d36b"
            stroke="#a87820"
            strokeWidth="1.5"
          />
        </svg>
      </span>
    )
  }

  if (square.hazard === 'blackhole') {
    return (
      <span className="hazard blackhole" title="Black hole">
        <svg viewBox="0 0 40 40" aria-hidden>
          <circle cx="20" cy="20" r="14" fill="#0a0c12" stroke="#c45c2a" strokeWidth="2" />
          <circle cx="20" cy="20" r="7" fill="#000" />
          <circle cx="20" cy="20" r="3" fill="#1a1208" />
        </svg>
      </span>
    )
  }

  const pair = square.wormholeId === 0
  return (
    <span className="hazard wormhole" title="Wormhole">
      <svg viewBox="0 0 40 40" aria-hidden>
        <circle
          cx="20"
          cy="20"
          r="12"
          fill="none"
          stroke={pair ? '#2aa8c4' : '#d4a017'}
          strokeWidth="3"
        />
        <circle
          cx="20"
          cy="20"
          r="6"
          fill={pair ? '#145868' : '#6b5208'}
          stroke={pair ? '#7ad8ea' : '#f0d060'}
          strokeWidth="2"
        />
      </svg>
    </span>
  )
}
