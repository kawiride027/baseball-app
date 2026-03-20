import { useState } from 'react'
import PinModal from '../field/PinModal'

export default function GameSelectScreen({ schedule, activeGameId, games, onSelectGame, onCancelGame, onResetGame, isParent }) {
  const today = new Date().toISOString().slice(0, 10)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [resetTarget, setResetTarget] = useState(null)

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No date'
    try {
      const d = new Date(dateStr + 'T12:00:00')
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    } catch {
      return dateStr
    }
  }

  const handleCancelRequest = (e, gameId) => {
    e.stopPropagation()
    setCancelTarget(gameId)
  }

  const handlePinConfirm = () => {
    if (cancelTarget) {
      const gameData = games?.[cancelTarget]
      onCancelGame(cancelTarget, !gameData?.cancelled)
    }
    setCancelTarget(null)
  }

  // Find the next upcoming game for parents (first non-completed, non-cancelled game with date >= today)
  const nextGameId = schedule.find((g) => {
    const gameData = games?.[g.id]
    const isCompleted = gameData?.completed
    const isCancelled = gameData?.cancelled
    return !isCompleted && !isCancelled && g.date >= today
  })?.id

  // Compute season record
  const record = { W: 0, L: 0, T: 0 }
  schedule.forEach((g) => {
    const gd = games?.[g.id]
    if (gd?.completed && gd?.result) {
      record[gd.result] = (record[gd.result] || 0) + 1
    }
  })
  const hasRecord = record.W + record.L + record.T > 0

  if (schedule.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div className="screen-title">{isParent ? 'Season Schedule' : 'Select a Game'}</div>
        <p style={{ fontSize: 18, color: '#888', marginBottom: 16 }}>
          No games scheduled yet
        </p>
        {!isParent && (
          <p style={{ fontSize: 14, color: '#555' }}>
            Go to Team Setup to import your season schedule
          </p>
        )}
      </div>
    )
  }

  const cancelTargetData = cancelTarget ? games?.[cancelTarget] : null
  const isUncancelling = cancelTargetData?.cancelled

  return (
    <div>
      <div className="screen-title">{isParent ? 'Season Schedule' : 'Select a Game'}</div>

      {/* Season record for parents */}
      {isParent && hasRecord && (
        <div style={{
          textAlign: 'center',
          marginBottom: 14,
          padding: '10px 16px',
          background: '#1a1a1a',
          borderRadius: 10,
          border: '1px solid #333',
        }}>
          <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            Season Record
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#00C853' }}>{record.W}W</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#FF1744' }}>{record.L}L</span>
            {record.T > 0 && <span style={{ fontSize: 20, fontWeight: 900, color: '#FF9800' }}>{record.T}T</span>}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {schedule.map((game) => {
          const isToday = game.date === today
          const isActive = game.id === activeGameId
          const gameData = games?.[game.id]
          const isSetUp = gameData?.setupComplete
          const isCompleted = gameData?.completed
          const isCancelled = gameData?.cancelled
          const homeAway = gameData ? (gameData.isHome ? 'HOME' : 'AWAY') : null
          const isNextGame = game.id === nextGameId

          // Parent view: read-only card (no click)
          if (isParent) {
            return (
              <div
                key={game.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  background: isCancelled ? '#1a1a1a' : isActive ? 'rgba(255,215,0,0.12)' : isNextGame ? 'rgba(0,229,255,0.08)' : '#252525',
                  border: isCancelled
                    ? '2px solid #555'
                    : isActive
                    ? '2px solid #FFD700'
                    : isNextGame
                    ? '2px solid #00E5FF'
                    : isToday
                    ? '2px solid #00E5FF'
                    : '2px solid #333',
                  borderRadius: 12,
                  opacity: isCancelled ? 0.5 : 1,
                }}
              >
                <div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: isCancelled ? '#555' : isToday ? '#00E5FF' : '#888',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    marginBottom: 4,
                  }}>
                    {formatDate(game.date)}
                    {isToday && !isCancelled && ' — TODAY'}
                  </div>
                  <div style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: isCancelled ? '#666' : '#FFF',
                    textDecoration: isCancelled ? 'line-through' : 'none',
                  }}>
                    {game.opponent?.startsWith('@ ')
                      ? `@ ${game.opponent.slice(2)}`
                      : `vs ${game.opponent || 'TBD'}`}
                  </div>
                  {isCancelled && (
                    <div style={{ fontSize: 14, fontWeight: 900, marginTop: 4, color: '#FF9800' }}>
                      CANCELLED
                    </div>
                  )}
                  {isCompleted && !isCancelled && gameData.score && (
                    <div style={{
                      fontSize: 16,
                      fontWeight: 900,
                      marginTop: 4,
                      color: gameData.result === 'W' ? '#00C853' : gameData.result === 'L' ? '#FF1744' : '#FF9800',
                    }}>
                      {gameData.result === 'W' ? 'WIN' : gameData.result === 'L' ? 'LOSS' : 'TIE'}{' '}
                      {gameData.score.us}{'–'}{gameData.score.them}
                    </div>
                  )}
                  {homeAway && !isCompleted && !isCancelled && (
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      {homeAway === 'HOME' ? '🏠' : '🚌'} {homeAway}
                    </div>
                  )}
                </div>
                {/* Status badge for parents */}
                {!isCancelled && (
                  <div style={{
                    padding: '8px 14px',
                    background: isCompleted
                      ? (gameData.result === 'W' ? 'rgba(0,200,83,0.15)' : gameData.result === 'L' ? 'rgba(255,23,68,0.15)' : 'rgba(255,152,0,0.15)')
                      : isActive
                      ? 'rgba(255,215,0,0.15)'
                      : isNextGame
                      ? 'rgba(0,229,255,0.15)'
                      : '#333',
                    color: isCompleted
                      ? (gameData.result === 'W' ? '#00C853' : gameData.result === 'L' ? '#FF1744' : '#FF9800')
                      : isActive
                      ? '#FFD700'
                      : isNextGame
                      ? '#00E5FF'
                      : '#666',
                    border: isCompleted
                      ? `1px solid ${gameData.result === 'W' ? '#00C853' : gameData.result === 'L' ? '#FF1744' : '#FF9800'}`
                      : isActive
                      ? '1px solid #FFD700'
                      : isNextGame
                      ? '1px solid #00E5FF'
                      : '1px solid #555',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 900,
                    flexShrink: 0,
                    textAlign: 'center',
                    letterSpacing: 0.5,
                  }}>
                    {isCompleted
                      ? (gameData.result === 'W' ? 'WIN' : gameData.result === 'L' ? 'LOSS' : 'TIE')
                      : isActive
                      ? '⚾ LIVE'
                      : isNextGame
                      ? 'UP NEXT'
                      : '—'}
                  </div>
                )}
              </div>
            )
          }

          // Coach view: interactive card
          return (
            <div key={game.id} style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
              <button
                onClick={() => !isCancelled && onSelectGame(game.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  background: isCancelled ? '#1a1a1a' : isActive ? 'rgba(255,215,0,0.12)' : '#252525',
                  border: isCancelled
                    ? '2px solid #555'
                    : isToday
                    ? '2px solid #00E5FF'
                    : isActive
                    ? '2px solid #FFD700'
                    : '2px solid #333',
                  borderRadius: 12,
                  cursor: isCancelled ? 'default' : 'pointer',
                  textAlign: 'left',
                  opacity: isCancelled ? 0.5 : 1,
                }}
              >
                <div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: isCancelled ? '#555' : isToday ? '#00E5FF' : '#888',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    marginBottom: 4,
                  }}>
                    {formatDate(game.date)}
                    {isToday && !isCancelled && ' — TODAY'}
                  </div>
                  <div style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: isCancelled ? '#666' : '#FFF',
                    textDecoration: isCancelled ? 'line-through' : 'none',
                  }}>
                    {game.opponent?.startsWith('@ ')
                      ? `@ ${game.opponent.slice(2)}`
                      : `vs ${game.opponent || 'TBD'}`}
                  </div>
                  {isCancelled && (
                    <div style={{ fontSize: 14, fontWeight: 900, marginTop: 4, color: '#FF9800' }}>
                      CANCELLED
                    </div>
                  )}
                  {isCompleted && !isCancelled && gameData.score && (
                    <div style={{
                      fontSize: 14,
                      fontWeight: 900,
                      marginTop: 4,
                      color: gameData.result === 'W' ? '#00C853' : gameData.result === 'L' ? '#FF1744' : '#FF9800',
                    }}>
                      {gameData.result === 'W' ? 'W' : gameData.result === 'L' ? 'L' : 'T'}{' '}
                      {gameData.score.us}{'–'}{gameData.score.them}
                    </div>
                  )}
                  {homeAway && !isCompleted && !isCancelled && (
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      {homeAway === 'HOME' ? '🏠' : '🚌'} {homeAway}
                      {isSetUp && ' · ✅ Lineup set'}
                    </div>
                  )}
                </div>
                {!isCancelled && (
                  <div style={{
                    padding: '8px 18px',
                    background: isCompleted ? '#333' : isActive ? '#FFD700' : isSetUp ? '#1a472a' : '#333',
                    color: isCompleted ? '#888' : isActive ? '#000' : isSetUp ? '#00C853' : '#FFD700',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 900,
                    flexShrink: 0,
                  }}>
                    {isCompleted ? 'VIEW / EDIT' : isActive ? 'ACTIVE' : isSetUp ? 'RESUME ▶' : 'SET UP ▶'}
                  </div>
                )}
              </button>
              {!isCompleted && (
                <button
                  onClick={(e) => handleCancelRequest(e, game.id)}
                  style={{
                    padding: '8px 12px',
                    background: isCancelled ? '#1a2a1a' : '#2a1a1a',
                    border: isCancelled ? '2px solid #00C853' : '2px solid #FF1744',
                    borderRadius: 12,
                    color: isCancelled ? '#00C853' : '#FF1744',
                    fontSize: 11,
                    fontWeight: 900,
                    cursor: 'pointer',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    textAlign: 'center',
                    lineHeight: 1.2,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {isCancelled ? 'UN-\nCANCEL' : 'GAME\nCANCEL'}
                </button>
              )}
              {gameData && !isCancelled && (
                <button
                  onClick={() => setResetTarget(game.id)}
                  style={{
                    padding: '8px 12px',
                    background: '#1a1a2a',
                    border: '2px solid #FF9800',
                    borderRadius: 12,
                    color: '#FF9800',
                    fontSize: 11,
                    fontWeight: 900,
                    cursor: 'pointer',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    textAlign: 'center',
                    lineHeight: 1.2,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {'RESET\nGAME'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {cancelTarget && !isParent && (
        <PinModal
          message={isUncancelling ? 'PIN to restore this game' : 'PIN to cancel this game'}
          onConfirm={handlePinConfirm}
          onCancel={() => setCancelTarget(null)}
        />
      )}

      {resetTarget && !isParent && (
        <PinModal
          message="PIN to reset this game (clears all data for this game)"
          onConfirm={() => {
            onResetGame(resetTarget)
            setResetTarget(null)
          }}
          onCancel={() => setResetTarget(null)}
        />
      )}
    </div>
  )
}
