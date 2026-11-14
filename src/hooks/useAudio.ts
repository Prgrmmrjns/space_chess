import { useCallback, useEffect, useRef, useState } from 'react'

export function useAudio() {
  const music = useRef<HTMLAudioElement | null>(null)
  const [muted, setMuted] = useState(() => localStorage.getItem('sc-muted') === '1')
  const [armed, setArmed] = useState(false)

  const ensure = useCallback(() => {
    if (!music.current) {
      const track = new Audio('/audio/space.mp3')
      track.loop = true
      track.volume = 0.35
      music.current = track
    }
    return music.current
  }, [])

  useEffect(() => {
    const onPointer = () => {
      setArmed(true)
      window.removeEventListener('pointerdown', onPointer)
    }
    window.addEventListener('pointerdown', onPointer)
    return () => window.removeEventListener('pointerdown', onPointer)
  }, [])

  useEffect(() => {
    if (!armed) return
    const track = ensure()
    track.muted = muted
    if (muted) {
      track.pause()
      return
    }
    void track.play().catch(() => {
      /* Autoplay can still reject until the next gesture. */
    })
  }, [armed, muted, ensure])

  const toggleMute = useCallback(() => {
    setMuted((value) => {
      const next = !value
      localStorage.setItem('sc-muted', next ? '1' : '0')
      return next
    })
    setArmed(true)
  }, [])

  const playEffect = useCallback(
    (kind: 'move' | 'capture') => {
      if (muted) return
      const effect = new Audio(kind === 'capture' ? '/audio/capture.wav' : '/audio/move.wav')
      effect.volume = 0.45
      void effect.play().catch(() => {})
    },
    [muted],
  )

  return { muted, toggleMute, playEffect }
}
