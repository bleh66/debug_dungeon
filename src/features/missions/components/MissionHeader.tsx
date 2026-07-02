import type { Mission } from '../types/mission'

type MissionHeaderProps = {
  mission: Mission
  currentQuestionIndex: number
  totalQuestions: number
  answeredQuestions: number
}

function formatTrack(track: Mission['track']) {
  return track.charAt(0).toUpperCase() + track.slice(1)
}

export function MissionHeader({
  mission,
  currentQuestionIndex,
  totalQuestions,
  answeredQuestions,
}: MissionHeaderProps) {
  return (
    <header className="border border-[rgba(253,254,194,0.12)] bg-[color:var(--panel-strong)] px-5 py-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.25)] sm:px-6 sm:py-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[rgba(253,254,194,0.08)] pb-4">
          <div className="space-y-2">
            <p className="pixel-font text-[0.58rem] uppercase tracking-[0.16em] text-[rgba(253,254,194,0.72)]">
              Mission Brief
            </p>
            <h1 className="pixel-font text-[1rem] uppercase leading-6 text-[color:var(--text)] sm:text-[1.18rem]">
              {mission.title}
            </h1>
            <p className="max-w-2xl text-[0.92rem] leading-7 text-[color:var(--muted)]">
              {mission.description}
            </p>
          </div>

          <div className="grid gap-2 sm:min-w-[280px] sm:grid-cols-2">
            <div className="border border-[rgba(253,254,194,0.12)] bg-[rgba(0,0,0,0.14)] px-4 py-3">
              <p className="pixel-font text-[0.55rem] uppercase tracking-[0.16em] text-[rgba(253,254,194,0.72)]">
                Difficulty
              </p>
              <p className="mt-2 text-[0.92rem] text-[color:var(--text)]">{mission.difficulty}</p>
            </div>
            <div className="border border-[rgba(253,254,194,0.12)] bg-[rgba(0,0,0,0.14)] px-4 py-3">
              <p className="pixel-font text-[0.55rem] uppercase tracking-[0.16em] text-[rgba(253,254,194,0.72)]">
                XP Reward
              </p>
              <p className="mt-2 text-[0.92rem] text-[color:var(--text)]">{mission.xpReward} XP</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.82rem] text-[color:var(--muted)]">
          <p>
            Track: <span className="text-[color:var(--text)]">{formatTrack(mission.track)}</span>
          </p>
          <p>
            Time Estimate: <span className="text-[color:var(--text)]">{mission.estimatedTime} Minutes</span>
          </p>
          <p>
            Question Progress:{' '} //this {" "} is to add a space after the colon
            <span className="text-[color:var(--text)]">
              {totalQuestions === 0 ? '0 / 0' : `${currentQuestionIndex + 1} / ${totalQuestions}`}
            </span>
          </p>
          <p>
            Answered:{' '}
            <span className="text-[color:var(--text)]">{answeredQuestions} / {totalQuestions}</span>
          </p>
        </div>
      </div>
    </header>
  )
}