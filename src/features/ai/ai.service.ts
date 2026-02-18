type EmbedResult = {
  vector: number[]
  model: string
}

type SummarizeResult = {
  summary: string
}

type WorkerResponse<T> =
  | {
      id: number
      ok: true
      result: T
    }
  | {
      id: number
      ok: false
      error: string
    }

type PendingRequest = {
  reject: (error: Error) => void
  resolve: (value: unknown) => void
}

class AiService {
  private worker: Worker | null = null
  private requestId = 0
  private pending = new Map<number, PendingRequest>()

  private ensureWorker(): Worker {
    if (this.worker) {
      return this.worker
    }

    this.worker = new Worker(new URL('../../workers/ai.worker.ts', import.meta.url), {
      type: 'module',
    })

    this.worker.addEventListener('message', (event: MessageEvent<WorkerResponse<unknown>>) => {
      const data = event.data
      const pendingRequest = this.pending.get(data.id)

      if (!pendingRequest) {
        return
      }

      this.pending.delete(data.id)

      if (data.ok) {
        pendingRequest.resolve(data.result)
        return
      }

      pendingRequest.reject(new Error(data.error))
    })

    this.worker.addEventListener('error', (event) => {
      const failure = new Error(event.message || 'AI worker crashed.')

      for (const pendingRequest of this.pending.values()) {
        pendingRequest.reject(failure)
      }

      this.pending.clear()
    })

    return this.worker
  }

  private request<T>(payload: Record<string, unknown>): Promise<T> {
    const worker = this.ensureWorker()
    const id = ++this.requestId

    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
      })
      worker.postMessage({
        id,
        ...payload,
      })
    })
  }

  public async embedText(text: string): Promise<EmbedResult> {
    return this.request<EmbedResult>({
      type: 'embed',
      text,
    })
  }

  public async summarizeText(
    text: string,
    maxSentences = 3,
  ): Promise<SummarizeResult> {
    return this.request<SummarizeResult>({
      type: 'summarize',
      text,
      maxSentences,
    })
  }
}

export const aiService = new AiService()
