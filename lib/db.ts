import postgres from 'postgres'

// Single shared connection — Next.js hot-reload safe.
// Works with Supabase, Neon, Railway, or any Postgres with pgvector.
const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. See .env.example for setup instructions.')
}

const sql = postgres(connectionString, {
  // Reduce connections in serverless environments.
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
})

export default sql
