import { StandingsSection } from './components/StandingsSection/StandingsSection'
import { LeaderboardSection } from './components/LeaderboardSection/LeaderboardSection'
import { ScheduleSection } from './components/ScheduleSection/ScheduleSection'
import { AdminPage } from './components/admin/AdminPage/AdminPage'

// Only two routes exist, so a simple path check is enough (no router library yet).
function App() {
  const isAdmin = window.location.pathname.startsWith('/admin')

  if (isAdmin) return <main><AdminPage /></main>

  // Public page sections in SPECIFICATIONS §4 order: standings, leaderboard, schedule.
  return (
    <main>
      <StandingsSection />
      <LeaderboardSection />
      <ScheduleSection />
    </main>
  )
}

export default App
