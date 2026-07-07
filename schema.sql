-- RAG Kit — Complete Database Schema
-- Run this once against any Postgres instance that has the pgvector extension.
--
-- Supabase: SQL Editor → paste and run
-- Neon / Railway: psql $DATABASE_URL -f schema.sql
-- Local:  psql -U postgres -d yourdb -f schema.sql

-- ─── Enable pgvector ─────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Config ───────────────────────────────────────────────────────────────────
-- Stores the embedding model name used during ingestion.
-- The chat route reads this and refuses to run if EMBEDDING_MODEL doesn't match,
-- preventing silent dimension mismatches when you switch providers.
CREATE TABLE IF NOT EXISTS rag_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ─── Knowledge Base ───────────────────────────────────────────────────────────
-- Each row is one chunk of a document, with its embedding vector.
--
-- IMPORTANT: The vector dimension (1536) must match your EMBEDDING_MODEL.
-- Change 1536 to the correct dimension before running this schema:
--   text-embedding-3-small  → 1536
--   text-embedding-3-large  → 3072
--   voyage-3-lite           → 512
--   nomic-embed-text        → 768
--
-- If you change models later, DROP and recreate this table, then re-run ingest.
CREATE TABLE IF NOT EXISTS knowledge_base (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT        NOT NULL,
  content    TEXT        NOT NULL,
  source     TEXT,                         -- e.g. filename or URL
  metadata   JSONB       DEFAULT '{}',
  embedding  VECTOR(1536) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- IVFFlat index for fast approximate nearest-neighbour search.
-- Rebuild this index after large ingestion runs:
--   REINDEX INDEX knowledge_base_embedding_idx;
CREATE INDEX IF NOT EXISTS knowledge_base_embedding_idx
  ON knowledge_base
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ─── Conversations ────────────────────────────────────────────────────────────
-- A conversation is a thread tied to an anonymous session_id (UUID).
-- You can extend this with user_id or any other identifier you need.
CREATE TABLE IF NOT EXISTS conversations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID        NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'active',  -- active | resolved
  metadata   JSONB       DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS conversations_session_idx
  ON conversations (session_id);

-- ─── Messages ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT        NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_conversation_idx
  ON messages (conversation_id, created_at);

-- ─── AI Gaps ──────────────────────────────────────────────────────────────────
-- Every question the knowledge base couldn't answer gets logged here.
-- Review this table weekly to know exactly what to add to your knowledge base.
CREATE TABLE IF NOT EXISTS ai_gaps (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  question        TEXT        NOT NULL,
  conversation_id UUID        REFERENCES conversations(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Vector Similarity Search Function ───────────────────────────────────────
-- Called by the chat route to retrieve relevant knowledge base chunks.
CREATE OR REPLACE FUNCTION match_knowledge_base(
  query_embedding  VECTOR,
  match_threshold  FLOAT    DEFAULT 0.7,
  match_count      INT      DEFAULT 5
)
RETURNS TABLE (
  id       UUID,
  title    TEXT,
  content  TEXT,
  source   TEXT,
  metadata JSONB,
  score    FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    kb.id,
    kb.title,
    kb.content,
    kb.source,
    kb.metadata,
    1 - (kb.embedding <=> query_embedding) AS score
  FROM knowledge_base kb
  WHERE 1 - (kb.embedding <=> query_embedding) >= match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
$$;
