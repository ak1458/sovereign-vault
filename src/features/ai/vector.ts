export const DEFAULT_EMBEDDING_DIMENSION = 192

const normalizeToken = (token: string): string => {
  return token.trim().toLowerCase()
}

const tokenize = (text: string): string[] => {
  return text
    .split(/[^a-zA-Z0-9]+/g)
    .map(normalizeToken)
    .filter((token) => token.length > 1)
}

const hashToken = (token: string): number => {
  let hash = 2166136261

  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return Math.abs(hash >>> 0)
}

export const normalizeVector = (vector: number[]): number[] => {
  const magnitude = Math.sqrt(
    vector.reduce((sum, value) => sum + value * value, 0),
  )

  if (magnitude === 0) {
    return vector
  }

  return vector.map((value) => value / magnitude)
}

export const createHashEmbedding = (
  text: string,
  dimension = DEFAULT_EMBEDDING_DIMENSION,
): number[] => {
  const vector = new Array<number>(dimension).fill(0)
  const tokens = tokenize(text)

  if (tokens.length === 0) {
    return vector
  }

  for (const token of tokens) {
    const hash = hashToken(token)
    const index = hash % dimension
    const sign = (hash & 1) === 0 ? 1 : -1
    const weight = 1 + (token.length % 5) * 0.1
    vector[index] += sign * weight
  }

  return normalizeVector(vector)
}

export const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0
  }

  let dot = 0
  let aNorm = 0
  let bNorm = 0

  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index]
    aNorm += a[index] * a[index]
    bNorm += b[index] * b[index]
  }

  if (aNorm === 0 || bNorm === 0) {
    return 0
  }

  return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm))
}
