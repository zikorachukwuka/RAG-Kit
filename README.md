# RAG Kit

A copy-paste RAG system for Next.js developers. Drop it into any project, point it at your documents, and ship a production-grade AI assistant in an afternoon.

**[→ See the live demo](https://rag-kit-demo.vercel.app)**, a Nigerian HR Compliance AI built entirely with RAG Kit.

---

## What it is

RAG Kit is a collection of files you copy into your Next.js project and own. No package to install, no framework to fight. Just clean, well-structured TypeScript you understand and control, inspired by the [shadcn/ui](https://ui.shadcn.com) distribution model.

### What you get

| File | What it does |
|---|---|
| `schema.sql` | Full Postgres + pgvector setup in one command |
| `lib/db.ts` | Postgres connection that works with Supabase, Neon, Railway, or any provider |
| `lib/embeddings.ts` | OpenAI-compatible embedding adapter |
| `lib/chat.ts` | OpenAI-compatible chat adapter |
| `app/api/chat/route.ts` | Chat route handling RAG retrieval, AI response, and gap logging |
| `app/api/conversations/route.ts` | Conversation management |
| `components/ChatWidget.tsx` | Drop-in React chat widget |
| `config/system-prompt.ts` | Edit this to give the AI its name, persona, and domain rules |
| `scripts/ingest.ts` | CLI tool to embed and load your documents |

---

## Provider-agnostic by design

RAG Kit speaks the OpenAI API format for both embeddings and chat. Any compatible provider works, configured entirely through environment variables.

```bash
# Embedding — any /v1/embeddings compatible endpoint
EMBEDDING_BASE_URL=https://api.openai.com/v1
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_API_KEY=sk-...

# Chat — any /v1/chat/completions compatible endpoint
CHAT_BASE_URL=https://openrouter.ai/api/v1
CHAT_MODEL=google/gemini-2.5-flash
CHAT_API_KEY=sk-or-...
```

Swap providers by changing two environment variables. The code never changes.

---

## Setup

### 1. Copy the files

Copy these into your Next.js project, preserving the folder structure:

```
schema.sql
postcss.config.mjs
lib/db.ts
lib/embeddings.ts
lib/chat.ts
app/api/chat/route.ts
app/api/conversations/route.ts
components/ChatWidget.tsx
config/system-prompt.ts
scripts/ingest.ts
```

### 2. Install the one dependency

```bash
npm install postgres
```

### 3. Set up your database

Run `schema.sql` against any Postgres instance with pgvector:

```bash
# Supabase: paste into SQL Editor and run
# Neon / Railway:
psql $DATABASE_URL -f schema.sql
```

> **Important:** The default vector dimension in `schema.sql` is `1536` (OpenAI `text-embedding-3-small`).
> If you use a different model, update the `VECTOR(1536)` column before running the schema.
> See `.env.example` for dimension reference by model.

### 4. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your values.

### 5. Ingest your documents

Place your `.txt` or `.md` files in a folder and run:

```bash
npx tsx scripts/ingest.ts ./your-docs
```

To clear and re-ingest (required when switching embedding models):

```bash
npx tsx scripts/ingest.ts ./your-docs --clear
```

### 6. Add the widget

```tsx
// app/layout.tsx
import ChatWidget from '@/components/ChatWidget'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <ChatWidget
          title="Your Assistant"
          subtitle="Ask me anything"
          buttonLabel="Chat"
        />
      </body>
    </html>
  )
}
```

### 7. Customise the system prompt

Edit `config/system-prompt.ts` to give the AI its name, persona, and domain-specific rules. This is the most important customisation and it's what makes the assistant feel like yours.

---

## Gap logging

Every question your knowledge base can't answer is automatically logged to the `ai_gaps` table. Query it weekly to know exactly what to add:

```sql
SELECT question, created_at
FROM ai_gaps
ORDER BY created_at DESC
LIMIT 50;
```

This is how your knowledge base gets smarter over time.

---

## Switching embedding providers

Because you own the code, switching providers means two steps:

1. Update `EMBEDDING_BASE_URL` and `EMBEDDING_MODEL` in your environment
2. Re-ingest your documents: `npx tsx scripts/ingest.ts ./your-docs --clear`

The `--clear` flag wipes the existing vectors and re-embeds everything with the new model. This is required because vectors from different models are not interchangeable.

---

## Database

RAG Kit requires Postgres with the pgvector extension. Any provider works:

- **[Supabase](https://supabase.com)** — enable pgvector in the extensions panel. Free tier available.
- **[Neon](https://neon.tech)** — pgvector supported. Serverless-friendly.
- **[Railway](https://railway.app)** — add the pgvector plugin to your Postgres instance.
- Self-hosted Postgres — `CREATE EXTENSION IF NOT EXISTS vector;`

---

## Demo

The `demo/` folder in this repo is a complete Next.js app built with RAG Kit — a Nigerian HR and compliance chatbot. It's deployed at [rag-kit-demo.vercel.app](https://rag-kit-demo.vercel.app).

To run the demo locally:

```bash
cd demo
npm install
cp .env.example .env.local
# fill in your keys
npm run dev
```

---

## License

MIT — use it, fork it, ship it.
