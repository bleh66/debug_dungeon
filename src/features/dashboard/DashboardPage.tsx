import { useState } from 'react'

type Scenario = {
  title: string
  level: string
  track: string
  summary: string
  difficulty: string
  xpReward: string
}

const sidebarSections = [
  {
    label: 'Home',
    icon: 'H',
    active: true,
  },
  {
    label: 'Account',
    icon: 'A',
    active: false,
  },
  {
    label: 'Frontend',
    icon: 'F',
    active: false,
  },
  {
    label: 'Backend',
    icon: 'B',
    active: false,
  },
]

const scenarios: Scenario[] = [
  {
    title: 'Landing page rescue',
    level: 'Scenario 01',
    track: 'Frontend',
    summary: 'Fix layout drift, tighten spacing, and restore visual consistency under pressure.',
    difficulty: '★★☆☆☆',
    xpReward: '100 XP',
  },
  {
    title: 'API gateway triage',
    level: 'Scenario 02',
    track: 'Backend',
    summary: 'Trace a failing request path, isolate the bug, and stabilize the service chain.',
    difficulty: '★★★☆☆',
    xpReward: '140 XP',
  },
  {
    title: 'State sync breach',
    level: 'Scenario 03',
    track: 'Frontend',
    summary: 'Resolve stale client state, rerender the mission HUD, and keep the run moving.',
    difficulty: '★★★☆☆',
    xpReward: '150 XP',
  },
]

const stats = [
  {
    label: 'Active Track',
    value: 'Frontend',
    note: 'Primary mission lane',
    icon: 'F',
    tone: 'text-[color:var(--primary)]',
    panel: 'bg-[rgba(58,155,141,0.14)]',
  },
  {
    label: 'Missions Cleared',
    value: '12',
    note: 'Campaign progress',
    icon: 'M',
    tone: 'text-[color:var(--text)]',
    panel: 'bg-[rgba(0,0,0,0.14)]',
  },
  {
    label: 'Daily Streak',
    value: '4 Days',
    note: 'Momentum tracker',
    icon: 'D',
    tone: 'text-[color:var(--text)]',
    panel: 'bg-[rgba(143,42,49,0.14)]',
  },
]

