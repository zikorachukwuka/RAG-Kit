#!/usr/bin/env tsx
/**
 * RAG Kit — Document Ingestion Script
 *
 * Usage:
 *   npm run ingest -- ./docs
 *   npm run ingest -- ./docs --clear   (wipe existing knowledge base first)
 *
 * Supported file types: .txt, .md
 * Place your documents in a folder and point this script at it.
 *
 * The script will:
 *   1. Read every supported file in the folder (recursively)
 *   2. Chunk each file into overlapping segments
 *   3. Embed each chunk using your configured embedding provider
 *   4. Insert into the knowledge_base table
 *   5. Record the embedding model in rag_config for mismatch detection
 */

import fs   from 'fs'
import path from 'path'
import postgres from 'postgres'

// ─── Load .env.local / .env ───────────────────────────────────────────────────
// Next.js loads these automatically; this script runs outside Next.js so we
// parse them ourselves. Already-set env vars are never overwritten.
for (const envFile of ['.env.local', '.env']) {
  const envPath = path.resolve(process.cwd(), envFile)
  if (!fs.existsSync(envPath)) continue
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim()
    if (!(key in process.env)) process.env[key] = val
  }
}

// ─── Config ──────────────────────────────────────────────────────────────────

const DATABASE_URL      = process.env.DATABASE_URL
const EMBEDDING_BASE_URL = process.env.EMBEDDING_BASE_URL
const EMBEDDING_MODEL    = process.env.EMBEDDING_MODEL
const EMBEDDING_API_KEY  = process.env.EMBEDDING_API_KEY

if (!DATABASE_URL)      { console.error('❌  DATABASE_URL is not set.');       process.exit(1) }
if (!EMBEDDING_BASE_URL){ console.error('❌  EMBEDDING_BASE_URL is not set.'); process.exit(1) }
if (!EMBEDDING_MODEL)   { console.error('❌  EMBEDDING_MODEL is not set.');    process.exit(1) }

const CHUNK_SIZE    = 1000  // characters per chunk
const CHUNK_OVERLAP = 200   // overlap between consecutive chunks
const BATCH_SIZE    = 20    // embed N chunks per API call

// ─── Database ─────────────────────────────────────────────────────────────────

const sql = postgres(DATABASE_URL!, { max: 3, ssl: 'require' })

// ─── Helpers ──────────────────────────────────────────────────────────────────

function chunkText(text: string): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length)
    chunks.push(text.slice(start, end).trim())
    start += CHUNK_SIZE - CHUNK_OVERLAP
  }
  return chunks.filter((c) => c.length > 50) // skip tiny trailing chunks
}

function collectFiles(dir: string): string[] {
  const results: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath))
    } else if (['.txt', '.md'].includes(path.extname(entry.name).toLowerCase())) {
      results.push(fullPath)
    }
  }
  return results
}

async function embedBatch(inputs: string[], retries = 3): Promise<number[][]> {
  const res = await fetch(`${EMBEDDING_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(EMBEDDING_API_KEY ? { Authorization: `Bearer ${EMBEDDING_API_KEY}` } : {}),
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: inputs }),
  })

  if (res.status === 429 && retries > 0) {
    const wait = 25000
    process.stdout.write(`\n   ⏳  Rate limited — waiting ${wait / 1000}s before retry...\r`)
    await new Promise((r) => setTimeout(r, wait))
    return embedBatch(inputs, retries - 1)
  }

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Embedding API error ${res.status}: ${body}`)
  }

  const data = await res.json() as { data: { embedding: number[]; index: number }[] }
  // Preserve original order
  return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args    = process.argv.slice(2)
  const docsDir = args.find((a) => !a.startsWith('--'))
  const clear   = args.includes('--clear')

  if (!docsDir) {
    console.error('Usage: npm run ingest -- <docs-folder> [--clear]')
    process.exit(1)
  }

  if (!fs.existsSync(docsDir)) {
    console.error(`❌  Folder not found: ${docsDir}`)
    process.exit(1)
  }

  console.log(`\n🔍  Scanning: ${path.resolve(docsDir)}`)
  const files = collectFiles(docsDir)
  console.log(`📄  Found ${files.length} file(s)\n`)

  if (files.length === 0) {
    console.log('No .txt or .md files found. Nothing to ingest.')
    await sql.end()
    return
  }

  // Check embedding model consistency
  const [existingConfig] = await sql<{ value: string }[]>`
    SELECT value FROM rag_config WHERE key = 'embedding_model'
  `
  if (existingConfig && existingConfig.value !== EMBEDDING_MODEL) {
    console.error(
      `❌  Model mismatch!\n` +
      `    Knowledge base was embedded with: ${existingConfig.value}\n` +
      `    Current EMBEDDING_MODEL is:        ${EMBEDDING_MODEL}\n\n` +
      `    Run with --clear to wipe and re-embed with the new model.`
    )
    await sql.end()
    process.exit(1)
  }

  if (clear) {
    console.log('🗑️   Clearing existing knowledge base...')
    await sql`TRUNCATE knowledge_base`
    await sql`DELETE FROM rag_config WHERE key = 'embedding_model'`
    console.log('✅  Cleared.\n')
  }

  let totalChunks = 0
  let totalInserted = 0

  for (const filePath of files) {
    const fileName = path.basename(filePath)
    const title    = path.basename(filePath, path.extname(filePath)).replace(/[-_]/g, ' ')
    const rawText  = fs.readFileSync(filePath, 'utf-8')
    const chunks   = chunkText(rawText)

    console.log(`📝  ${fileName} → ${chunks.length} chunk(s)`)
    totalChunks += chunks.length

    // Process in batches to avoid hitting API rate limits
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch    = chunks.slice(i, i + BATCH_SIZE)
      const embeddings = await embedBatch(batch)

      const rows = batch.map((content, idx) => ({
        title,
        content,
        source: filePath,
        embedding: `[${embeddings[idx].join(',')}]`,
      }))

      for (const row of rows) {
        await sql`
          INSERT INTO knowledge_base (title, content, source, embedding)
          VALUES (
            ${row.title},
            ${row.content},
            ${row.source},
            ${row.embedding}::vector
          )
        `
        totalInserted++
      }

      process.stdout.write(`   ${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length} chunks embedded\r`)
    }
    console.log() // newline after the progress line
  }

  // Record the embedding model used
  await sql`
    INSERT INTO rag_config (key, value)
    VALUES ('embedding_model', ${EMBEDDING_MODEL!})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `

  console.log(`\n✅  Done! Inserted ${totalInserted}/${totalChunks} chunks.`)
  console.log(`🧠  Embedding model recorded: ${EMBEDDING_MODEL}`)

  await sql.end()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
