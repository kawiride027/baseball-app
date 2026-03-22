import { useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { generateTeamCode, setStoredTeamCode, setStoredRole } from '../hooks/useLocalStorage'
import { DEFAULT_DATA, ROLES } from '../constants'

export default function TeamCodeScreen({ onTeamReady }) {
  const [mode, setMode] = useState(null) // null | 'create' | 'join' | 'join-parent'
  const [teamName, setTeamName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!teamName.trim()) {
      setError('Enter a team name')
      return
    }
    setLoading(true)
    setError('')
    try {
      const code = generateTeamCode()
      const parentCode = generateTeamCode()

      // Check for existing localStorage data to migrate
      let existingData = null
      try {
        const stored = localStorage.getItem('baseball_app_data')
        if (stored) existingData = JSON.parse(stored)
      } catch (e) { /* ignore parse errors */ }

      const initialData = existingData
        ? { ...DEFAULT_DATA, ...existingData, teamName: teamName.trim(), parentCode }
        : { ...DEFAULT_DATA, teamName: teamName.trim(), parentCode }

      await setDoc(doc(db, 'teams', code), initialData)
      // Create reverse lookup for parent code
      await setDoc(doc(db, 'parentCodes', parentCode), { teamCode: code })

      setStoredTeamCode(code)
      setStoredRole(ROLES.COACH)
      localStorage.setItem('baseball_app_data', JSON.stringify(initialData))
      onTeamReady(code, ROLES.COACH)
    } catch (err) {
      setError('Failed to create team. Check your internet connection.')
      console.error(err)
    }
    setLoading(false)
  }

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase().replace(/\s/g, '')
    if (!code) {
      setError('Enter a team code')
      return
    }
    setLoading(true)
    setError('')
    try {
      const snapshot = await getDoc(doc(db, 'teams', code))
      if (!snapshot.exists()) {
        setError('Team not found. Check the code and try again.')
        setLoading(false)
        return
      }
      const teamData = snapshot.data()
      setStoredTeamCode(code)
      setStoredRole(ROLES.COACH)
      localStorage.setItem('baseball_app_data', JSON.stringify(teamData))
      onTeamReady(code, ROLES.COACH)
    } catch (err) {
      setError('Failed to join. Check your internet connection.')
      console.error(err)
    }
    setLoading(false)
  }

  const handleJoinParent = async () => {
    const code = joinCode.trim().toUpperCase().replace(/\s/g, '')
    if (!code) {
      setError('Enter a parent spectator code')
      return
    }
    setLoading(true)
    setError('')
    try {
      // Look up parent code in reverse-lookup collection
      const parentDoc = await getDoc(doc(db, 'parentCodes', code))
      if (!parentDoc.exists()) {
        setError('Parent code not found. Check the code and try again.')
        setLoading(false)
        return
      }
      const { teamCode } = parentDoc.data()
      // Verify team still exists
      const teamSnapshot = await getDoc(doc(db, 'teams', teamCode))
      if (!teamSnapshot.exists()) {
        setError('Team no longer exists.')
        setLoading(false)
        return
      }
      const teamData = teamSnapshot.data()
      setStoredTeamCode(teamCode)
      setStoredRole(ROLES.PARENT)
      localStorage.setItem('baseball_app_data', JSON.stringify(teamData))
      onTeamReady(teamCode, ROLES.PARENT)
    } catch (err) {
      setError('Failed to join. Check your internet connection.')
      console.error(err)
    }
    setLoading(false)
  }

  // Landing screen
  if (!mode) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#121212',
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>⚾</div>
        <div style={{ fontSize: 32, fontWeight: 900, color: '#FFD700', marginBottom: 4, textAlign: 'center' }}>
          Baseball Manager
        </div>
        <div style={{ fontSize: 14, color: '#888', marginBottom: 40, textAlign: 'center' }}>
          Youth team field positions, batting order & game tracking
        </div>

        <button
          onClick={() => setMode('create')}
          style={{
            width: '100%',
            maxWidth: 320,
            minHeight: 64,
            fontSize: 20,
            fontWeight: 900,
            border: '3px solid #00C853',
            borderRadius: 12,
            background: 'rgba(0,200,83,0.15)',
            color: '#00C853',
            cursor: 'pointer',
            padding: 16,
            marginBottom: 16,
          }}
        >
          Create New Team
        </button>

        <button
          onClick={() => setMode('join')}
          style={{
            width: '100%',
            maxWidth: 320,
            minHeight: 64,
            fontSize: 20,
            fontWeight: 900,
            border: '3px solid #00E5FF',
            borderRadius: 12,
            background: 'rgba(0,229,255,0.1)',
            color: '#00E5FF',
            cursor: 'pointer',
            padding: 16,
            marginBottom: 16,
          }}
        >
          Join Existing Team
        </button>

        <div style={{ fontSize: 13, color: '#555', margin: '4px 0 16px 0' }}>
          ── or ──
        </div>

        <button
          onClick={() => setMode('join-parent')}
          style={{
            width: '100%',
            maxWidth: 320,
            minHeight: 56,
            fontSize: 18,
            fontWeight: 900,
            border: '3px solid #FF9800',
            borderRadius: 12,
            background: 'rgba(255,152,0,0.1)',
            color: '#FF9800',
            cursor: 'pointer',
            padding: 16,
          }}
        >
          I'm a Parent (Spectator)
        </button>

        <div style={{
          marginTop: 48,
          maxWidth: 340,
          textAlign: 'center',
          padding: '0 16px',
        }}>
          <div style={{
            fontSize: 13,
            color: '#666',
            lineHeight: 1.6,
            fontStyle: 'italic',
          }}>
            "I built this app as a coach and dad to help keep sanity in the dugout. I hope you find it as helpful as I have for managing the younger teams. Enjoy and Play Ball!"
          </div>
          <div style={{
            fontSize: 14,
            color: '#FFD700',
            fontWeight: 700,
            marginTop: 10,
          }}>
            ⚾
          </div>
          <div style={{
            fontSize: 13,
            color: '#888',
            marginTop: 4,
          }}>
            – Dustin Bradley
          </div>
        </div>
      </div>
    )
  }

  // Create team screen
  if (mode === 'create') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#121212',
      }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#00C853', marginBottom: 24 }}>
          Create Your Team
        </div>

        <input
          type="text"
          placeholder="Team name (e.g., Hawks)"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          style={{
            width: '100%',
            maxWidth: 320,
            fontSize: 20,
            fontWeight: 700,
            padding: '14px 16px',
            borderRadius: 10,
            border: '2px solid #444',
            background: '#1e1e1e',
            color: '#FFF',
            marginBottom: 16,
            textAlign: 'center',
          }}
          autoFocus
        />

        {error && (
          <div style={{ color: '#FF1744', fontSize: 14, marginBottom: 12, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={loading}
          style={{
            width: '100%',
            maxWidth: 320,
            minHeight: 56,
            fontSize: 18,
            fontWeight: 900,
            border: '3px solid #00C853',
            borderRadius: 12,
            background: 'rgba(0,200,83,0.15)',
            color: '#00C853',
            cursor: loading ? 'wait' : 'pointer',
            padding: 14,
            marginBottom: 12,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Creating...' : 'Create Team'}
        </button>

        <button
          onClick={() => { setMode(null); setError('') }}
          style={{
            fontSize: 14,
            color: '#666',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
          }}
        >
          ← Back
        </button>
      </div>
    )
  }

  // Join as Parent screen
  if (mode === 'join-parent') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#121212',
      }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#FF9800', marginBottom: 8 }}>
          Parent Spectator Mode
        </div>
        <div style={{ fontSize: 14, color: '#888', marginBottom: 24, textAlign: 'center' }}>
          Enter the parent code shared by the coach
        </div>

        <input
          type="text"
          placeholder="e.g. HAWKS42"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          style={{
            width: '100%',
            maxWidth: 320,
            fontSize: 28,
            fontWeight: 900,
            padding: '14px 16px',
            borderRadius: 10,
            border: '2px solid #444',
            background: '#1e1e1e',
            color: '#FF9800',
            marginBottom: 16,
            textAlign: 'center',
            letterSpacing: 2,
          }}
          maxLength={12}
          autoFocus
        />

        {error && (
          <div style={{ color: '#FF1744', fontSize: 14, marginBottom: 12, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleJoinParent}
          disabled={loading}
          style={{
            width: '100%',
            maxWidth: 320,
            minHeight: 56,
            fontSize: 18,
            fontWeight: 900,
            border: '3px solid #FF9800',
            borderRadius: 12,
            background: 'rgba(255,152,0,0.1)',
            color: '#FF9800',
            cursor: loading ? 'wait' : 'pointer',
            padding: 14,
            marginBottom: 12,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Joining...' : 'Join as Spectator'}
        </button>

        <button
          onClick={() => { setMode(null); setError(''); setJoinCode('') }}
          style={{
            fontSize: 14,
            color: '#666',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
          }}
        >
          ← Back
        </button>
      </div>
    )
  }

  // Join team screen (coach)
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: '#121212',
    }}>
      <div style={{ fontSize: 28, fontWeight: 900, color: '#00E5FF', marginBottom: 8 }}>
        Join a Team
      </div>
      <div style={{ fontSize: 14, color: '#888', marginBottom: 24, textAlign: 'center' }}>
        Enter the team code shared by your head coach
      </div>

      <input
        type="text"
        placeholder="e.g. TIGERS55"
        value={joinCode}
        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
        style={{
          width: '100%',
          maxWidth: 320,
          fontSize: 28,
          fontWeight: 900,
          padding: '14px 16px',
          borderRadius: 10,
          border: '2px solid #444',
          background: '#1e1e1e',
          color: '#FFD700',
          marginBottom: 16,
          textAlign: 'center',
          letterSpacing: 2,
        }}
        maxLength={12}
        autoFocus
      />

      {error && (
        <div style={{ color: '#FF1744', fontSize: 14, marginBottom: 12, textAlign: 'center' }}>
          {error}
        </div>
      )}

      <button
        onClick={handleJoin}
        disabled={loading}
        style={{
          width: '100%',
          maxWidth: 320,
          minHeight: 56,
          fontSize: 18,
          fontWeight: 900,
          border: '3px solid #00E5FF',
          borderRadius: 12,
          background: 'rgba(0,229,255,0.1)',
          color: '#00E5FF',
          cursor: loading ? 'wait' : 'pointer',
          padding: 14,
          marginBottom: 12,
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Joining...' : 'Join Team'}
      </button>

      <button
        onClick={() => { setMode(null); setError(''); setJoinCode('') }}
        style={{
          fontSize: 14,
          color: '#666',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 8,
        }}
      >
        ← Back
      </button>
    </div>
  )
}
