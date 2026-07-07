import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { embedOne } from '@/lib/embeddings'
import { chat, type ChatMessage } from '@/lib/chat'
import {
  SYSTEM_PROMPT,
  KNOWLEDGE_CONTEXT_SLOT,
  NO_CONTEXT_MESSAGE,
} from '@/config/system-prompt'

const MATCH_THRESHOLD = parseFloat(process.env.MATCH_THRESHOLD ?? '0.7')
const MATCH_COUNT      = parseInt(process.env.MATCH_COUNT      ?? '5', 10)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { conversation_id, message } = body as {
      conversation_id?: string
      message?: string
    }

    if (!conversation_id || !message?.trim()) {
      return NextResponse.json(
        { error: 'conversation_id and message are required.' },
        { status: 400 }
      )
    }

    // 1. Verify conversation exists
    const [conversation] = await sql`
      SELECT id FROM conversations WHERE id = ${conversation_id} LIMIT 1
    `
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 })
    }

    // 2. Fetch recent history BEFORE saving the new message
    //    (prevents sending the current message twice to the model)
    const history = await sql<{ role: string; content: string }[]>`
      SELECT role, content
      FROM messages
      WHERE conversation_id = ${conversation_id}
      ORDER BY created_at ASC
      LIMIT 12
    `

    // 3. Save the user message
    await sql`
      INSERT INTO messages (conversation_id, role, content)
      VALUES (${conversation_id}, 'user', ${message})
    `

    // 4. RAG — embed the query and retrieve relevant chunks
    let knowledgeContext = ''
    try {
      const queryEmbedding = await embedOne(message)
      // pgvector expects the embedding as a literal array string
      const embeddingLiteral = `[${queryEmbedding.join(',')}]`

      const matches = await sql<{ title: string; content: string; score: number }[]>`
        SELECT title, content, score
        FROM match_knowledge_base(
          ${embeddingLiteral}::vector,
          ${MATCH_THRESHOLD},
          ${MATCH_COUNT}
        )
      `

      if (matches.length > 0) {
        knowledgeContext = matches
          .map((m) => `### ${m.title}\n${m.content}`)
          .join('\n\n')
      }
    } catch (ragError) {
      // RAG failure is non-fatal — fall through to answer without context
      console.error('RAG retrieval error:', ragError)
    }

    // 5. Build system prompt
    const contextSection = knowledgeContext || NO_CONTEXT_MESSAGE
    const systemPrompt   = SYSTEM_PROMPT.replace(KNOWLEDGE_CONTEXT_SLOT, contextSection)

    // 6. Build messages array
    const chatMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ]

    // 7. Call the chat model
    const aiResponse = await chat(chatMessages)

    // 8. Log gap if no knowledge base context was found
    if (!knowledgeContext) {
      await sql`
        INSERT INTO ai_gaps (question, conversation_id)
        VALUES (${message}, ${conversation_id})
      `.catch((e) => console.error('Failed to log gap:', e))
    }

    // 9. Save AI response
    await sql`
      INSERT INTO messages (conversation_id, role, content)
      VALUES (${conversation_id}, 'assistant', ${aiResponse})
    `

    return NextResponse.json({ ai_response: aiResponse })
  } catch (err) {
    console.error('Chat route error:', err)
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
