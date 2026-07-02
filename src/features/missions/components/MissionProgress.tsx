type MissionProgressProps = {
  answeredQuestions: number
  totalQuestions: number
}

function getProgressPercent(answeredQuestions: number, totalQuestions: number) {
  if (totalQuestions === 0) {
    return 0
  }

  return Math.round((answeredQuestions / totalQuestions) * 100)
}

export function MissionProgress({ answeredQuestions, totalQuestions }: MissionProgressProps) {
  const progressPercent = getProgressPercent(answeredQuestions, totalQuestions)
  const filledBlocks = Math.round((progressPercent / 100) * 10)

  return (
    <section className="border border-[rgba(253,254,194,0.12)] bg-[color:var(--panel)] px-5 py-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.25)] sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="pixel-font text-[0.58rem] uppercase tracking-[0.16em] text-[rgba(253,254,194,0.72)]">
            Mission Progress
          </p>
          <p className="mt-2 text-[0.92rem] text-[color:var(--muted)]">
            {totalQuestions === 0
              ? 'No questions loaded yet.'
              : `Question ${Math.min(answeredQuestions + 1, totalQuestions)} / ${totalQuestions}`}
          </p>
        </div>

        <p className="pixel-font text-[0.72rem] uppercase tracking-[0.16em] text-[color:var(--primary)]">
          {progressPercent}%
        </p>
      </div>

      <div
        aria-label="Mission completion progress"
        className="mt-4 grid grid-cols-10 gap-2"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {Array.from({ length: 10 }).map((_, blockIndex) => {
          const isFilled = blockIndex < filledBlocks

          return (
            <div
              className={`h-4 border ${
                isFilled
                  ? 'border-[rgba(58,155,141,0.72)] bg-[rgba(58,155,141,0.78)]'
                  : 'border-[rgba(253,254,194,0.1)] bg-[rgba(0,0,0,0.14)]'
              }`}
              key={blockIndex}
            />
          )
        })}
      </div>
    </section>
  )
}