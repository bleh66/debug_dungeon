const API_BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:8000')

export type UserRole = 'PLAYER' | 'ADMIN'
export type User = { id: string; email: string; role: UserRole }
export type ConceptPerformance = { concept: string; attempted: number; correct: number; incorrect: number; accuracy: number; classification: 'strong' | 'developing' | 'weak' }
export type LearningProfile = { totalQuestionsAttempted: number; totalCorrect: number; totalIncorrect: number; overallAccuracy: number; concepts: ConceptPerformance[] }
export type RecommendedMission = { id: string; missionNumber: number; title: string; topic: string; difficulty: 'EASY' | 'MEDIUM' | 'HARD' }
export type Recommendation = ConceptPerformance & { priority: 'HIGH' | 'MEDIUM' | 'LOW'; reason: string; mission: RecommendedMission | null }
export type Recommendations = { totalQuestionsAttempted: number; totalCorrect: number; totalIncorrect: number; overallAccuracy: number; nextFocus: Recommendation | null; recommendations: Recommendation[] }
export type PublishedMission = { id: string; missionNumber: number; title: string; topic: string; difficulty: 'EASY' | 'MEDIUM' | 'HARD'; questionCount: number }
export type GameplayMission = { id: string; missionNumber: number; title: string; topic: string; difficulty: 'EASY' | 'MEDIUM' | 'HARD'; questions: Array<{ id: string; missionId: string; text: string; concept: string; xpReward: number; options: Array<{ id: string; questionId: string; text: string; displayOrder: number }> }> }
export type ValidationIssue = { questionIndex: number | null; type: string; severity: 'ERROR' | 'WARNING'; message: string }

export class ApiError extends Error {
  status: number
  details?: { validation?: { issues?: ValidationIssue[] } }
  constructor(message: string, status: number, details?: ApiError['details']) { super(message); this.name = 'ApiError'; this.status = status; this.details = details }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...options.headers } })
  const body = await response.json().catch(() => ({})) as { message?: string; validation?: { issues?: ValidationIssue[] } } & T
  if (!response.ok) throw new ApiError(body.message ?? 'The request could not be completed.', response.status, body)
  return body as T
}

export function login(email: string, password: string) { return request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }) }
export function register(email: string, password: string) { return request<User>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }) }
export function getProfile(token: string) { return request<{ user: User }>('/auth/profile', {}, token) }
export function getLearningProfile(token: string) { return request<LearningProfile>('/users/me/learning-profile', {}, token) }
export function getRecommendations(token: string) { return request<Recommendations>('/users/me/recommendations', {}, token) }
export function generateAndPublishMission(token: string, input: { topic: string; difficulty: 'EASY' | 'MEDIUM' | 'HARD'; questionCount: number }) { return request<{ message: string; mission: PublishedMission }>('/missions/generate-and-publish', { method: 'POST', body: JSON.stringify(input) }, token) }
export function getMission(token: string, missionId: string) { return request<GameplayMission>(`/missions/${missionId}`, {}, token) }
export function startMission(token: string, missionId: string) { return request<{ missionAttemptId: string; missionProgressId: string; resumed: boolean }>(`/missions/${missionId}/start`, { method: 'POST' }, token) }
export function restartMission(token: string, missionId: string) { return request<{ missionAttemptId: string; missionProgressId: string; resumed: boolean }>(`/missions/${missionId}/restart`, { method: 'POST' }, token) }
export function submitAnswer(token: string, missionId: string, attemptId: string, questionId: string, selectedOptionId: string) { return request<{ correct: boolean; explanation: string | null; xpEarned: number }>(`/missions/${missionId}/attempts/${attemptId}/questions/${questionId}`, { method: 'POST', body: JSON.stringify({ selectedOptionId }) }, token) }
export function completeMission(token: string, missionId: string, attemptId: string) { return request<{ status: 'COMPLETED'; score: number; xpEarned: number; correctAnswers: number; totalQuestions: number }>(`/missions/${missionId}/attempts/${attemptId}/complete`, { method: 'POST' }, token) }