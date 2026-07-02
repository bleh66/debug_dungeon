import type { Question } from '../types/mission'

import { OptionButton } from './OptionButton'

type QuestionCardProps = {
  question: Question
  currentQuestionIndex: number
  selectedOption: number | null
  onSelectOption: (optionIndex: number) => void
}

export function QuestionCard({
  question,
  currentQuestionIndex,
  selectedOption,
  onSelectOption,
}: QuestionCardProps) {
  return (
    <section className="border border-[rgba(253,254,194,0.12)] bg-[color:var(--panel)] px-5 py-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.25)] sm:px-6 sm:py-6">
      <div className="flex flex-wrap items-center gap-3 border-b border-[rgba(253,254,194,0.08)] pb-4">
        <p className="pixel-font text-[0.58rem] uppercase tracking-[0.16em] text-[color:var(--primary)]">
          Question {currentQuestionIndex + 1}
        </p>
        <span className="h-1.5 w-1.5 rounded-full bg-[rgba(253,254,194,0.35)]" />
        <span className="text-[0.76rem] uppercase tracking-[0.12em] text-[color:var(--muted)]">
          {question.category}
        </span>
      </div>

      <h2 className="mt-5 max-w-3xl text-[1.12rem] leading-8 text-[color:var(--text)] sm:text-[1.3rem]">
        {question.question}
      </h2>

      <div className="mt-5 grid gap-3">
        {question.options.map((option, optionIndex) => (
          <OptionButton
            key={`${question.id}-${optionIndex}`} //combining question id and option index to make a unique key for each option
            onSelect={onSelectOption}
            option={option}
            optionIndex={optionIndex}
            selected={selectedOption === optionIndex}
          />
        ))}
      </div>
    </section>
  )
}