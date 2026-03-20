import { useState, useMemo } from 'react'
import { POSITIONS, INNINGS, ordinalInning } from '../../constants'

const POS_OPTIONS = [...POSITIONS, 'BENCH']

// Compute position history across all completed games for every player
function buildPositionHistory(roster, games, activeGameId) {
  const history = {}
  roster.forEach((p) => {
    const counts = {}
    POSITIONS.forEach((pos) => { counts[pos] = 0 })
    counts.BENCH = 0
    history[p.id] = { counts, totalInnings: 0, gamesPlayed: 0 }
  })

  // Walk through all completed games (skip the current one being set up)
  Object.entries(games).forEach(([gameId, gameData]) => {
    if (gameId === activeGameId) return
    if (!gameData || !gameData.setupComplete || !gameData.assignments) return

    // Track which players appeared in this game
    const playersInGame = new Set()

    for (let i = 1; i <= INNINGS; i++) {
      const assignment = gameData.assignments[String(i)]
      if (!assignment) continue

      POSITIONS.forEach((pos) => {
        const pid = assignment[pos]
        if (pid && history[pid]) {
          history[pid].counts[pos]++
          history[pid].totalInnings++
          playersInGame.add(pid)
        }
      })

      if (assignment.BENCH) {
        assignment.BENCH.forEach((pid) => {
          if (history[pid]) {
            history[pid].counts.BENCH++
            history[pid].totalInnings++
            playersInGame.add(pid)
          }
        })
      }
    }

    playersInGame.forEach((pid) => {
      if (history[pid]) history[pid].gamesPlayed++
    })
  })

  return history
}

function PlayerStatsPanel({ player, history }) {
  const stats = history[player.id]
  if (!stats || stats.totalInnings === 0) {
    return (
      <div style={statStyles.container}>
        <div style={statStyles.noData}>No previous game data — first game!</div>
      </div>
    )
  }

  const maxCount = Math.max(...Object.values(stats.counts), 1)
  const neverPlayed = POSITIONS.filter((pos) => stats.counts[pos] === 0)
  const benchCount = stats.counts.BENCH

  // Find most and least played field positions (excluding bench)
  const fieldPositions = POSITIONS.map((pos) => ({ pos, count: stats.counts[pos] }))
    .sort((a, b) => b.count - a.count)
  const mostPlayed = fieldPositions.filter((p) => p.count > 0).slice(0, 3)
  const leastPlayed = fieldPositions.filter((p) => p.count > 0).sort((a, b) => a.count - b.count).slice(0, 2)

  return (
    <div style={statStyles.container}>
      <div style={statStyles.header}>
        Season Stats · {stats.gamesPlayed} game{stats.gamesPlayed !== 1 ? 's' : ''} · {stats.totalInnings} innings
      </div>

      {/* Position bar chart */}
      <div style={statStyles.chartGrid}>
        {POSITIONS.map((pos) => {
          const count = stats.counts[pos]
          const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
          const isZero = count === 0
          return (
            <div key={pos} style={statStyles.chartRow}>
              <div style={{
                ...statStyles.chartLabel,
                color: isZero ? '#FF9800' : '#00E5FF',
              }}>
                {pos}
              </div>
              <div style={statStyles.chartBarBg}>
                <div style={{
                  ...statStyles.chartBarFill,
                  width: `${pct}%`,
                  background: isZero ? 'transparent' : count <= 1 ? '#FF9800' : '#00C853',
                }} />
              </div>
              <div style={{
                ...statStyles.chartCount,
                color: isZero ? '#FF9800' : '#AAA',
                fontWeight: isZero ? 900 : 700,
              }}>
                {count === 0 ? '0!' : count}
              </div>
            </div>
          )
        })}
        <div style={statStyles.chartRow}>
          <div style={{ ...statStyles.chartLabel, color: '#888' }}>BN</div>
          <div style={statStyles.chartBarBg}>
            <div style={{
              ...statStyles.chartBarFill,
              width: `${maxCount > 0 ? (benchCount / maxCount) * 100 : 0}%`,
              background: '#555',
            }} />
          </div>
          <div style={{ ...statStyles.chartCount, color: '#888' }}>{benchCount}</div>
        </div>
      </div>

      {/* Suggestions */}
      {neverPlayed.length > 0 && (
        <div style={statStyles.suggestion}>
          <span style={{ color: '#FF9800', fontWeight: 900 }}>Never played:</span>{' '}
          {neverPlayed.join(', ')}
        </div>
      )}
      {leastPlayed.length > 0 && leastPlayed[0].count > 0 && leastPlayed[0].count <= 2 && (
        <div style={statStyles.suggestion}>
          <span style={{ color: '#00E5FF', fontWeight: 900 }}>Needs more time at:</span>{' '}
          {leastPlayed.map((p) => `${p.pos} (${p.count}×)`).join(', ')}
        </div>
      )}
    </div>
  )
}

