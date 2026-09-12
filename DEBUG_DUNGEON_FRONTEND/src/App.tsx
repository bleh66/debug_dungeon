import { useEffect, useState } from 'react'
import { AdminDashboardPage } from './features/admin/AdminDashboardPage'
import { AuthPage } from './features/auth/AuthPage'
import { LearningDashboardPage } from './features/dashboard/LearningDashboardPage'
import { MissionPage } from './features/missions/MissionPage'
import { getProfile, type User } from './lib/api'

type Session = { token: string; user: User }

function navigate(path: string) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function Shell({ session, onLogout, children }: { session: Session; onLogout: () => void; children: React.ReactNode }) {
  return <div className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
    <nav className="border-b border-[rgba(253,254,194,0.12)] bg-[rgba(52,47,51,0.94)] px-4 py-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3">
        <button className="pixel-font text-[0.62rem] uppercase tracking-[0.12em] text-[color:var(--primary)]" onClick={() => navigate('/dashboard')} type="button">Debug Dungeon</button>
        <div className="flex flex-wrap items-center gap-2">
          <button className="border border-[rgba(253,254,194,0.12)] px-3 py-2 text-xs text-[color:var(--muted)] hover:border-[color:var(--primary)] hover:text-[color:var(--text)]" onClick={() => navigate('/dashboard')} type="button">Learning</button>
          {session.user.role === 'ADMIN' && <button className="border border-[rgba(253,254,194,0.12)] px-3 py-2 text-xs text-[color:var(--muted)] hover:border-[#ffb0a8] hover:text-[color:var(--text)]" onClick={() => navigate('/admin')} type="button">Admin</button>}
          <button className="border border-[rgba(143,42,49,0.5)] px-3 py-2 text-xs text-[color:var(--muted)] hover:text-[color:var(--text)]" onClick={onLogout} type="button">Sign out</button>
        </div>
      </div>
    </nav>
    {children}
  </div>
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [path, setPath] = useState(window.location.pathname)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    const storedToken = window.localStorage.getItem('debug-dungeon-token')
    if (!storedToken) { setCheckingSession(false); return }
    getProfile(storedToken).then(({ user }) => setSession({ token: storedToken, user })).catch(() => window.localStorage.removeItem('debug-dungeon-token')).finally(() => setCheckingSession(false))
    const handlePopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function handleAuthenticated(nextSession: Session) { window.localStorage.setItem('debug-dungeon-token', nextSession.token); setSession(nextSession); navigate('/dashboard') }
  function handleLogout() { window.localStorage.removeItem('debug-dungeon-token'); setSession(null); navigate('/login') }
  if (checkingSession) return <main className="flex min-h-screen items-center justify-center bg-[color:var(--bg)]"><p className="pixel-font text-xs uppercase tracking-[0.14em] text-[color:var(--primary)]">Checking access...</p></main>
  if (!session) return <AuthPage onAuthenticated={handleAuthenticated} />
  const missionId = path.startsWith('/missions/') ? path.slice('/missions/'.length) : ''
  const content = path === '/admin' && session.user.role === 'ADMIN' ? <AdminDashboardPage token={session.token} /> : missionId ? <MissionPage missionId={missionId} onReturnToDashboard={() => navigate('/dashboard')} token={session.token} /> : <LearningDashboardPage onStartMission={(nextMissionId) => navigate(`/missions/${nextMissionId}`)} token={session.token} />
  return <Shell onLogout={handleLogout} session={session}>{content}</Shell>
}
