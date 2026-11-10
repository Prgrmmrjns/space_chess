/// <reference lib="webworker" />
import { chooseMove } from './search'
import type { Difficulty, GameState, Move } from '../engine/types'

export interface AiRequest {
  id: number
  state: GameState
  difficulty: Difficulty
}

export interface AiResponse {
  id: number
  move: Move | null
  score: number
  nodes: number
  depth: number
}

self.onmessage = (event: MessageEvent<AiRequest>) => {
  const { id, state, difficulty } = event.data
  const result = chooseMove(state, difficulty)
  const response: AiResponse = {
    id,
    move: result.move,
    score: result.score,
    nodes: result.nodes,
    depth: result.depth,
  }
  ;(self as DedicatedWorkerGlobalScope).postMessage(response)
}
