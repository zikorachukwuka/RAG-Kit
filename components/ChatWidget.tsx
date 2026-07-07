'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

interface ChatWidgetProps {
  /** Label shown on the launcher button */
  buttonLabel?: string
  /** Placeholder text in the message input */
  placeholder?: string
  /** Title shown in the chat header */
  title?: string
  /** Subtitle shown below the title */
  subtitle?: string
  /** Primary accent colour (Tailwind or hex) — defaults to indigo */
  accentColor?: string
}

// ─── Session helpers ──────────────────────────────────────────────────────────

function getOrCreateSessionId(): string {
  const stored = localStorage.getItem('rag-kit-session-id')
  if (stored) return stored
  const id = crypto.randomUUID()
  localStorage.setItem('rag-kit-session-id', id)
  return id
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatWidget({
  buttonLabel = 'Chat',
  placeholder = 'Ask a question…',
  title       = 'AI Assistant',
  subtitle    = 'Powered by RAG Kit',
}: ChatWidgetProps) {
  const [open,           setOpen]           = useState(false)
  const [messages,       setMessages]       = useState<Message[]>([])
  const [input,          setInput]          = useState('')
  const [loading,        setLoading]        = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [initializing,   setInitializing]   = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when chat opens
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Initialize conversation when chat opens for the first time
  const initConversation = useCallback(async () => {
    if (conversationId) return
    setInitializing(true)
    setError(null)
    try {
      const sessionId = getOrCreateSessionId()
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start conversation.')
      setConversationId(data.conversation_id)
      setMessages(data.messages || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setInitializing(false)
    }
  }, [conversationId])

  useEffect(() => {
    if (open) initConversation()
  }, [open, initConversation])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || !conversationId || loading) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, message: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to get a response.')

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.ai_response,
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* ── Launcher button ───────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close chat' : 'Open chat'}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-3 text-sm font-medium text-white shadow-lg transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        {open
          ? <X className="h-4 w-4" />
          : <><MessageCircle className="h-4 w-4" /><span>{buttonLabel}</span></>
        }
      </button>

      {/* ── Chat panel ────────────────────────────────────────────────────── */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 flex w-80 flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl sm:w-96">

          {/* Header */}
          <div className="flex items-center justify-between rounded-t-2xl bg-indigo-600 px-4 py-3">
            <div>
              <p className="font-semibold text-white">{title}</p>
              <p className="text-xs text-indigo-200">{subtitle}</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-full p-1 text-indigo-200 hover:bg-indigo-500 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4" style={{ maxHeight: '360px' }}>
            {initializing && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Starting conversation…</span>
              </div>
            )}

            {messages.length === 0 && !initializing && (
              <p className="text-sm text-gray-400">Ask me anything to get started.</p>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl bg-gray-100 px-3 py-2">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={1}
                disabled={loading || initializing}
                className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:opacity-50"
                style={{ maxHeight: '96px' }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading || initializing}
                aria-label="Send message"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-gray-300">
              Built with RAG Kit · Press Enter to send
            </p>
          </div>
        </div>
      )}
    </>
  )
}
