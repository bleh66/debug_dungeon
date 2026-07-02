import { useEffect, useMemo, useState } from 'react'

import type { Mission } from './types/mission'

import { HintPanel } from './components/HintPanel'
import { MissionHeader } from './components/MissionHeader'
import { MissionNavigation } from './components/MissionNavigation'
import { MissionProgress } from './components/MissionProgress'
import { QuestionCard } from './components/QuestionCard'

type MissionGameplayEngineProps = {
	mission: Mission
}

export function MissionGameplayEngine({ mission }: MissionGameplayEngineProps) {
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
	const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({})
	const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([])

	useEffect(() => {
		setCurrentQuestionIndex(0)
		setSelectedOptions({})
		setAnsweredQuestions([])
	}, [mission.id])

	const totalQuestions = mission.questions.length

	const currentQuestion = useMemo(() => {
		if (totalQuestions === 0) {
			return null
		}

		return mission.questions[currentQuestionIndex] ?? mission.questions[0] ?? null
	}, [currentQuestionIndex, mission.questions, totalQuestions])

	const selectedOption = currentQuestion ? selectedOptions[currentQuestion.id] ?? null : null
	const answeredQuestionCount = answeredQuestions.length
	const isFirstQuestion = currentQuestionIndex === 0
	const isLastQuestion = totalQuestions > 0 ? currentQuestionIndex === totalQuestions - 1 : true

	function handleSelectOption(optionIndex: number) {
		if (!currentQuestion) {
			return
		}

		const isDeselecting = selectedOptions[currentQuestion.id] === optionIndex

		if (isDeselecting) {
			setSelectedOptions((previous) => {
				const nextOptions = { ...previous }
				delete nextOptions[currentQuestion.id]

				return nextOptions
			})

			setAnsweredQuestions((previous) => previous.filter((questionId) => questionId !== currentQuestion.id))

			return
		}

		setSelectedOptions((previous) => ({
			...previous,
			[currentQuestion.id]: optionIndex,
		}))

		setAnsweredQuestions((previous) => {
			if (previous.includes(currentQuestion.id)) {
				return previous
			}

			return [...previous, currentQuestion.id]
		})
	}

	function handlePreviousQuestion() {
		setCurrentQuestionIndex((previous) => Math.max(previous - 1, 0))
	}

	function handleNextQuestion() {
		setCurrentQuestionIndex((previous) => Math.min(previous + 1, Math.max(totalQuestions - 1, 0)))
	}

	function handleSubmitMission() {
		return undefined
	}

	return (
		<main className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
			<div className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
				<MissionHeader
					answeredQuestions={answeredQuestionCount}
					currentQuestionIndex={currentQuestionIndex}
					mission={mission}
					totalQuestions={totalQuestions}
				/>

				<MissionProgress answeredQuestions={answeredQuestionCount} totalQuestions={totalQuestions} />

				{currentQuestion ? (
					<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
						<div className="space-y-4">
							<QuestionCard
								currentQuestionIndex={currentQuestionIndex}
								onSelectOption={handleSelectOption}
								question={currentQuestion}
								selectedOption={selectedOption}
							/>

							<MissionNavigation
								isFirstQuestion={isFirstQuestion}
								isLastQuestion={isLastQuestion}
								onNext={handleNextQuestion}
								onPrevious={handlePreviousQuestion}
								onSubmitMission={handleSubmitMission}
							/>
						</div>

						<HintPanel />
					</div>
				) : (
					<section className="border border-[rgba(253,254,194,0.12)] bg-[color:var(--panel)] px-5 py-6 text-[0.92rem] text-[color:var(--muted)] shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.25)] sm:px-6">
						This mission does not have any questions yet.
					</section>
				)}
			</div>
		</main>
	)
}
