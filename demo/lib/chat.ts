export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  temperature?: number
  max_tokens?: number
  top_p?: number
}

export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<string> {
  const baseUrl = process.env.CHAT_BASE_URL
  const model   = process.env.CHAT_MODEL
  const apiKey  = process.env.CHAT_API_KEY

  if (!baseUrl || !model) {
    throw new Error('CHAT_BASE_URL and CHAT_MODEL must be set.')
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.1,
      max_tokens:  options.max_tokens  ?? 800,
      top_p:       options.top_p       ?? 0.9,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Chat API error ${res.status}: ${body}`)
  }

  const data = await res.json() as {
    choices: { message: { content: string } }[]
  }
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('Chat API returned an empty response.')
  }

  return content
}
