import { NextResponse } from 'next/server'
import sql from '@/lib/db'

// POST /api/conversations
// Body: { session_id: string }
// Creates a new conversation for the session, or returns the most recent active one.
// session_id is a UUID you generate client-side and persist in localStorage.

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { session_id } = body as { session_id?: string }

    if (!session_id) {
      return NextResponse.json(
        { error: 'session_id is required.' },
        { status: 400 }
      )
    }

    // Check for an existing active conversation for this session
    const [existing] = await sql<{ id: string; status: string }[]>`
      SELECT id, status
      FROM conversations
      WHERE session_id = ${session_id}
        AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (existing) {
      const messages = await sql<
        { id: string; role: string; content: string; created_at: string }[]
      >`
        SELECT id, role, content, created_at
        FROM messages
        WHERE conversation_id = ${existing.id}
        ORDER BY created_at ASC
      `
      return NextResponse.json({
        conversation_id: existing.id,
        status: existing.status,
        messages,
      })
    }

    // Create a new conversation
    const [conversation] = await sql<{ id: string }[]>`
      INSERT INTO conversations (session_id, status)
      VALUES (${session_id}, 'active')
      RETURNING id
    `

    return NextResponse.json({
      conversation_id: conversation.id,
      status: 'active',
      messages: [],
    })
  } catch (err) {
    console.error('Conversations route error:', err)
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
