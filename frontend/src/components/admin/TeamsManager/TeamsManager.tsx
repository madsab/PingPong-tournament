import { useEffect, useState, type FormEvent } from 'react'
import {
  ApiError,
  createMember,
  createTeam,
  deleteMember,
  deleteTeam,
  listTeams,
  renameMember,
  renameTeam,
  updateTeamLogo,
  type Team,
} from '../../../api/admin'
import styles from './TeamsManager.module.css'

// Manage teams and their rosters (F8/F9).
export function TeamsManager() {
  const [teams, setTeams] = useState<Team[]>([])
  const [newTeam, setNewTeam] = useState('')
  const [newLogo, setNewLogo] = useState('')
  const [error, setError] = useState<string | null>(null)

  function reload() {
    listTeams()
      .then(setTeams)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load teams'))
  }

  useEffect(reload, [])

  async function run(action: () => Promise<unknown>) {
    setError(null)
    try {
      await action()
      reload()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong')
    }
  }

  function addTeam(e: FormEvent) {
    e.preventDefault()
    if (!newTeam.trim()) return
    run(() => createTeam(newTeam.trim(), newLogo.trim())).then(() => {
      setNewTeam('')
      setNewLogo('')
    })
  }

  return (
    <section className={styles.wrap}>
      <form onSubmit={addTeam} className={styles.addRow}>
        <input
          aria-label="New team name"
          value={newTeam}
          onChange={(e) => setNewTeam(e.target.value)}
          placeholder="New team name"
          className={styles.input}
        />
        <input
          aria-label="New team logo URL"
          value={newLogo}
          onChange={(e) => setNewLogo(e.target.value)}
          placeholder="Logo URL (optional)"
          className={styles.input}
        />
        <button type="submit" className={styles.primary}>
          Add team
        </button>
      </form>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <ul className={styles.teamList}>
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} onChange={run} />
        ))}
      </ul>
    </section>
  )
}

function TeamCard({
  team,
  onChange,
}: {
  team: Team
  onChange: (action: () => Promise<unknown>) => void
}) {
  const [name, setName] = useState(team.name)
  const [logo, setLogo] = useState(team.logo_url ?? '')
  const [newMember, setNewMember] = useState('')

  return (
    <li className={styles.card}>
      <div className={styles.teamHeader}>
        <input
          aria-label={`Team name for ${team.name}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.input}
        />
        <button
          className={styles.secondary}
          onClick={() => onChange(() => renameTeam(team.id, name))}
        >
          Rename
        </button>
        <button
          className={styles.danger}
          onClick={() => onChange(() => deleteTeam(team.id))}
        >
          Delete team
        </button>
      </div>

      <div className={styles.teamHeader}>
        <input
          aria-label={`Logo URL for ${team.name}`}
          value={logo}
          onChange={(e) => setLogo(e.target.value)}
          placeholder="Logo URL (blank to remove)"
          className={styles.input}
        />
        <button
          className={styles.secondary}
          onClick={() => onChange(() => updateTeamLogo(team.id, logo.trim()))}
        >
          Save logo
        </button>
      </div>

      <ul className={styles.memberList}>
        {team.members.map((m) => (
          <MemberRow key={m.id} name={m.name} id={m.id} onChange={onChange} />
        ))}
      </ul>

      <form
        className={styles.addRow}
        onSubmit={(e) => {
          e.preventDefault()
          if (!newMember.trim()) return
          onChange(() => createMember(newMember.trim(), team.id))
          setNewMember('')
        }}
      >
        <input
          aria-label={`New member for ${team.name}`}
          value={newMember}
          onChange={(e) => setNewMember(e.target.value)}
          placeholder="New member name"
          className={styles.input}
        />
        <button type="submit" className={styles.secondary}>
          Add member
        </button>
      </form>
    </li>
  )
}

function MemberRow({
  id,
  name,
  onChange,
}: {
  id: number
  name: string
  onChange: (action: () => Promise<unknown>) => void
}) {
  const [value, setValue] = useState(name)
  return (
    <li className={styles.memberRow}>
      <input
        aria-label={`Member name for ${name}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={styles.input}
      />
      <button
        className={styles.secondary}
        onClick={() => onChange(() => renameMember(id, value))}
      >
        Save
      </button>
      <button
        className={styles.danger}
        onClick={() => onChange(() => deleteMember(id))}
      >
        Remove
      </button>
    </li>
  )
}
