type MissionNavigationProps = {
  isFirstQuestion: boolean
  isLastQuestion: boolean
  onPrevious: () => void
  onNext: () => void
  onSubmitMission: () => void
}

export function MissionNavigation({
  isFirstQuestion,
  isLastQuestion,
  onPrevious,
  onNext,
  onSubmitMission,
}: MissionNavigationProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-[rgba(253,254,194,0.12)] bg-[color:var(--panel)] px-5 py-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.25)] sm:px-6">
      <button
        className="border border-[rgba(253,254,194,0.16)] bg-[rgba(0,0,0,0.12)] px-4 py-3 pixel-font text-[0.62rem] uppercase tracking-[0.16em] text-[color:var(--text)] transition-colors duration-200 hover:border-[rgba(253,254,194,0.28)] hover:bg-[rgba(0,0,0,0.18)] disabled:cursor-not-allowed disabled:opacity-45"
        disabled={isFirstQuestion}
        onClick={onPrevious}
        type="button"
      >
        Previous
      </button>

      {isLastQuestion ? (
        <button
          className="border border-[rgba(253,254,194,0.16)] bg-[linear-gradient(180deg,#3faca0,var(--primary))] px-4 py-3 pixel-font text-[0.62rem] uppercase tracking-[0.16em] text-[color:var(--text)] transition-colors duration-200 hover:shadow-[0_0_18px_rgba(58,155,141,0.35)]"
          onClick={onSubmitMission}
          type="button"
        >
          Submit Mission
        </button>
      ) : (
        <button
          className="border border-[rgba(253,254,194,0.16)] bg-[rgba(0,0,0,0.12)] px-4 py-3 pixel-font text-[0.62rem] uppercase tracking-[0.16em] text-[color:var(--text)] transition-colors duration-200 hover:border-[rgba(253,254,194,0.28)] hover:bg-[rgba(0,0,0,0.18)]"
          onClick={onNext}
          type="button"
        >
          Next
        </button>
      )}
    </div>
  )
}