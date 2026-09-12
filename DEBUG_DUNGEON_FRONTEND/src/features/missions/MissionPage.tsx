import { useEffect, useState } from 'react'
import { ApiError, getMission, type GameplayMission } from '../../lib/api'
import { MissionGameplayEngine } from './MissionGameplayEngine'
import type { Mission } from './types/mission'

function toMission(mission: GameplayMission): Mission {
  return {
    id: mission.id,
    title: mission.title,
    topic: mission.topic,
    track: mission.topic,
    difficulty: mission.difficulty,
    xpReward: mission.questions.reduce((total, question) => total + question.xpReward, 0),
    estimatedTime: 0,
    description: `Mission ${mission.missionNumber}: ${mission.topic}`,
    objectives: [],
    questions: mission.questions.map((question) => ({
      id: question.id,
      category: question.concept,
      question: question.text,
      options: question.options.map((option) => option.text),
      optionIds: question.options.map((option) => option.id),
      xp: question.xpReward,
    })),
  }
}

export function MissionPage({ token, missionId, onReturnToDashboard }: { token: string; missionId: string; onReturnToDashboard?: () => void }) {
  const [mission, setMission] = useState<Mission | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { getMission(token, missionId).then((result) => setMission(toMission(result))).catch((reason: unknown) => setError(reason instanceof ApiError && reason.status === 404 ? 'Mission not found.' : reason instanceof ApiError && reason.status === 401 ? 'Your session has expired. Please sign in again.' : 'This mission is temporarily unavailable.')) }, [missionId, token])
  if (error) return <main className="flex min-h-screen items-center justify-center bg-[color:var(--bg)] px-4"><section className="border border-[#ffb0a8] bg-[rgba(143,42,49,0.16)] p-5 text-sm text-[color:var(--text)]">{error}</section></main>
  if (!mission) return <main className="flex min-h-screen items-center justify-center bg-[color:var(--bg)]"><p className="pixel-font text-xs uppercase tracking-[0.14em] text-[color:var(--primary)]">Loading mission...</p></main>
  return <MissionGameplayEngine mission={mission} onReturnToDashboard={onReturnToDashboard} token={token} />
}