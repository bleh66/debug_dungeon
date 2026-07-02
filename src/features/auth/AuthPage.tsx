import { useState } from 'react'

type AuthMode = 'login' | 'signup'

const modeCopy: Record<AuthMode, { eyebrow: string; title: string; description: string; submitLabel: string }> = {
  login: {
    eyebrow: 'Operator access',
    title: 'Enter the command deck',
    description: 'Resume your run, review incidents, and keep climbing through the engineering campaign.',
    submitLabel: 'Launch session',
  },
  signup: {
    eyebrow: 'New recruit',
    title: 'Create your operator profile',
    description: 'Set up a new account and start your first incident from the command center.',
    submitLabel: 'Create account',
  },
}

const timeline = [
  'Learn through real-life scenarios and guided practice',
  'Has AI mentoring for doubt clarification and feedback',
]

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const copy = modeCopy[mode]

  return (
    <main className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-4 sm:px-6 lg:px-8">
        <section className="grid w-full gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border border-[rgba(253,254,194,0.12)] bg-[color:var(--panel)] p-5 shadow-[0_18px_0_rgba(0,0,0,0.18)] sm:p-6">
            <div className="flex flex-col gap-6">
              <header className="space-y-3 border-b border-[rgba(253,254,194,0.08)] pb-5">
                <p className="pixel-font text-[0.6rem] uppercase tracking-[0.16em] text-[color:var(--primary)]">
                  Engineer&apos;s Quest
                </p>
                <div className="space-y-3">
                  <div className="inline-flex gap-2 border border-[rgba(58,155,141,0.45)] bg-[rgba(58,155,141,0.16)] p-1 text-[0.6rem] uppercase tracking-[0.14em] pixel-font">
                    <button
                      className={`px-3 py-2 transition ${mode === 'login' ? 'bg-[color:var(--primary)] text-[color:var(--text)]' : 'text-[rgba(253,254,194,0.7)]'}`}
                      onClick={() => setMode('login')}
                      type="button"
                    >
                      Login
                    </button>
                    <button
                      className={`px-3 py-2 transition ${mode === 'signup' ? 'bg-[color:var(--primary)] text-[color:var(--text)]' : 'text-[rgba(253,254,194,0.7)]'}`}
                      onClick={() => setMode('signup')}
                      type="button"
                    >
                      Sign up
                    </button>
                  </div>
                  <div className="space-y-3">
                    <p className="pixel-font text-[0.75rem] uppercase tracking-[0.14em] text-[color:var(--text)]">
                      {copy.eyebrow}
                    </p>
                    <h1 className="pixel-font max-w-xl text-[1.45rem] uppercase leading-[1.4] sm:text-[1.85rem]">
                      {copy.title}
                    </h1>
                    <p className="max-w-2xl text-sm leading-7 text-[color:var(--muted)] sm:text-base">
                      {copy.description}
                    </p>
                  </div>
                </div>
              </header>

              <form className="grid gap-4">
                <label className="grid gap-2 text-sm uppercase tracking-[0.14em] text-[color:var(--text)]/80">
                  Handle
                  <input
                    className="h-12 border border-[rgba(253,254,194,0.16)] bg-[rgba(0,0,0,0.2)] px-4 text-base text-[color:var(--text)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--primary)]"
                    placeholder="ashwin"
                    type="text"
                  />
                </label>

                <label className="grid gap-2 text-sm uppercase tracking-[0.14em] text-[color:var(--text)]/80">
                  Access code
                  <input
                    className="h-12 border border-[rgba(253,254,194,0.16)] bg-[rgba(0,0,0,0.2)] px-4 text-base text-[color:var(--text)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--primary)]"
                    placeholder="••••••••"
                    type="password"
                  />
                </label>

                {mode === 'signup' && (
                  <label className="grid gap-2 text-sm uppercase tracking-[0.14em] text-[color:var(--text)]/80">
                    Guild name
                    <input
                      className="h-12 border border-[rgba(253,254,194,0.16)] bg-[rgba(0,0,0,0.2)] px-4 text-base text-[color:var(--text)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--primary)]"
                      placeholder="incident response"
                      type="text"
                    />
                  </label>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    className="min-h-12 border border-[rgba(253,254,194,0.16)] bg-[linear-gradient(180deg,#3faca0,var(--primary))] px-5 pixel-font text-[0.68rem] uppercase tracking-[0.14em] text-[color:var(--text)] transition hover:-translate-y-0.5"
                    type="submit"
                  >
                    {copy.submitLabel}
                  </button>
                  <button
                    className="min-h-12 border border-[rgba(143,42,49,0.45)] bg-[rgba(143,42,49,0.14)] px-5 pixel-font text-[0.68rem] uppercase tracking-[0.14em] text-[color:var(--text)] transition hover:-translate-y-0.5"
                    type="button"
                  >
                    View demo
                  </button>
                </div>
              </form>
            </div>
          </div>

          <aside className="border border-[rgba(253,254,194,0.12)] bg-[color:var(--panel-strong)] p-5 shadow-[0_18px_0_rgba(0,0,0,0.18)] sm:p-6">
            <div className="flex h-full flex-col gap-5">
              <div className="space-y-3 border-b border-[rgba(253,254,194,0.08)] pb-5">
                <p className="pixel-font text-[0.6rem] uppercase tracking-[0.16em] text-[rgba(253,254,194,0.7)]">
                  Command status
                </p>
                <h2 className="pixel-font text-[1rem] uppercase leading-6 text-[color:var(--text)] sm:text-[1.1rem]">
                  Start with the login screen, then unlock the mission board.
                </h2>
              </div>

              <div className="grid gap-3">
                {timeline.map((item) => (
                  <div
                    className="border border-[rgba(253,254,194,0.1)] bg-[rgba(0,0,0,0.12)] px-4 py-3 text-sm text-[color:var(--muted)]"
                    key={item}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}
