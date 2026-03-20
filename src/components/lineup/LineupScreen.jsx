import { useState } from 'react'
import { POSITIONS, INNINGS, ordinalInning } from '../../constants'

const ALL_OPTIONS = [...POSITIONS, 'BENCH']

export default function LineupScreen({ roster, assignments, updateAssignments, opponent, battingOrder }) {
  const [editing, setEditing] = useState(null) // { playerId, inning }

  // Order players by batting order, with any unordered players at the end
  const orderedRoster = battingOrder && battingOrder.length > 0
    ? [
        ...battingOrder.map(id => roster.find(p => p.id === id)).filter(Boolean),
        ...roster.filter(p => !battingOrder.includes(p.id)),
      ]
    : roster

  const getPlayerPosition = (playerId, inning) => {
    const assignment = assignments[String(inning)]
    if (!assignment) return null
    for (const pos of POSITIONS) {
      if (assignment[pos] === playerId) return pos
    }
    if (assignment.BENCH && assignment.BENCH.includes(playerId)) return 'BENCH'
    return null
  }

  const handleAssign = (playerId, inning, newPosition) => {
    const assignment = { ...assignments[String(inning)] }
    const bench = [...(assignment.BENCH || [])]
    const currentPos = getPlayerPosition(playerId, inning)

    // Remove player from current position
    if (currentPos && currentPos !== 'BENCH') {
      assignment[currentPos] = null
    } else if (currentPos === 'BENCH') {
      const idx = bench.indexOf(playerId)
      if (idx >= 0) bench.splice(idx, 1)
    }

    // Place player at new position
    if (newPosition === 'BENCH') {
      if (!bench.includes(playerId)) bench.push(playerId)
    } else {
      // If someone else is at the new position, move them to bench
      const displacedId = assignment[newPosition]
      if (displacedId && displacedId !== playerId) {
        if (!bench.includes(displacedId)) bench.push(displacedId)
      }
      assignment[newPosition] = playerId
    }

    assignment.BENCH = bench
    updateAssignments(inning, assignment)
    setEditing(null)
  }

  // Check for duplicate positions in an inning
  const getDuplicates = (inning) => {
    const assignment = assignments[String(inning)]
    if (!assignment) return new Set()
    const posCount = {}
    POSITIONS.forEach((pos) => {
      const pid = assignment[pos]
      if (pid) {
        posCount[pos] = (posCount[pos] || 0) + 1
      }
    })
    // Check if any player appears in multiple positions
    const playerPositions = {}
    POSITIONS.forEach((pos) => {
      const pid = assignment[pos]
      if (pid) {
        if (!playerPositions[pid]) playerPositions[pid] = []
        playerPositions[pid].push(pos)
      }
    })
    const dupes = new Set()
    Object.entries(playerPositions).forEach(([pid, positions]) => {
      if (positions.length > 1) positions.forEach((p) => dupes.add(`${inning}-${pid}`))
    })
    return dupes
  }

  const innings = Array.from({ length: INNINGS }, (_, i) => i + 1)

  return (
    <div>
      <div className="screen-title">
        Lineup {opponent ? `vs ${opponent}` : ''}
      </div>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
          <thead>
            <tr>
              <th style={thStyle}>Player</th>
              {innings.map((inn) => (
                <th key={inn} style={thStyle}>{ordinalInning(inn)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orderedRoster.map((player, idx) => (
              <tr key={player.id}>
                <td style={nameStyle}>
                  {battingOrder && battingOrder.includes(player.id) && (
                    <span style={{ color: '#888', fontSize: 12, marginRight: 6 }}>{idx + 1}.</span>
                  )}
                  <span style={{ color: '#FFD700', marginRight: 6 }}>#{player.jerseyNumber}</span>
                  {player.name}
                </td>
                {innings.map((inning) => {
                  const pos = getPlayerPosition(player.id, inning)
                  const isBench = pos === 'BENCH'
                  const isEditing = editing?.playerId === player.id && editing?.inning === inning

                  if (isEditing) {
                    return (
                      <td key={inning} style={cellStyle}>
                        <select
                          autoFocus
                          style={selectStyle}
                          value={pos || ''}
                          onChange={(e) => handleAssign(player.id, inning, e.target.value)}
                          onBlur={() => setEditing(null)}
                        >
                          <option value="">--</option>
                          {ALL_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt === 'BENCH' ? 'BN' : opt}</option>
                          ))}
                        </select>
                      </td>
                    )
                  }

                  return (
                    <td
                      key={inning}
                      style={{
                        ...cellStyle,
                        background: isBench ? '#333' : pos ? '#1a472a' : '#1a1a1a',
                        color: isBench ? '#888' : pos ? '#00C853' : '#444',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                      onClick={() => setEditing({ playerId: player.id, inning })}
                    >
                      {pos === 'BENCH' ? 'BN' : pos || '-'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 16, fontSize: 13, color: '#666', textAlign: 'center' }}>
        Tap any cell to change a player's position for that inning
      </div>
    </div>
  )
}

const thStyle = {
  padding: '10px 6px',
  fontSize: 14,
  fontWeight: 700,
  color: '#FFD700',
  borderBottom: '2px solid #333',
  textAlign: 'center',
  position: 'sticky',
  top: 0,
  background: '#121212',
  zIndex: 1,
}

const nameStyle = {
  padding: '10px 8px',
  fontSize: 14,
  fontWeight: 700,
  color: '#FFF',
  borderBottom: '1px solid #2a2a2a',
  whiteSpace: 'nowrap',
  position: 'sticky',
  left: 0,
  background: '#121212',
  zIndex: 1,
}

const cellStyle = {
  padding: '8px 4px',
  textAlign: 'center',
  borderBottom: '1px solid #2a2a2a',
  borderLeft: '1px solid #2a2a2a',
  minWidth: 50,
}

const selectStyle = {
  width: '100%',
  padding: 4,
  fontSize: 13,
  background: '#333',
  color: '#FFF',
  border: '2px solid #FFD700',
  borderRadius: 4,
}
