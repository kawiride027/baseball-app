import { useState } from 'react'
import { POSITIONS, INNINGS, ordinalInning } from '../../constants'

export default function GameHistoryScreen({ schedule, games, roster }) {
  const [selectedGameId, setSelectedGameId] = useState(null)

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No date'
    try {
      const d = new Date(dateStr + 'T12:00:00')
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    } catch {
      return dateStr
    }
  }

  // Only show games that have been set up (have assignments)
  const completedGames = schedule.filter((g) => {
    const gameData = games[g.id]
    return gameData && gameData.setupComplete
  })

  const selectedGame = selectedGameId ? games[selectedGameId] : null
  const selectedSchedule = selectedGameId
    ? schedule.find((g) => g.id === selectedGameId)
    : null

  const getPlayerPosition = (playerId, inning, assignments) => {
    const assignment = assignments[String(inning)]
    if (!assignment) return null
    for (const pos of POSITIONS) {
      if (assignment[pos] === playerId) return pos
    }
    if (assignment.BENCH && assignment.BENCH.includes(playerId)) return 'BENCH'
    return null
  }

  // Count positions per player across a game
  const getPositionSummary = (playerId, assignments) => {
    const counts = {}
    for (let i = 1; i <= INNINGS; i++) {
      const pos = getPlayerPosition(playerId, i, assignments)
      if (pos) {
        counts[pos] = (counts[pos] || 0) + 1
      }
    }
    return counts
  }

  const innings = Array.from({ length: INNINGS }, (_, i) => i + 1)

  if (completedGames.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div className="screen-title">Game History</div>
        <p style={{ fontSize: 18, color: '#888', marginBottom: 16 }}>
          No completed games yet
        </p>
        <p style={{ fontSize: 14, color: '#555' }}>
          Games will appear here after you set up lineups
        </p>
      </div>
    )
  }

  // Detail view for a selected game
  if (selectedGame && selectedSchedule) {
    const battingOrder = selectedGame.battingOrder || []
    // Use batting order to determine display order, fall back to roster
    const displayRoster = battingOrder.length > 0
      ? battingOrder.map((id) => roster.find((p) => p.id === id)).filter(Boolean)
      : roster

    // Find players who were absent (in roster but not in any inning)
    const absentPlayers = roster.filter((p) => {
      for (let i = 1; i <= INNINGS; i++) {
        const pos = getPlayerPosition(p.id, i, selectedGame.assignments)
        if (pos) return false
      }
      return true
    })

    return (
      <div>
        <button
          onClick={() => setSelectedGameId(null)}
          style={styles.backBtn}
        >
          ← Back to Games
        </button>

        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
            {formatDate(selectedSchedule.date)}
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#FFD700' }}>
            {selectedSchedule.opponent?.startsWith('@ ')
              ? `@ ${selectedSchedule.opponent.slice(2)}`
              : `vs ${selectedSchedule.opponent || 'TBD'}`}
          </div>
          <div style={{ fontSize: 13, color: '#888' }}>
            {selectedGame.isHome ? '🏠 HOME' : '🚌 AWAY'}
          </div>
          {selectedGame.completed && selectedGame.score && (
            <div style={{
              fontSize: 20,
              fontWeight: 900,
              marginTop: 4,
              color: selectedGame.result === 'W' ? '#00C853' : selectedGame.result === 'L' ? '#FF1744' : '#FF9800',
            }}>
              {selectedGame.result === 'W' ? 'WIN' : selectedGame.result === 'L' ? 'LOSS' : 'TIE'}{' '}
              {selectedGame.score.us}–{selectedGame.score.them}
            </div>
          )}
        </div>

        {/* Lineup grid */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>Player</th>
                {innings.map((inn) => (
                  <th key={inn} style={thStyle}>{ordinalInning(inn)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRoster.map((player, idx) => {
                const summary = getPositionSummary(player.id, selectedGame.assignments)
                const benchCount = summary.BENCH || 0
                const fieldCount = Object.entries(summary)
                  .filter(([k]) => k !== 'BENCH')
                  .reduce((sum, [, v]) => sum + v, 0)

                return (
                  <tr key={player.id}>
                    <td style={orderStyle}>{idx + 1}</td>
                    <td style={nameStyle}>
                      <span style={{ color: '#FFD700', marginRight: 4 }}>#{player.jerseyNumber}</span>
                      {player.nickname || player.name}
                    </td>
                    {innings.map((inning) => {
                      const pos = getPlayerPosition(player.id, inning, selectedGame.assignments)
                      const isBench = pos === 'BENCH'
                      return (
                        <td
                          key={inning}
                          style={{
                            ...cellStyle,
                            background: isBench ? '#333' : pos ? '#1a472a' : '#1a1a1a',
                            color: isBench ? '#888' : pos ? '#00C853' : '#444',
                            fontWeight: 700,
                            fontSize: 13,
                          }}
                        >
                          {pos === 'BENCH' ? 'BN' : pos || '-'}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Position summary per player */}
        <div style={styles.summarySection}>
          <div style={styles.summaryTitle}>Position Summary</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {displayRoster.map((player) => {
              const summary = getPositionSummary(player.id, selectedGame.assignments)
              const entries = Object.entries(summary).filter(([k]) => k !== 'BENCH')
              const benchCount = summary.BENCH || 0
              return (
                <div key={player.id} style={styles.summaryRow}>
                  <div style={{ minWidth: 100 }}>
                    <span style={{ color: '#FFD700', fontSize: 12 }}>#{player.jerseyNumber}</span>{' '}
                    <span style={{ color: '#FFF', fontWeight: 700, fontSize: 14 }}>
                      {player.nickname || player.name.split(' ')[0]}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flex: 1 }}>
                    {entries.map(([pos, count]) => (
                      <span key={pos} style={styles.posChip}>
                        {pos} ×{count}
                      </span>
                    ))}
                    {benchCount > 0 && (
                      <span style={{ ...styles.posChip, background: '#333', color: '#888', borderColor: '#555' }}>
                        BN ×{benchCount}
                      </span>
                    )}
                    {entries.length === 0 && benchCount === 0 && (
                      <span style={{ color: '#555', fontSize: 12 }}>Absent</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Batting order */}
        {battingOrder.length > 0 && (
          <div style={styles.summarySection}>
            <div style={styles.summaryTitle}>Batting Order</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {battingOrder.map((id, idx) => {
                const p = roster.find((r) => r.id === id)
                if (!p) return null
                return (
                  <div key={id} style={styles.batChip}>
                    <span style={{ color: '#FFD700', fontWeight: 900 }}>{idx + 1}.</span>{' '}
                    #{p.jerseyNumber} {p.nickname || p.name.split(' ')[0]}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Absent players */}
        {absentPlayers.length > 0 && (
          <div style={styles.summarySection}>
            <div style={{ ...styles.summaryTitle, color: '#FF9800' }}>Absent</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {absentPlayers.map((p) => (
                <div key={p.id} style={{ ...styles.batChip, borderColor: '#555', color: '#888' }}>
                  #{p.jerseyNumber} {p.nickname || p.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Games list
  return (
    <div>
      <div className="screen-title">Game History</div>
      <div style={{ fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 16 }}>
        Tap a game to view the full lineup
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {completedGames.map((game) => {
          const gameData = games[game.id]
          const homeAway = gameData.isHome ? 'HOME' : 'AWAY'

          return (
            <button
              key={game.id}
              onClick={() => setSelectedGameId(game.id)}
              style={styles.gameCard}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                  {formatDate(game.date)}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#FFF' }}>
                  {game.opponent?.startsWith('@ ')
                    ? `@ ${game.opponent.slice(2)}`
                    : `vs ${game.opponent || 'TBD'}`}
                </div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  {homeAway === 'HOME' ? '🏠' : '🚌'} {homeAway}
                  {gameData.completed && gameData.score && (
                    <span style={{
                      marginLeft: 8,
                      fontWeight: 900,
                      color: gameData.result === 'W' ? '#00C853' : gameData.result === 'L' ? '#FF1744' : '#FF9800',
                    }}>
                      {gameData.result === 'W' ? 'W' : gameData.result === 'L' ? 'L' : 'T'}{' '}
                      {gameData.score.us}–{gameData.score.them}
                    </span>
                  )}
                </div>
              </div>
              <div style={styles.viewBtn}>
                VIEW ▶
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const thStyle = {
  padding: '8px 4px',
  fontSize: 12,
  fontWeight: 700,
  color: '#FFD700',
  borderBottom: '2px solid #333',
  textAlign: 'center',
  position: 'sticky',
  top: 0,
  background: '#121212',
  zIndex: 1,
}

const orderStyle = {
  padding: '6px 4px',
  fontSize: 12,
  fontWeight: 700,
  color: '#888',
  borderBottom: '1px solid #2a2a2a',
  textAlign: 'center',
  width: 30,
}

const nameStyle = {
  padding: '8px 6px',
  fontSize: 13,
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
  padding: '6px 3px',
  textAlign: 'center',
  borderBottom: '1px solid #2a2a2a',
  borderLeft: '1px solid #2a2a2a',
  minWidth: 42,
}

const styles = {
  gameCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    background: '#252525',
    border: '2px solid #333',
    borderRadius: 12,
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  viewBtn: {
    padding: '8px 16px',
    background: '#1a472a',
    color: '#00C853',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 900,
    flexShrink: 0,
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: '#252525',
    border: '2px solid #444',
    borderRadius: 8,
    color: '#FFF',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    marginBottom: 12,
  },
  summarySection: {
    padding: 12,
    background: '#1a1a1a',
    borderRadius: 10,
    border: '1px solid #333',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#00E5FF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  summaryRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 0',
  },
  posChip: {
    padding: '3px 8px',
    background: 'rgba(0,200,83,0.15)',
    border: '1px solid #00C853',
    borderRadius: 6,
    color: '#00C853',
    fontSize: 12,
    fontWeight: 700,
  },
  batChip: {
    padding: '6px 10px',
    background: '#252525',
    borderRadius: 8,
    border: '1px solid #444',
    color: '#FFF',
    fontSize: 13,
    fontWeight: 700,
  },
}
