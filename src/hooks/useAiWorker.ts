import { useCallback, useEffect, useRef } from 'react'
import type { Difficulty, GameState, Move } from '../engine/types'
import type { AiResponse } from '../ai/worker'
import AiWorker from '../ai/worker?worker'

export function useAiWorker() {
  const workerRef = useRef<Worker | null>(null)
  const pending = useRef(new Map<number, (move: Move | null) => void>())
  const idRef = useRef(0)

  useEffect(() => {
    const worker = new AiWorker()
    workerRef.current = worker
    worker.onmessage = (event: MessageEvent<AiResponse>) => {
      const resolve = pending.current.get(event.data.id)
      if (resolve) {
        pending.current.delete(event.data.id)
        resolve(event.data.move)
      }
    }
    return () => {
      worker.terminate()
      workerRef.current = null
      pending.current.clear()
    }
  }, [])

  const requestMove = useCallback(
    (state: GameState, difficulty: Difficulty): Promise<Move | null> => {
      return new Promise((resolve) => {
        const id = ++idRef.current
        pending.current.set(id, resolve)
        workerRef.current?.postMessage({ id, state, difficulty })
      })
    },
    [],
  )

  return { requestMove }
}
