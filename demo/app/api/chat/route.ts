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

    // 1. Fetch conversation and history in parallel
    const [[conversation], history] = await Promise.all([
      sql`SELECT id FROM conversations WHERE id = ${conversation_id} LIMIT 1`,
      sql<{ role: string; content: string }[]>`
        SELECT role, content
        FROM messages
        WHERE conversation_id = ${conversation_id}
        ORDER BY created_at ASC
        LIMIT 12
      `,
    ])

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 })
    }

    // 2. Save user message and embed query in parallel
    const [, queryEmbedding] = await Promise.all([
      sql`INSERT INTO messages (conversation_id, role, content)
          VALUES (${conversation_id}, 'user', ${message})`,
      embedOne(message).catch((e) => {
        console.error('Embedding error:', e)
        return null
      }),
    ])

    // 3. RAG — retrieve relevant chunks (needs embedding result)
    let knowledgeContext = ''
    if (queryEmbedding) {
      try {
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
    }

    // 4. Build system prompt and messages
    const contextSection = knowledgeContext || NO_CONTEXT_MESSAGE
    const systemPrompt   = SYSTEM_PROMPT.replace(KNOWLEDGE_CONTEXT_SLOT, contextSection)

    const chatMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ]

    // 5. Call the chat model
    let aiResponse: string
    try {
      aiResponse = await chat(chatMessages)
    } catch (aiError) {
      console.error('AI provider error:', aiError)
      const fallback = "I'm having trouble connecting right now. Please try again in a moment."
      await sql`
        INSERT INTO messages (conversation_id, role, content)
        VALUES (${conversation_id}, 'assistant', ${fallback})
      `.catch(() => {})
      return NextResponse.json({ ai_response: fallback })
    }

    // 6. Save AI response and log gap in parallel
    await Promise.all([
      sql`INSERT INTO messages (conversation_id, role, content)
          VALUES (${conversation_id}, 'assistant', ${aiResponse})`,
      knowledgeContext
        ? Promise.resolve()
        : sql`INSERT INTO ai_gaps (question, conversation_id)
              VALUES (${message}, ${conversation_id})`.catch((e) =>
            console.error('Failed to log gap:', e)
          ),
    ])

    return NextResponse.json({ ai_response: aiResponse })
  } catch (err) {
    console.error('Chat route error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
