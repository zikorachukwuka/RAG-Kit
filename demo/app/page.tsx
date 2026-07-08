import ChatWidget from '@/components/ChatWidget'

const SAMPLE_QUESTIONS = [
  'When is PAYE due each month?',
  'Does pension apply to casual workers?',
  'What is the NSITF rate for employers?',
  'Is NHF mandatory for private companies?',
  'What WHT rate applies to contractor payments?',
  'What is the current minimum wage in Nigeria?',
]

const STEPS = [
  {
    num: '01',
    title: 'Run the schema',
    desc: 'Copy schema.sql and run it against any Postgres database with pgvector enabled.',
  },
  {
    num: '02',
    title: 'Configure your providers',
    desc: 'Set EMBEDDING_BASE_URL, EMBEDDING_MODEL, CHAT_BASE_URL, and CHAT_MODEL. Any OpenAI-compatible provider works.',
  },
  {
    num: '03',
    title: 'Ingest your documents',
    desc: 'Drop .txt or .md files in a folder and run the ingest script to embed them.',
  },
  {
    num: '04',
    title: 'Add the widget',
    desc: 'Drop ChatWidget.tsx into your layout. Ship.',
  },
]

const TOPICS = ['PAYE', 'Pension', 'NSITF', 'NHF', 'WHT', 'Minimum Wage']

export default function HomePage() {
  return (
    <>
      <div className="dot-bg min-h-screen">
        <div className="hero-glow" />

        {/* Nav */}
        <nav className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span
              className="text-sm font-medium"
              style={{ color: 'rgba(255,255,255,0.6)' }}
            >
              Nigerian HR Compliance AI
            </span>
          </div>
          <a
            href="https://github.com/zikorachukwuka/RAG-Kit"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/25 transition-colors hover:text-white/50"
          >
            GitHub ↗
          </a>
        </nav>

        {/* Hero */}
        <section className="relative z-10 mx-auto max-w-4xl px-6 pb-16 pt-20 text-center">
          {/* RAG Kit badge */}
          <a
            href="https://github.com/zikorachukwuka/RAG-Kit"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-8 inline-flex items-center rounded-full px-4 py-1.5 text-xs font-medium transition-colors"
            style={{
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.45)',
            }}
          >
            This demo was built with RAG Kit ↗
          </a>

          {/* Headline */}
          <h1
            className="text-5xl font-light leading-tight tracking-tight sm:text-7xl"
            style={{
              fontFamily: 'var(--font-display), Georgia, serif',
              color: 'rgba(255,255,255,0.92)',
            }}
          >
            Nigerian HR compliance,
            <br />
            <span style={{ color: '#4ade80' }}>answered.</span>
          </h1>

          {/* Subline */}
          <p
            className="mx-auto mt-6 max-w-md text-base leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            Ask questions about PAYE, Pension, NHF, NSITF, and WHT obligations.
            Grounded in current Nigerian Tax Act regulations.
          </p>

          {/* Topic pills */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {TOPICS.map((t) => (
              <span
                key={t}
                className="rounded-full px-3 py-1 text-xs"
                style={{
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.35)',
                }}
              >
                {t}
              </span>
            ))}
          </div>

          <p className="mt-6 text-xs" style={{ color: 'rgba(255,255,255,0.18)' }}>
            General information only · Not legal advice
          </p>
        </section>

        {/* Sample questions */}
        <section className="relative z-10 mx-auto max-w-xl px-6 pb-24">
          <p
            className="mb-6 text-center text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'rgba(255,255,255,0.18)' }}
          >
            Try asking
          </p>
          <ul className="space-y-2">
            {SAMPLE_QUESTIONS.map((q) => (
              <li
                key={q}
                className="q-card flex cursor-default items-center gap-3 rounded-xl px-5 py-4 text-sm"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                <span className="font-mono text-xs" style={{ color: 'rgba(74,222,128,0.5)' }}>
                  →
                </span>
                {q}
              </li>
            ))}
          </ul>
        </section>

        {/* How it works */}
        <section
          className="divider relative z-10 border-t px-6 py-20"
        >
          <div className="mx-auto max-w-3xl">
            <p
              className="mb-3 text-center text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.18)' }}
            >
              For developers
            </p>
            <h2
              className="mb-12 text-center text-2xl font-light"
              style={{
                fontFamily: 'var(--font-display), Georgia, serif',
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              Add this to your own project
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {STEPS.map(({ num, title, desc }) => (
                <div key={num} className="step-card rounded-2xl p-6">
                  <span
                    className="text-4xl font-light"
                    style={{
                      fontFamily: 'var(--font-display), Georgia, serif',
                      color: 'rgba(255,255,255,0.08)',
                    }}
                  >
                    {num}
                  </span>
                  <p
                    className="mt-3 text-sm font-medium"
                    style={{ color: 'rgba(255,255,255,0.65)' }}
                  >
                    {title}
                  </p>
                  <p
                    className="mt-1 text-xs leading-relaxed"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    {desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <a
                href="https://github.com/zikorachukwuka/RAG-Kit"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm transition-all"
                style={{
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                View RAG Kit on GitHub →
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="divider relative z-10 border-t px-6 py-8">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.18)' }}>
              © 2026 Zikora Chukwuka
            </span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.18)' }}>
              MIT License
            </span>
          </div>
        </footer>
      </div>

      <ChatWidget
        title="Nigerian HR Compliance AI"
        subtitle="General information only · Not legal advice"
        buttonLabel="Ask a question"
        placeholder="e.g. When is PAYE due?"
      />
    </>
  )
}
