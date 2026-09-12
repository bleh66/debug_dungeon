import { useEffect, useMemo, useState } from 'react'
import { ApiError, completeMission, restartMission, startMission, submitAnswer } from '../../lib/api'

import type { Mission } from './types/mission'

import { MissionHeader } from './components/MissionHeader'
import { MissionNavigation } from './components/MissionNavigation'
import { MissionProgress } from './components/MissionProgress'
import { QuestionCard } from './components/QuestionCard'
import { MissionResultPage } from './MissionResultPage'
import type { MissionResult } from './types/mission'

type MissionGameplayEngineProps = {
	mission: Mission
	token: string
	onReturnToDashboard?: () => void
}

export function MissionGameplayEngine({ mission, token, onReturnToDashboard }: MissionGameplayEngineProps) {
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
	const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({})
	const [answeredQuestions, setAnsweredQuestions] = useState<string[]>([])
	const [missionResult, setMissionResult] = useState<MissionResult | null>(null)
	const [attemptId, setAttemptId] = useState<string | null>(null)
	const [submissionError, setSubmissionError] = useState('')
	const [submitting, setSubmitting] = useState(false)

	useEffect(() => {
		setCurrentQuestionIndex(0)
		setSelectedOptions({})
		setAnsweredQuestions([])
		setMissionResult(null)
		setSubmissionError('')
		setAttemptId(null)
		startMission(token, mission.id.toString()).then((result) => setAttemptId(result.missionAttemptId)).catch(() => setSubmissionError('This mission could not be started. Please try again.'))
	}, [mission.id, token])

	function resetMissionState() {
		setCurrentQuestionIndex(0)
		setSelectedOptions({})
		setAnsweredQuestions([])
	}

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

			setAnsweredQuestions((previous) => previous.filter((questionId) => questionId !== currentQuestion.id.toString()))

			return
		}

		setSelectedOptions((previous) => ({
			...previous,
			[currentQuestion.id]: optionIndex,
		}))

		setAnsweredQuestions((previous) => {
			if (previous.includes(currentQuestion.id.toString())) {
				return previous
			}

			return [...previous, currentQuestion.id.toString()]
		})
	}

	function handlePreviousQuestion() {
		setCurrentQuestionIndex((previous) => Math.max(previous - 1, 0))
	}

	function handleNextQuestion() {
		setCurrentQuestionIndex((previous) => Math.min(previous + 1, Math.max(totalQuestions - 1, 0)))
	}

	async function handleSubmitMission() {
		if (!attemptId || submitting) return
		setSubmitting(true)
		setSubmissionError('')
		try {
			const questionResults: MissionResult['questionResults'] = []
			for (const question of mission.questions) {
				const selectedIndex = selectedOptions[question.id]
				if (selectedIndex === undefined || !question.optionIds?.[selectedIndex]) {
					questionResults.push({ questionId: question.id, question: question.question, selectedAnswer: 'Not answered', correctAnswer: 'Not available', isCorrect: false, unanswered: true, explanation: null })
					continue
				}
				const answer = await submitAnswer(token, mission.id.toString(), attemptId, question.id.toString(), question.optionIds[selectedIndex])
				const selectedAnswer = question.options[selectedIndex]
				questionResults.push({ questionId: question.id, question: question.question, selectedAnswer, correctAnswer: answer.correct ? selectedAnswer : 'See explanation', isCorrect: answer.correct, unanswered: false, explanation: answer.explanation })
			}
			const completion = await completeMission(token, mission.id.toString(), attemptId)
			setMissionResult({ score: completion.score, totalQuestions: completion.totalQuestions, correctAnswers: completion.correctAnswers, incorrectAnswers: completion.totalQuestions - completion.correctAnswers - questionResults.filter((result) => result.unanswered).length, accuracy: completion.totalQuestions === 0 ? 0 : Math.round((completion.correctAnswers / completion.totalQuestions) * 100), xpEarned: completion.xpEarned, questionResults })
		} catch (reason: unknown) {
			setSubmissionError(reason instanceof ApiError ? reason.message : 'Your answers could not be submitted.')
		} finally {
			setSubmitting(false)
		}
	}

	async function handleRetryMission() {
		setMissionResult(null)
		resetMissionState()
		try {
			const restarted = await restartMission(token, mission.id.toString())
			setAttemptId(restarted.missionAttemptId)
		} catch {
			setSubmissionError('This mission could not be restarted. Please try again.')
		}
	}

	function handleReturnToDashboard() {
		onReturnToDashboard?.()
	}

	if (missionResult) {
		return (
			<MissionResultPage
				mission={mission}
				result={missionResult}
				onRetry={handleRetryMission}
				onReturnToDashboard={handleReturnToDashboard}
			/>
		)
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
				{submissionError && <section className="border border-[#ffb0a8] bg-[rgba(143,42,49,0.16)] px-5 py-4 text-sm text-[#ffb0a8]">{submissionError}</section>}

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
