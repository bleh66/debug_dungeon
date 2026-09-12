import type { Mission } from './types/mission'
import type { MissionResult } from './types/mission'

type MissionResultPageProps = {
	mission: Mission
	result: MissionResult
	onRetry: () => void
	onReturnToDashboard: () => void
}

function ResultStat({ label, value }: { label: string; value: string | number }) {
	return (
		<div className="border border-[rgba(253,254,194,0.12)] bg-[rgba(0,0,0,0.14)] px-4 py-4">
			<p className="pixel-font text-[0.55rem] uppercase tracking-[0.16em] text-[rgba(253,254,194,0.72)]">
				{label}
			</p>
			<p className="mt-3 text-[1.08rem] text-[color:var(--text)] sm:text-[1.2rem]">{value}</p>
		</div>
	)
}

export function MissionResultPage({ mission, result, onRetry, onReturnToDashboard }: MissionResultPageProps) {
	return (
		<main className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
			<div className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
				<section className="border border-[rgba(253,254,194,0.12)] bg-[color:var(--panel-strong)] px-5 py-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.25)] sm:px-6 sm:py-6">
					<div className="space-y-4">
						<div className="flex flex-wrap items-start justify-between gap-4 border-b border-[rgba(253,254,194,0.08)] pb-4">
							<div className="space-y-2">
								<p className="pixel-font text-[0.58rem] uppercase tracking-[0.16em] text-[rgba(253,254,194,0.72)]">
									Mission Complete
								</p>
								<h1 className="pixel-font text-[1rem] uppercase leading-6 text-[color:var(--text)] sm:text-[1.18rem]">
									{mission.title}
								</h1>
							</div>

							<div className="border border-[rgba(58,155,141,0.45)] bg-[rgba(58,155,141,0.16)] px-4 py-3 text-right">
								<p className="pixel-font text-[0.55rem] uppercase tracking-[0.16em] text-[rgba(253,254,194,0.72)]">
									Accuracy
								</p>
								<p className="mt-2 text-[1.2rem] text-[color:var(--text)] sm:text-[1.35rem]">
									{result.accuracy}%
								</p>
							</div>
						</div>

						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							<ResultStat label="Score" value={result.score} />
							<ResultStat label="Correct Answers" value={result.correctAnswers} />
							<ResultStat label="Unanswered Questions" value={result.totalQuestions - result.correctAnswers - result.incorrectAnswers} />
							<ResultStat label="Incorrect Answers" value={result.incorrectAnswers} />
							<ResultStat label="XP Earned" value={`${result.xpEarned} XP`} />
							<ResultStat label="Total Questions" value={result.totalQuestions} />
							<ResultStat label="Mission Name" value={mission.title} />
						</div>

						<section className="space-y-3 border-t border-[rgba(253,254,194,0.08)] pt-4">
							<div className="space-y-1">
								<p className="pixel-font text-[0.58rem] uppercase tracking-[0.16em] text-[rgba(253,254,194,0.72)]">
									Question Review
								</p>
								<p className="text-[0.86rem] text-[color:var(--muted)]">
									See each answer, the correct option, and explanation.
								</p>
							</div>

							<div className="space-y-3">
								{result.questionResults.map((questionResult) => {
									const question = mission.questions.find((missionQuestion) => missionQuestion.id === questionResult.questionId)

									return (
										<div
											className="border border-[rgba(253,254,194,0.12)] bg-[rgba(0,0,0,0.14)] px-4 py-4"
											key={questionResult.questionId}
										>
											<div className="flex flex-wrap items-start justify-between gap-3 border-b border-[rgba(253,254,194,0.08)] pb-3">
												<p className="text-[0.95rem] text-[color:var(--text)]">{questionResult.question}</p>
												<p
													className={`pixel-font text-[0.55rem] uppercase tracking-[0.16em]
														${questionResult.unanswered? 'text-[rgba(253,254,194,0.55)]':
															 questionResult.isCorrect? 'text-[rgba(134,239,172,0.9)]' : 'text-[rgba(252,165,165,0.9)]'
															}`}
												>
													{questionResult.unanswered ? 'Unanswered' : questionResult.isCorrect ? 'Correct' : 'Incorrect'}
												</p>
											</div>

											<div className="mt-3 space-y-2 text-[0.84rem] text-[color:var(--muted)]">
												<p>
													<span className="pixel-font mr-2 text-[0.55rem] uppercase tracking-[0.16em] text-[rgba(253,254,194,0.72)]">
														Selected
													</span>
													{questionResult.selectedAnswer}
												</p>
												<p>
													<span className="pixel-font mr-2 text-[0.55rem] uppercase tracking-[0.16em] text-[rgba(253,254,194,0.72)]">
														Correct Answer
													</span>
													{questionResult.correctAnswer}
												</p>
												<p>
													<span className="pixel-font mr-2 text-[0.55rem] uppercase tracking-[0.16em] text-[rgba(253,254,194,0.72)]">
														Explanation
													</span>
													{questionResult.explanation ?? question?.explanation ?? 'No explanation available.'}
												</p>
											</div>
										</div>
									)
								})}
							</div>
						</section>

						<div className="flex flex-wrap gap-3 border-t border-[rgba(253,254,194,0.08)] pt-4">
							<button
								className="border border-[rgba(253,254,194,0.16)] bg-[rgba(0,0,0,0.12)] px-4 py-3 pixel-font text-[0.62rem] uppercase tracking-[0.16em] text-[color:var(--text)] transition-colors duration-200 hover:border-[rgba(253,254,194,0.28)] hover:bg-[rgba(0,0,0,0.18)]"
								onClick={onRetry}
								type="button"
							>
								Retry Mission
							</button>

							<button
								className="border border-[rgba(253,254,194,0.16)] bg-[linear-gradient(180deg,#3faca0,var(--primary))] px-4 py-3 pixel-font text-[0.62rem] uppercase tracking-[0.16em] text-[color:var(--text)] transition-colors duration-200 hover:shadow-[0_0_18px_rgba(58,155,141,0.35)]"
								onClick={onReturnToDashboard}
								type="button"
							>
								Return to Dashboard
							</button>
						</div>
					</div>
				</section>
			</div>
		</main>
	)
}