export function DashboardPage() {
  const [activeScenario, setActiveScenario] = useState<Scenario>(scenarios[0])

  return (
    <main className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
      <div className="mx-auto flex min-h-screen  max-w-[1200px] gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <aside className="w-[224px]  min-h-[calc(100vh-2rem)] flex-none border border-[rgba(253,254,194,0.12)] bg-[color:var(--panel)] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.25)] sm:w-[232px] sm:p-5 lg:sticky lg:top-4 lg:self-start">
          <div className="flex h-full flex-col gap-5">
            <div className="space-y-3 border-b border-[rgba(253,254,194,0.08)] pb-5">
              <p className="pixel-font text-[0.6rem] uppercase tracking-[0.16em] text-[color:var(--primary)]">
                Engineer&apos;s Quest
              </p>
              <h1 className="pixel-font text-[1rem] uppercase leading-6 text-[color:var(--text)] sm:text-[1.1rem]">
                Command dashboard
              </h1>
            </div>

            <nav className="grid gap-2">
              {sidebarSections.map((section) => (
                <button
                  className={`group relative flex items-center gap-3 overflow-hidden border px-4 py-3 text-left text-sm transition ${
                    section.active
                      ? 'border-[rgba(58,155,141,0.55)] bg-[rgba(58,155,141,0.24)] text-[color:var(--text)] shadow-[inset_3px_0_0_var(--primary)]'
                      : 'border-[rgba(253,254,194,0.12)] bg-[rgba(0,0,0,0.1)] text-[color:var(--muted)] hover:border-[rgba(253,254,194,0.22)] hover:bg-[rgba(0,0,0,0.16)] hover:text-[color:var(--text)]'
                  }`}
                  key={section.label}
                  type="button"
                >
                  <span className="flex h-6 w-6 flex-none items-center justify-center border border-[rgba(253,254,194,0.14)] bg-[rgba(0,0,0,0.18)] pixel-font text-[0.45rem] text-[color:var(--text)]">
                    {section.icon}
                  </span>
                  <span className="flex-1 text-[0.72rem] tracking-[0.08em]">{section.label}</span>
                  <span className="pixel-font text-[0.5rem] text-[color:var(--primary)]">
                    {section.active ? '01' : '00'}
                  </span>
                  {section.active && (
                    <span className="absolute inset-y-0 left-0 w-[4px] bg-[color:var(--primary)]" />
                  )}
                </button>
              ))}
            </nav>

            <div className="mt-auto border border-[rgba(253,254,194,0.1)] bg-[rgba(0,0,0,0.12)] p-3">
              <p className="pixel-font text-[0.55rem] uppercase tracking-[0.16em] text-[rgba(253,254,194,0.72)]">
                Current loadout
              </p>
              <div className="mt-2 grid gap-1 text-[0.78rem] text-[color:var(--muted)]">
                <span>Mission access: online</span>
                <span>Scenario sync: ready</span>
                <span>Guild channel: stable</span>
              </div>

           
            </div>
       <div className="mt-auto border border-[rgba(253,254,194,0.1)] bg-[rgba(0,0,0,0.12)] p-3">
            <div className="flex  flex-col justify-between gap-1 text-[0.58rem] text-[color:var(--muted)]">
          <div>
    <span className="pixel-font text-[color:var(--primary)]">User:</span>{' '}
    <span className=" pixel-font text-[rgba(253,254,194,0.72)] text-[0.58rem]">Vaishnavi</span>
  </div>

  <div>
    <span className="pixel-font text-[color:var(--primary)]">XP:</span>{' '}
    <span className=" pixel-font text-[rgba(253,254,194,0.72)] text-[0.58rem]">420</span>
  </div>

  <div>
    <span className="pixel-font text-[color:var(--primary)]">Level:</span>{' '}
    <span className=" pixel-font text-[rgba(253,254,194,0.72)] text-[0.58rem]">7</span>
  </div>

  <div>
    <span className="pixel-font text-[color:var(--primary)]">Guild:</span>{' '}
    <span className=" pixel-font text-[rgba(253,254,194,0.72)] text-[0.58rem]">Debuggers</span>
  </div>
        </div>
     </div>
    </div>
        </aside>

        <section className="min-w-0 flex-1 space-y-6">
          <section className="border border-[rgba(253,254,194,0.12)] bg-[color:var(--panel-strong)] px-5 py-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.25)] sm:px-6 sm:py-5">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="pixel-font text-[0.58rem] uppercase tracking-[0.16em] text-[rgba(253,254,194,0.72)]">
                    Campaign Progress
                  </p>
                  <h2 className="mt-2 pixel-font text-[1rem] uppercase leading-6 text-[color:var(--text)] sm:text-[1.15rem]">
                    Campaign Progress
                  </h2>
                </div>
                <div className="text-right">
                  <p className="pixel-font text-[0.58rem] uppercase tracking-[0.16em] text-[color:var(--text)]/80">
                    68% XP
                  </p>
                  <p className="mt-1 text-[0.78rem] text-[color:var(--muted)]">420 / 620 XP</p>
                </div>
              </div>

              <div className="h-2 border border-[rgba(253,254,194,0.14)] bg-[rgba(0,0,0,0.18)] p-0.5">
                <div className="h-full w-[68%] bg-[linear-gradient(90deg,#3faca0,var(--primary))]" />
              </div>

              <div className="flex flex-wrap gap-3 text-[0.74rem] text-[color:var(--muted)]">
                <span>Level 7 operator</span>
                <span>•</span>
                <span>Next reward: scenario key</span>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {stats.map((stat, index) => (
              <article
                className={`border border-[rgba(253,254,194,0.12)] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.22)] transition-transform duration-200 hover:-translate-y-1 ${stat.panel}`}
                key={stat.label}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="pixel-font text-[0.55rem] uppercase tracking-[0.16em] text-[rgba(253,254,194,0.72)]">
                      {stat.label}
                    </p>
                    <p className={`mt-3 text-[1.15rem] sm:text-[1.3rem] ${stat.tone}`}>{stat.value}</p>
                    <p className="mt-2 text-[0.78rem] leading-6 text-[color:var(--muted)]">{stat.note}</p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center border border-[rgba(253,254,194,0.14)] bg-[rgba(0,0,0,0.18)] pixel-font text-[0.65rem] text-[color:var(--text)]">
                    {stat.icon}
                  </span>
                </div>
                {index === 0 && (
                  <div className="mt-4 h-1.5 bg-[rgba(58,155,141,0.22)]">
                    <div className="h-full w-[72%] bg-[color:var(--primary)]" />
                  </div>
                )}
              </article>
            ))}
          </section>

          <section className="grid gap-4">
            <div className="flex items-center justify-between gap-4 px-1">
              <div>
                <p className="pixel-font text-[0.58rem] uppercase tracking-[0.16em] text-[rgba(253,254,194,0.72)]">
                  Mission Scenarios
                </p>
                <h3 className="mt-2 pixel-font text-[0.95rem] uppercase text-[color:var(--text)]">
                  Available missions
                </h3>
              </div>
              <div className="pixel-font text-[0.55rem] uppercase tracking-[0.16em] text-[color:var(--primary)]">
                Ready
              </div>
            </div>

            <div className="grid gap-4">
              {scenarios.map((scenario) => {
                const isActive = scenario.title === activeScenario.title

                return (
                  <article
                    className={`border p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.22)] transition duration-200 ${
                      isActive
                        ? 'border-[rgba(58,155,141,0.6)] bg-[rgba(58,155,141,0.16)] shadow-[0_0_0_1px_rgba(58,155,141,0.45),0_14px_34px_rgba(0,0,0,0.3)]'
                        : 'border-[rgba(253,254,194,0.12)] bg-[color:var(--panel)] hover:-translate-y-1 hover:border-[rgba(253,254,194,0.24)] hover:bg-[rgba(0,0,0,0.14)]'
                    }`}
                    key={scenario.title}
                  >
                    <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <p className="pixel-font text-[0.55rem] uppercase tracking-[0.18em] text-[rgba(253,254,194,0.72)]">
                            {scenario.level}
                          </p>
                          <h4 className="text-[1.05rem] text-[color:var(--text)] sm:text-[1.15rem]">
                            {scenario.title}
                          </h4>
                        </div>

                        <div className="flex flex-wrap gap-4 text-[0.82rem] text-[color:var(--muted)]">
                          <span>
                            Difficulty: <span className="text-[color:var(--text)]">{scenario.difficulty}</span>
                          </span>
                          <span>
                            XP Reward: <span className="text-[color:var(--text)]">{scenario.xpReward}</span>
                          </span>
                        </div>

                        <p className="max-w-3xl text-[0.88rem] leading-7 text-[color:var(--muted)]">
                          {scenario.summary}
                        </p>
                      </div>

                      <button
                        className={`min-w-[170px] border px-4 py-3 pixel-font text-[0.62rem] uppercase tracking-[0.16em] transition ${
                          isActive
                            ? 'border-[rgba(58,155,141,0.7)] bg-[linear-gradient(180deg,rgba(58,155,141,0.28),rgba(58,155,141,0.2))] text-[color:var(--text)]'
                            : 'border-[rgba(253,254,194,0.16)] bg-[rgba(0,0,0,0.16)] text-[color:var(--text)] hover:border-[rgba(58,155,141,0.55)] hover:bg-[rgba(58,155,141,0.18)]'
                        }`}
                        onClick={() => setActiveScenario(scenario)}
                        type="button"
                      >
                        Start Mission
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        </section>
      </div>
    </main>
  )
}