import { useState } from 'react'
import PinModal from '../field/PinModal'

export default function GameSelectScreen({ schedule, activeGameId, games, onSelectGame, onCancelGame }) {
  const today = new Date().toISOString().slice(0, 10)
  const [cancelTarget, setCancelTarget] = useState(null)

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

  if (schedule.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div className="screen-title">Select a Game</div>
        <p style={{ fontSize: 18, color: '#888', marginBottom: 16 }}>
          No games scheduled yet
        </p>
        <p style={{ fontSize: 14, color: '#555' }}>
          Go to Team Setup to import your season schedule
        </p>
      </div>
    )
  }

  const cancelTargetData = cancelTarget ? games?.[cancelTarget] : null
  const isUncancelling = cancelTargetData?.cancelled

  return (
    <div>
      <div className="screen-title">Select a Game</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {schedule.map((game) => {
          const isToday = game.date === today
          const isActive = game.id === activeGameId
          const gameData = games?.[game.id]
          const isSetUp = gameData?.setupComplete
          const isCompleted = gameData?.completed
          const isCancelled = gameData?.cancelled
          const homeAway = gameData ? (gameData.isHome ? 'HOME' : 'AWAY') : null

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
                    {isToday && !isCancelled && ' \u2014 TODAY'}
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
                      {gameData.score.us}\u2013{gameData.score.them}
                    </div>
                  )}
                  {homeAway && !isCompleted && !isCancelled && (
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      {homeAway === 'HOME' ? '\ud83c\udfe0' : '\ud83d\ude8c'} {homeAway}
                      {isSetUp && ' \u00b7 \u2705 Lineup set'}
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
                    {isCompleted ? 'DONE' : isActive ? 'ACTIVE' : isSetUp ? 'RESUME \u25b6' : 'SET UP \u25b6'}
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
            </div>
          )
        })}
      </div>

      {cancelTarget && (
        <PinModal
          message={isUncancelling ? 'PIN to restore this game' : 'PIN to cancel this game'}
          onConfirm={handlePinConfirm}
          onCancel={() => setCancelTarget(null)}
        />
      )}
    </div>
  )
}
