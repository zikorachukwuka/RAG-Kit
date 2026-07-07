// Embedding adapter — speaks the OpenAI /v1/embeddings API format.
// Works with any compatible provider: OpenAI, Voyage AI, Jina, Ollama, etc.
// Configure via environment variables — no code changes needed to switch.

export async function embed(input: string | string[]): Promise<number[][]> {
  const baseUrl = process.env.EMBEDDING_BASE_URL
  const model   = process.env.EMBEDDING_MODEL
  const apiKey  = process.env.EMBEDDING_API_KEY

  if (!baseUrl || !model) {
    throw new Error('EMBEDDING_BASE_URL and EMBEDDING_MODEL must be set.')
  }

  const res = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ model, input }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Embedding API error ${res.status}: ${body}`)
  }

  const data = await res.json() as { data: { embedding: number[] }[] }
  return data.data.map((d) => d.embedding)
}

// Convenience: embed a single string and return a flat number array.
export async function embedOne(input: string): Promise<number[]> {
  const results = await embed(input)
  return results[0]
}
