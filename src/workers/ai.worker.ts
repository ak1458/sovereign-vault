import { createHashEmbedding } from '../features/ai/vector'

interface EmbedRequest {
  id: number
  type: 'embed'
  text: string
}

interface SummarizeRequest {
  id: number
  type: 'summarize'
  text: string
  maxSentences: number
}

type WorkerRequest = EmbedRequest | SummarizeRequest

interface WorkerSuccessResponse<T> {
  id: number
  ok: true
  result: T
}

interface WorkerErrorResponse {
  id: number
  ok: false
  error: string
}

type WorkerResponse<T> = WorkerSuccessResponse<T> | WorkerErrorResponse

const toSentences = (text: string): string[] => {
  return text
    .split(/(?<=[.!?])\s+/g)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)
}

const summarizeText = (text: string, maxSentences: number): string => {
  const sentences = toSentences(text)

  if (sentences.length === 0) {
    return ''
  }

  const sentenceScores = sentences.map((sentence, index) => {
    const lengthBoost = Math.min(sentence.length / 140, 1.2)
    const positionBoost = Math.max(0.2, 1 - index * 0.08)

    return {
      sentence,
      score: lengthBoost * positionBoost,
      index,
    }
  })

  return sentenceScores
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, maxSentences))
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.sentence)
    .join(' ')
}

const postOk = <T>(id: number, result: T) => {
  const response: WorkerResponse<T> = {
    id,
    ok: true,
    result,
  }

  self.postMessage(response)
}

const postError = (id: number, error: string) => {
  const response: WorkerResponse<never> = {
    id,
    ok: false,
    error,
  }

  self.postMessage(response)
}

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const payload = event.data
  const requestId = payload.id

  try {
    if (payload.type === 'embed') {
      const vector = createHashEmbedding(payload.text)
      postOk(requestId, { vector, model: 'hash-v1' })
      return
    }

    if (payload.type === 'summarize') {
      const summary = summarizeText(payload.text, payload.maxSentences)
      postOk(requestId, { summary })
      return
    }

    postError(requestId, 'Unsupported AI request type.')
  } catch (error) {
    postError(
      requestId,
      error instanceof Error ? error.message : 'AI worker failed.',
    )
  }
})