export default function PreGameWizard({ roster, onComplete, onCancel, opponent, games = {}, activeGameId, initialAbsentIds = [] }) {
  const [playerIndex, setPlayerIndex] = useState(0)
  const [absentIds, setAbsentIds] = useState(initialAbsentIds)
  const [showStats, setShowStats] = useState(true)
  const [conflictMsg, setConflictMsg] = useState(null)

  // Per-player selections: { [playerId]: { "1": "P", "2": "SS", ... } }
  const [selections, setSelections] = useState(() => {
    const s = {}
    roster.forEach((p) => {
      s[p.id] = {}
      for (let i = 1; i <= INNINGS; i++) {
        s[p.id][String(i)] = ''
      }
    })
    return s
  })

  // Build position history once (memoized)
  const positionHistory = useMemo(
    () => buildPositionHistory(roster, games, activeGameId),
    [roster, games, activeGameId]
  )

  // Filter out absent players
  const activePlayers = roster.filter((p) => !absentIds.includes(p.id))
  const currentPlayer = activePlayers[playerIndex]
  const isLastPlayer = playerIndex >= activePlayers.length - 1

  // Check if a position is taken by another player in a given inning
  const getConflict = (inning, pos) => {
    if (!pos || pos === 'BENCH' || pos === '') return null
    for (const p of activePlayers) {
      if (currentPlayer && p.id === currentPlayer.id) continue
      if (selections[p.id]?.[String(inning)] === pos) return p
    }
    return null
  }

  // Update a single inning selection for the current player (with conflict check)
  const handleSelect = (inning, value) => {
    if (!currentPlayer) return
    setConflictMsg(null)

    const conflict = getConflict(inning, value)
    if (conflict) {
      const name = conflict.nickname || conflict.name.split(' ')[0]
      setConflictMsg(`#${conflict.jerseyNumber} ${name} is already ${value} in the ${ordinalInning(inning)} inning`)
      // Still allow selection (coach might want to override) but warn them
    }

    setSelections((prev) => ({
      ...prev,
      [currentPlayer.id]: {
        ...prev[currentPlayer.id],
        [String(inning)]: value,
      },
    }))
  }

  // Quick-fill with conflict checking — fills all innings and reports conflicts
  const handleQuickFill = (pos) => {
    if (!currentPlayer) return
    setConflictMsg(null)

    const conflicts = []
    for (let i = 1; i <= INNINGS; i++) {
      const conflict = getConflict(i, pos)
      if (conflict) {
        const name = conflict.nickname || conflict.name.split(' ')[0]
        conflicts.push(`${ordinalInning(i)}: #${conflict.jerseyNumber} ${name}`)
      }
    }

    // Apply the fill
    setSelections((prev) => {
      const updated = { ...prev[currentPlayer.id] }
      for (let i = 1; i <= INNINGS; i++) {
        updated[String(i)] = pos
      }
      return { ...prev, [currentPlayer.id]: updated }
    })

    if (conflicts.length > 0) {
      setConflictMsg(`⚠ ${pos} conflict — already taken by: ${conflicts.join(', ')}`)
    }
  }

  // Check if all innings are filled for this player
  const allInningsFilled = currentPlayer
    ? Array.from({ length: INNINGS }, (_, i) => selections[currentPlayer.id]?.[String(i + 1)])
        .every((v) => v && v !== '')
    : false

  // Mark current player as absent
  const handleAbsent = () => {
    if (!currentPlayer) return
    const pid = currentPlayer.id
    setAbsentIds((prev) => [...prev, pid])
    // Clear their selections
    setSelections((prev) => {
      const updated = { ...prev }
      updated[pid] = {}
      for (let i = 1; i <= INNINGS; i++) {
        updated[pid][String(i)] = ''
      }
      return updated
    })
    setPlayerIndex((prev) => {
      const newActive = roster.filter((p) => ![...absentIds, pid].includes(p.id))
      if (prev >= newActive.length) return Math.max(0, newActive.length - 1)
      return prev
    })
  }

  // Unmark a player as absent
  const handleUnabsent = (pid) => {
    setAbsentIds((prev) => prev.filter((id) => id !== pid))
  }

  // Advance to next player
  const handleNext = () => {
    if (playerIndex < activePlayers.length - 1) {
      setPlayerIndex(playerIndex + 1)
      setConflictMsg(null)
    }
  }

  // Go back to previous player
  const handleBack = () => {
    if (playerIndex > 0) {
      setPlayerIndex(playerIndex - 1)
      setConflictMsg(null)
    }
  }

  // Build final assignments and complete
  const handleFinish = () => {
    const assignments = {}
    for (let i = 1; i <= INNINGS; i++) {
      const inning = {}
      POSITIONS.forEach((pos) => { inning[pos] = null })
      inning.BENCH = []

      activePlayers.forEach((player) => {
        const pos = selections[player.id]?.[String(i)] || 'BENCH'
        if (pos === 'BENCH') {
          inning.BENCH.push(player.id)
        } else {
          if (inning[pos]) {
            inning.BENCH.push(inning[pos])
          }
          inning[pos] = player.id
        }
      })

      assignments[String(i)] = inning
    }
    onComplete(assignments, absentIds)
  }

  // Get which positions are taken for a given inning (by other active players)
  const getTakenPositions = (inning) => {
    const taken = {}
    activePlayers.forEach((p) => {
      if (currentPlayer && p.id === currentPlayer.id) return
      const pos = selections[p.id]?.[String(inning)]
      if (pos && pos !== 'BENCH' && pos !== '') {
        taken[pos] = p
      }
    })
    return taken
  }

  if (!currentPlayer) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#FF9800', marginBottom: 16 }}>
            All players marked absent!
          </div>
          <p style={{ color: '#888', marginBottom: 20 }}>Unmark some players to continue setup.</p>
          {absentIds.map((pid) => {
            const p = roster.find((r) => r.id === pid)
            if (!p) return null
            return (
              <button
                key={pid}
                onClick={() => handleUnabsent(pid)}
                style={styles.unabsentBtn}
              >
                ↩ Bring back #{p.jerseyNumber} {p.name}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Progress */}
      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${((playerIndex + 1) / activePlayers.length) * 100}%` }} />
      </div>
      <div style={styles.progressText}>
        Player {playerIndex + 1} of {activePlayers.length}
        {absentIds.length > 0 && ` · ${absentIds.length} absent`}
      </div>

      {/* Player header */}
      <div style={styles.playerHeader}>
        <div style={styles.jerseyBig}>#{currentPlayer.jerseyNumber}</div>
        <div style={styles.playerName}>
          {currentPlayer.nickname || currentPlayer.name}
        </div>
      </div>

      {/* Season stats panel (collapsible) */}
      <div style={statStyles.toggleRow}>
        <button
          onClick={() => setShowStats(!showStats)}
          style={statStyles.toggleBtn}
        >
          {showStats ? '▼' : '▶'} Season Position History
        </button>
      </div>
      {showStats && (
        <PlayerStatsPanel player={currentPlayer} history={positionHistory} />
      )}

      {/* Conflict error banner */}
      {conflictMsg && (
        <div style={styles.conflictBanner}>
          {conflictMsg}
        </div>
      )}

      {/* All inning dropdowns at once */}
      <div style={styles.inningGrid}>
        {Array.from({ length: INNINGS }, (_, i) => {
          const inning = i + 1
          const value = selections[currentPlayer.id]?.[String(inning)] || ''
          const taken = getTakenPositions(inning)
          const hasConflict = value && value !== 'BENCH' && taken[value]

          return (
            <div key={inning}>
              <div style={{
                ...styles.inningRow,
                borderLeft: hasConflict ? '3px solid #FF1744' : '3px solid transparent',
                paddingLeft: 4,
              }}>
                <div style={styles.inningLabel}>
                  {ordinalInning(inning)}
                </div>
                <select
                  value={value}
                  onChange={(e) => handleSelect(inning, e.target.value)}
                  style={{
                    ...styles.dropdown,
                    borderColor: hasConflict ? '#FF1744' : value ? '#00C853' : '#555',
                    color: value ? '#FFF' : '#888',
                  }}
                >
                  <option value="">— Select —</option>
                  {POS_OPTIONS.map((pos) => {
                    const takenBy = taken[pos]
                    const neverPlayed = pos !== 'BENCH' && positionHistory[currentPlayer.id]?.counts[pos] === 0
                    return (
                      <option key={pos} value={pos}>
                        {pos}{neverPlayed ? ' ★NEW' : ''}{takenBy ? ` ⚠ (${takenBy.nickname || takenBy.name.split(' ')[0]})` : ''}
                      </option>
                    )
                  })}
                </select>
                {hasConflict ? (
                  <div style={styles.conflictMark}>⚠</div>
                ) : value ? (
                  <div style={styles.checkmark}>✓</div>
                ) : null}
              </div>
              {hasConflict && (
                <div style={styles.conflictRowMsg}>
                  #{taken[value].jerseyNumber} {taken[value].nickname || taken[value].name.split(' ')[0]} is already {value}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Quick-fill: same position all innings */}
      <div style={styles.quickFillSection}>
        <div style={styles.quickFillLabel}>Quick fill — same position all innings:</div>
        <div style={styles.quickFillRow}>
          {POS_OPTIONS.map((pos) => {
            const neverPlayed = pos !== 'BENCH' && positionHistory[currentPlayer.id]?.counts[pos] === 0
            return (
              <button
                key={pos}
                onClick={() => handleQuickFill(pos)}
                style={{
                  ...styles.quickFillBtn,
                  borderColor: neverPlayed ? '#FF9800' : '#555',
                  color: neverPlayed ? '#FF9800' : '#FFD700',
                }}
              >
                {pos}{neverPlayed ? '★' : ''}
              </button>
            )
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div style={styles.actionRow}>
        {playerIndex > 0 && (
          <button onClick={handleBack} style={styles.backBtn}>
            ◀ Back
          </button>
        )}

        <button
          onClick={handleAbsent}
          style={styles.absentBtn}
        >
          ❌ Absent
        </button>

        {!isLastPlayer ? (
          <button
            onClick={handleNext}
            disabled={!allInningsFilled}
            style={{
              ...styles.nextBtn,
              opacity: allInningsFilled ? 1 : 0.4,
            }}
          >
            Next Player ▶
          </button>
        ) : (
          <button
            onClick={handleFinish}
            disabled={!allInningsFilled}
            style={{
              ...styles.finishBtn,
              opacity: allInningsFilled ? 1 : 0.4,
            }}
          >
            ✅ All Set — Start Game!
          </button>
        )}
      </div>

      {/* Absent players list */}
      {absentIds.length > 0 && (
        <div style={styles.absentSection}>
          <div style={styles.absentTitle}>Absent ({absentIds.length}):</div>
          <div style={styles.absentList}>
            {absentIds.map((pid) => {
              const p = roster.find((r) => r.id === pid)
              if (!p) return null
              return (
                <button
                  key={pid}
                  onClick={() => handleUnabsent(pid)}
                  style={styles.absentChip}
                >
                  #{p.jerseyNumber} {(p.nickname || p.name).split(' ')[0]} ↩
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Game info */}
      <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: '#555' }}>
        Pre-game setup {opponent ? `· vs ${opponent}` : ''}
      </div>

      {onCancel && (
        <button
          onClick={onCancel}
          style={{
            width: '100%',
            minHeight: 44,
            fontSize: 14,
            fontWeight: 700,
            border: 'none',
            borderRadius: 10,
            background: 'transparent',
            color: '#666',
            cursor: 'pointer',
            padding: '10px 16px',
            marginTop: 8,
          }}
        >
          Cancel Setup
        </button>
      )}
    </div>
  )
}

const statStyles = {
  toggleRow: {
    marginBottom: 4,
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: '#00E5FF',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    padding: '4px 0',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  container: {
    padding: '12px 14px',
    background: '#1a1a1a',
    borderRadius: 10,
    border: '1px solid #333',
    marginBottom: 12,
  },
  header: {
    fontSize: 11,
    fontWeight: 700,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  noData: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },
  chartGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    marginBottom: 8,
  },
  chartRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    paddingRight: 2,
  },
  chartLabel: {
    fontSize: 11,
    fontWeight: 900,
    width: 30,
    minWidth: 30,
    textAlign: 'right',
    flexShrink: 0,
  },
  chartBarBg: {
    flex: 1,
    height: 14,
    background: '#252525',
    borderRadius: 4,
    overflow: 'hidden',
    minWidth: 0,
  },
  chartBarFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },
  chartCount: {
    fontSize: 13,
    fontWeight: 700,
    width: 30,
    minWidth: 30,
    textAlign: 'center',
    flexShrink: 0,
  },
  suggestion: {
    fontSize: 12,
    color: '#CCC',
    padding: '4px 8px',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 6,
    marginTop: 4,
  },
}

const styles = {
  container: {
    padding: 4,
  },
  progressBar: {
    width: '100%',
    height: 6,
    background: '#333',
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#FFD700',
    borderRadius: 3,
    transition: 'width 0.3s ease',
  },
  progressText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  playerHeader: {
    textAlign: 'center',
    marginBottom: 8,
  },
  jerseyBig: {
    fontSize: 36,
    fontWeight: 900,
    color: '#FFD700',
    lineHeight: 1,
  },
  playerName: {
    fontSize: 28,
    fontWeight: 700,
    color: '#FFF',
    marginTop: 4,
  },
  inningGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginBottom: 16,
  },
  inningRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  inningLabel: {
    fontSize: 16,
    fontWeight: 900,
    color: '#00E5FF',
    minWidth: 60,
    textAlign: 'right',
  },
  dropdown: {
    flex: 1,
    minHeight: 48,
    fontSize: 18,
    fontWeight: 700,
    padding: '8px 12px',
    background: '#252525',
    border: '2px solid #555',
    borderRadius: 10,
    appearance: 'auto',
    WebkitAppearance: 'auto',
    cursor: 'pointer',
  },
  checkmark: {
    fontSize: 20,
    color: '#00C853',
    fontWeight: 900,
    minWidth: 28,
    textAlign: 'center',
  },
  conflictMark: {
    fontSize: 20,
    color: '#FF1744',
    fontWeight: 900,
    minWidth: 28,
    textAlign: 'center',
  },
  conflictBanner: {
    padding: '10px 14px',
    marginBottom: 12,
    background: 'rgba(255,23,68,0.15)',
    border: '2px solid #FF1744',
    borderRadius: 10,
    color: '#FF8A80',
    fontSize: 14,
    fontWeight: 700,
    textAlign: 'center',
  },
  conflictRowMsg: {
    fontSize: 12,
    color: '#FF8A80',
    fontWeight: 700,
    paddingLeft: 80,
    marginTop: 2,
  },
  quickFillSection: {
    marginBottom: 16,
    padding: 10,
    background: '#1a1a1a',
    borderRadius: 10,
    border: '1px solid #333',
  },
  quickFillLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  quickFillRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  quickFillBtn: {
    padding: '6px 10px',
    fontSize: 13,
    fontWeight: 700,
    background: '#333',
    color: '#FFD700',
    border: '1px solid #555',
    borderRadius: 6,
    cursor: 'pointer',
    minHeight: 36,
  },
  actionRow: {
    display: 'flex',
    gap: 10,
    marginBottom: 12,
  },
  backBtn: {
    minHeight: 52,
    fontSize: 16,
    fontWeight: 700,
    border: '2px solid #555',
    borderRadius: 10,
    background: '#2A2A2A',
    color: '#FFF',
    cursor: 'pointer',
    padding: '8px 16px',
  },
  absentBtn: {
    minHeight: 52,
    fontSize: 16,
    fontWeight: 700,
    border: '2px solid #FF1744',
    borderRadius: 10,
    background: 'rgba(255,23,68,0.1)',
    color: '#FF1744',
    cursor: 'pointer',
    padding: '8px 16px',
  },
  nextBtn: {
    flex: 1,
    minHeight: 52,
    fontSize: 18,
    fontWeight: 900,
    border: '2px solid #FFD700',
    borderRadius: 10,
    background: 'rgba(255,215,0,0.1)',
    color: '#FFD700',
    cursor: 'pointer',
    padding: '8px 16px',
  },
  finishBtn: {
    flex: 1,
    minHeight: 52,
    fontSize: 18,
    fontWeight: 900,
    border: '2px solid #00C853',
    borderRadius: 10,
    background: 'rgba(0,200,83,0.15)',
    color: '#00C853',
    cursor: 'pointer',
    padding: '8px 16px',
  },
  absentSection: {
    padding: 10,
    background: 'rgba(255,23,68,0.05)',
    borderRadius: 10,
    border: '1px solid #333',
  },
  absentTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#FF1744',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  absentList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  absentChip: {
    padding: '6px 10px',
    fontSize: 13,
    fontWeight: 700,
    background: '#2A2A2A',
    color: '#FF9800',
    border: '1px solid #555',
    borderRadius: 6,
    cursor: 'pointer',
  },
  unabsentBtn: {
    display: 'block',
    width: '100%',
    maxWidth: 300,
    margin: '8px auto',
    padding: '12px 16px',
    fontSize: 16,
    fontWeight: 700,
    background: '#2A2A2A',
    color: '#FF9800',
    border: '2px solid #FF9800',
    borderRadius: 10,
    cursor: 'pointer',
  },
}
