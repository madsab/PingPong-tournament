import { StandingsSection } from './components/StandingsSection/StandingsSection'
import { LeaderboardSection } from './components/LeaderboardSection/LeaderboardSection'
import { ScheduleSection } from './components/ScheduleSection/ScheduleSection'
import { AdminPage } from './components/admin/AdminPage/AdminPage'
import { FantasyPage } from './components/fantasy/FantasyPage/FantasyPage'
import { Navbar } from './components/Navbar/Navbar'

// A few routes exist, so a simple path check is enough (no router library yet).
function App() {
  const path = window.location.pathname

  // Admin has no navbar (it's a separate, gated tool).
  if (path.startsWith('/admin')) return <main><AdminPage /></main>
  if (path.startsWith('/fantasy'))
    return (
      <main>
        <Navbar />
        <FantasyPage />
      </main>
    )

  // Public page sections in SPECIFICATIONS §4 order: standings, leaderboard, schedule.
  return (
    <main>
      {/* <Navbar /> */}
      <StandingsSection />
      <LeaderboardSection />
      <ScheduleSection />
    </main>
  )
}

export default App
