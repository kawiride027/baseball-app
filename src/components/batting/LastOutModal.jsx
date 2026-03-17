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
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#BBB',
    textAlign: 'center',
    marginBottom: 16,
  },
  playerBtn: {
    width: '100%',
    minHeight: 52,
    padding: '10px 16px',
    marginBottom: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    border: '2px solid #444',
    borderRadius: 8,
    background: '#252525',
    color: '#FFF',
    fontSize: 17,
    fontWeight: 700,
    cursor: 'pointer',
    textAlign: 'left',
  },
  number: {
    color: '#FFD700',
    fontSize: 15,
    minWidth: 36,
  },
  cancelBtn: {
    width: '100%',
    minHeight: 48,
    marginTop: 12,
    fontSize: 16,
    fontWeight: 700,
    border: '2px solid #FF1744',
    borderRadius: 8,
    background: '#2A2A2A',
    color: '#FF1744',
    cursor: 'pointer',
  },
}

export default function LastOutModal({ roster, battingOrder, onSelect, onCancel }) {
  const orderedPlayers = battingOrder
    .map((id) => roster.find((p) => p.id === id))
    .filter(Boolean)

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div style={styles.modal}>
        <div style={styles.title}>Who Made the Last Out?</div>
        <div style={styles.subtitle}>Select the player who made the final at-bat out</div>
        {orderedPlayers.map((player) => (
          <button
            key={player.id}
            style={styles.playerBtn}
            onClick={() => onSelect(player.id)}
          >
            <span style={styles.number}>#{player.jerseyNumber}</span>
            {player.name}
          </button>
        ))}
        <button style={styles.cancelBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
