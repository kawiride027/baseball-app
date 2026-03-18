import { useState } from 'react'

export default function GameOverModal({ teamName, opponent, onNo, onDone }) {
  const [showScore, setShowScore] = useState(false)
  const [scoreUs, setScoreUs] = useState(0)
  const [scoreThem, setScoreThem] = useState(0)

  // Strip "@ " prefix from opponent for display
  const displayOpponent = opponent?.startsWith('@ ') ? opponent.slice(2) : (opponent || 'Opponent')

  const handleDone = () => {
    const result = scoreUs > scoreThem ? 'W' : scoreThem > scoreUs ? 'L' : 'T'
    onDone({ scoreUs, scoreThem, result })
  }

  if (!showScore) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.title}>Is the Game Over?</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button
              style={{ ...styles.btn, borderColor: '#555', color: '#888', flex: 1 }}
              onClick={onNo}
            >
              No, Keep Playing
            </button>
            <button
              style={{ ...styles.btn, borderColor: '#00C853', color: '#00C853', background: 'rgba(0,200,83,0.1)', flex: 1 }}
              onClick={() => setShowScore(true)}
            >
              Yes!
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.title}>Final Score</div>
        <div style={styles.scoreRow}>
          <div style={styles.scoreTeam}>
            <div style={styles.teamLabel}>{teamName || 'Us'}</div>
            <input
              type="number"
              min="0"
              value={scoreUs}
              onChange={(e) => setScoreUs(Math.max(0, parseInt(e.target.value) || 0))}
              style={styles.scoreInput}
            />
          </div>
          <div style={styles.dash}>—</div>
          <div style={styles.scoreTeam}>
            <div style={styles.teamLabel}>{displayOpponent}</div>
            <input
              type="number"
              min="0"
              value={scoreThem}
              onChange={(e) => setScoreThem(Math.max(0, parseInt(e.target.value) || 0))}
              style={styles.scoreInput}
            />
          </div>
        </div>
        <button
          style={{ ...styles.btn, borderColor: '#FFD700', color: '#FFD700', background: 'rgba(255,215,0,0.1)', width: '100%', marginTop: 20 }}
          onClick={handleDone}
        >
          Done
        </button>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20,
  },
  modal: {
    background: '#1e1e1e',
    border: '2px solid #FFD700',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    textAlign: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 900,
    color: '#FFD700',
  },
  scoreRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 20,
  },
  scoreTeam: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  teamLabel: {
    fontSize: 14,
    fontWeight: 700,
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreInput: {
    width: 80,
    height: 64,
    fontSize: 32,
    fontWeight: 900,
    textAlign: 'center',
    border: '2px solid #444',
    borderRadius: 10,
    background: '#252525',
    color: '#FFF',
  },
  dash: {
    fontSize: 28,
    fontWeight: 900,
    color: '#555',
    paddingTop: 28,
  },
  btn: {
    minHeight: 52,
    padding: '12px 20px',
    fontSize: 18,
    fontWeight: 900,
    border: '2px solid',
    borderRadius: 10,
    background: 'transparent',
    cursor: 'pointer',
  },
}
