export default function GameSelectScreen({ schedule, activeGameId, games, onSelectGame }) {
  const today = new Date().toISOString().slice(0, 10)

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No date'
    try {
      const d = new Date(dateStr + 'T12:00:00')
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    } catch {
      return dateStr
    }
  }

  if (schedule.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div className="screen-title">Select a Game</div>
        <p style={{ fontSize: 18, color: '#888', marginBottom: 16 }}>
          No games scheduled yet
        </p>
        <p style={{ fontSize: 14, color: '#555' }}>
          Go to Setup to add games to your schedule
        </p>
      </div>
    )
  }

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
          const homeAway = gameData ? (gameData.isHome ? 'HOME' : 'AWAY') : null

          return (
            <button
              key={game.id}
              onClick={() => onSelectGame(game.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                background: isActive ? 'rgba(255,215,0,0.12)' : '#252525',
                border: isToday
                  ? '2px solid #00E5FF'
                  : isActive
                  ? '2px solid #FFD700'
                  : '2px solid #333',
                borderRadius: 12,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: isToday ? '#00E5FF' : '#888',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 4,
                }}>
                  {formatDate(game.date)}
                  {isToday && ' — TODAY'}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#FFF' }}>
                  {game.opponent?.startsWith('@ ')
                    ? `@ ${game.opponent.slice(2)}`
                    : `vs ${game.opponent || 'TBD'}`}
                </div>
                {isCompleted && gameData.score && (
                  <div style={{
                    fontSize: 14,
                    fontWeight: 900,
                    marginTop: 4,
                    color: gameData.result === 'W' ? '#00C853' : gameData.result === 'L' ? '#FF1744' : '#FF9800',
                  }}>
                    {gameData.result === 'W' ? 'W' : gameData.result === 'L' ? 'L' : 'T'}{' '}
                    {gameData.score.us}–{gameData.score.them}
                  </div>
                )}
                {homeAway && !isCompleted && (
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                    {homeAway === 'HOME' ? '🏠' : '🚌'} {homeAway}
                    {isSetUp && ' · ✅ Lineup set'}
                  </div>
                )}
              </div>
              <div style={{
                padding: '8px 18px',
                background: isCompleted ? '#333' : isActive ? '#FFD700' : isSetUp ? '#1a472a' : '#333',
                color: isCompleted ? '#888' : isActive ? '#000' : isSetUp ? '#00C853' : '#FFD700',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 900,
                flexShrink: 0,
              }}>
                {isCompleted ? 'DONE' : isActive ? 'ACTIVE' : isSetUp ? 'RESUME ▶' : 'SET UP ▶'}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
