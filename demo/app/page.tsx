import ChatWidget from '@/components/ChatWidget'

const SAMPLE_QUESTIONS = [
  'When is PAYE due each month?',
  'Does pension apply to casual workers?',
  'What is the NSITF rate for employers?',
  'Is NHF mandatory for private companies?',
  'What WHT rate applies to contractor payments?',
  'What is the current minimum wage in Nigeria?',
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50">

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <a
          href="https://github.com/zikorachukwuka/RAG-Kit"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-200 transition"
        >
          Built with RAG Kit — view on GitHub →
        </a>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Nigeria Compliance AI
        </h1>
        <p className="mt-4 text-lg text-gray-500">
          Ask questions about Nigerian statutory obligations — PAYE, Pension, NHF,
          NSITF, and WHT. Accurate answers grounded in up-to-date compliance documentation.
        </p>
        <p className="mt-3 text-sm text-gray-400">
          General information only. Verify all obligations with a qualified professional.
        </p>
      </section>

      {/* Sample questions */}
      <section className="mx-auto max-w-2xl px-6 pb-24">
        <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wider text-gray-400">
          Try asking
        </h2>
        <ul className="space-y-2">
          {SAMPLE_QUESTIONS.map((q) => (
            <li
              key={q}
              className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
            >
              {q}
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section className="border-t border-gray-100 bg-white px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
            Add this to your own project
          </h2>
          <p className="mb-10 text-center text-sm text-gray-400">
            This demo was built with RAG Kit — a copy-paste RAG system for Next.js.
          </p>
          <ol className="space-y-6">
            {[
              { step: '1', title: 'Run the schema', body: 'Copy schema.sql and run it against any Postgres database with pgvector enabled.' },
              { step: '2', title: 'Configure your providers', body: 'Copy .env.example, set EMBEDDING_BASE_URL, EMBEDDING_MODEL, CHAT_BASE_URL, and CHAT_MODEL. Any OpenAI-compatible provider works.' },
              { step: '3', title: 'Ingest your documents', body: 'Drop your .txt or .md files in a folder and run: npm run ingest -- ./your-docs' },
              { step: '4', title: 'Drop in the widget', body: 'Copy ChatWidget.tsx into your project and add <ChatWidget /> to your layout. Done.' },
            ].map(({ step, title, body }) => (
              <li key={step} className="flex gap-4">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">{step}</span>
                <div>
                  <p className="font-semibold text-gray-900">{title}</p>
                  <p className="mt-1 text-sm text-gray-500">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-10 text-center">
            <a
              href="https://github.com/zikorachukwuka/RAG-Kit"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-700 transition"
            >
              View RAG Kit on GitHub →
            </a>
          </div>
        </div>
      </section>

      <ChatWidget
        title="Nigeria Compliance AI"
        subtitle="General information only · Not legal advice"
        buttonLabel="Ask a question"
        placeholder="e.g. When is PAYE due?"
      />
    </main>
  )
}
