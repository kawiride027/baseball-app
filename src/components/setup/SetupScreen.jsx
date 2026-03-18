import { useState } from 'react'
import { STORAGE_KEY } from '../../constants'
import PinModal from '../field/PinModal'

export default function SetupScreen({ data, updateData }) {
  const [confirmReset, setConfirmReset] = useState(false)
  const [deletePlayerId, setDeletePlayerId] = useState(null)
  const [showDeletePin, setShowDeletePin] = useState(false)

  const setTeamName = (name) => {
    updateData((prev) => ({ ...prev, teamName: name }))
  }

  const addPlayer = () => {
    const id = 'p' + Date.now() + Math.random().toString(36).slice(2, 6)
    updateData((prev) => ({
      ...prev,
      roster: [...prev.roster, { id, name: '', jerseyNumber: '', nickname: '' }],
    }))
  }

  const updatePlayer = (id, field, value) => {
    updateData((prev) => ({
      ...prev,
      roster: prev.roster.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    }))
  }

  // Step 1: user taps X → ask for PIN
  const handleRemovePlayerRequest = (id) => {
    setDeletePlayerId(id)
    setShowDeletePin(true)
  }

  // Step 2: PIN confirmed → actually delete
  const handleDeletePinConfirm = () => {
    setShowDeletePin(false)
    if (deletePlayerId) {
      updateData((prev) => ({
        ...prev,
        roster: prev.roster.filter((p) => p.id !== deletePlayerId),
      }))
      setDeletePlayerId(null)
    }
  }

  const handleDeletePinCancel = () => {
    setShowDeletePin(false)
    setDeletePlayerId(null)
  }

  const addGame = () => {
    const id = 'g' + Date.now() + Math.random().toString(36).slice(2, 6)
    updateData((prev) => ({
      ...prev,
      schedule: [...prev.schedule, { id, date: '', opponent: '' }],
    }))
  }

  const importSchedule = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result)
        if (!Array.isArray(imported)) {
          alert('Invalid schedule file: expected an array of games')
          return
        }
        if (data.schedule.length > 0) {
          if (!confirm(`Replace ${data.schedule.length} existing games with ${imported.length} imported games?`)) {
            return
          }
        }
        const newGames = imported.map((g, i) => ({
          id: 'g' + (Date.now() + i) + Math.random().toString(36).slice(2, 6),
          date: g.date || '',
          opponent: g.opponent || '',
        }))
        updateData((prev) => ({
          ...prev,
          schedule: newGames,
        }))
      } catch (err) {
        alert('Invalid schedule file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const updateGame = (id, field, value) => {
    updateData((prev) => ({
      ...prev,
      schedule: prev.schedule.map((g) => (g.id === id ? { ...g, [field]: value } : g)),
    }))
  }

  const removeGame = (id) => {
    updateData((prev) => ({
      ...prev,
      schedule: prev.schedule.filter((g) => g.id !== id),
    }))
  }

  const handleReset = () => {
    if (confirmReset) {
      localStorage.removeItem(STORAGE_KEY)
      window.location.reload()
    } else {
      setConfirmReset(true)
      setTimeout(() => setConfirmReset(false), 3000)
    }
  }

  const exportData = () => {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${data.teamName || 'baseball'}-backup.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result)
        if (imported.roster && imported.schedule) {
          updateData(() => imported)
        }
      } catch (err) {
        alert('Invalid backup file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Find the player being deleted for display
  const playerToDelete = deletePlayerId
    ? data.roster.find((p) => p.id === deletePlayerId)
    : null

  return (
    <div>
      <div className="screen-title">Team Setup</div>

      {/* Team Name */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Team Name</label>
        <input
          className="input"
          type="text"
          placeholder="Enter team name..."
          value={data.teamName}
          onChange={(e) => setTeamName(e.target.value)}
        />
      </div>

      {/* Roster */}
      <div className="section-title">Roster ({data.roster.length} players)</div>
      {data.roster.map((player, idx) => (
        <div key={player.id} style={rosterCardStyle}>
          <div style={rowStyle}>
            <input
              style={numInputStyle}
              type="number"
              placeholder="#"
              value={player.jerseyNumber}
              onChange={(e) => updatePlayer(player.id, 'jerseyNumber', e.target.value)}
            />
            <input
              style={nameInputStyle}
              type="text"
              placeholder="Full name..."
              value={player.name}
              onChange={(e) => updatePlayer(player.id, 'name', e.target.value)}
            />
            <button style={removeBtn} onClick={() => handleRemovePlayerRequest(player.id)}>✕</button>
          </div>
          <div style={{ paddingLeft: 72 }}>
            <input
              style={nicknameInputStyle}
              type="text"
              placeholder="Nickname (optional, shown on field)..."
              value={player.nickname || ''}
              onChange={(e) => updatePlayer(player.id, 'nickname', e.target.value)}
            />
          </div>
        </div>
      ))}
      <button className="btn btn--accent btn--full" onClick={addPlayer} style={{ marginTop: 8 }}>
        + Add Player
      </button>

      {/* Schedule */}
      <div className="section-title">Game Schedule ({data.schedule.length} games)</div>
      {data.schedule.map((game) => (
        <div key={game.id} style={rowStyle}>
          <input
            style={dateInputStyle}
            type="date"
            value={game.date}
            onChange={(e) => updateGame(game.id, 'date', e.target.value)}
          />
          <input
            style={nameInputStyle}
            type="text"
            placeholder="vs Opponent..."
            value={game.opponent}
            onChange={(e) => updateGame(game.id, 'opponent', e.target.value)}
          />
          <button style={removeBtn} onClick={() => removeGame(game.id)}>✕</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button className="btn btn--accent btn--full" onClick={addGame} style={{ flex: 1 }}>
          + Add Game
        </button>
        <label className="btn btn--full" style={{ flex: 1, cursor: 'pointer', textAlign: 'center' }}>
          Import Schedule
          <input type="file" accept=".json" onChange={importSchedule} style={{ display: 'none' }} />
        </label>
      </div>

      {/* Data management */}
      <div className="section-title">Data Management</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
        <button className="btn" onClick={exportData} style={{ flex: 1 }}>
          Export Backup
        </button>
        <label className="btn" style={{ flex: 1, cursor: 'pointer' }}>
          Import Backup
          <input type="file" accept=".json" onChange={importData} style={{ display: 'none' }} />
        </label>
      </div>
      <button
        className={`btn btn--full ${confirmReset ? 'btn--danger' : ''}`}
        onClick={handleReset}
        style={{ marginTop: 10 }}
      >
        {confirmReset ? 'Tap again to confirm RESET' : 'Reset All Data'}
      </button>

      {/* Delete player PIN modal */}
      {showDeletePin && (
        <PinModal
          message={`PIN to remove ${playerToDelete ? `#${playerToDelete.jerseyNumber} ${playerToDelete.nickname || playerToDelete.name}` : 'player'}`}
          onConfirm={handleDeletePinConfirm}
          onCancel={handleDeletePinCancel}
        />
      )}
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: 14,
  fontWeight: 700,
  color: '#888',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: 1,
}

const rosterCardStyle = {
  marginBottom: 8,
  padding: '8px 0',
  borderBottom: '1px solid #2a2a2a',
}

const rowStyle = {
  display: 'flex',
  gap: 8,
  marginBottom: 4,
  alignItems: 'center',
}

const nicknameInputStyle = {
  width: '100%',
  minHeight: 36,
  padding: '6px 10px',
  border: '1px solid #333',
  borderRadius: 6,
  background: '#1e1e1e',
  color: '#00E5FF',
  fontSize: 14,
  fontStyle: 'italic',
}

const numInputStyle = {
  width: 64,
  minHeight: 48,
  padding: '8px 10px',
  border: '2px solid #444',
  borderRadius: 8,
  background: '#252525',
  color: '#FFD700',
  fontSize: 18,
  fontWeight: 700,
  textAlign: 'center',
}

const nameInputStyle = {
  flex: 1,
  minHeight: 48,
  padding: '8px 12px',
  border: '2px solid #444',
  borderRadius: 8,
  background: '#252525',
  color: '#FFF',
  fontSize: 16,
}

const dateInputStyle = {
  width: 150,
  minHeight: 48,
  padding: '8px 10px',
  border: '2px solid #444',
  borderRadius: 8,
  background: '#252525',
  color: '#FFF',
  fontSize: 14,
  colorScheme: 'dark',
}

const removeBtn = {
  width: 44,
  height: 44,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '2px solid #FF1744',
  borderRadius: 8,
  background: 'transparent',
  color: '#FF1744',
  fontSize: 18,
  fontWeight: 700,
  cursor: 'pointer',
  flexShrink: 0,
}
