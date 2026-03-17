import { useState } from 'react'
import { PIN_CODE } from '../../constants'

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
    maxWidth: 320,
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#FFD700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#BBB',
    marginBottom: 20,
  },
  display: {
    fontSize: 36,
    fontWeight: 700,
    color: '#FFF',
    letterSpacing: 12,
    marginBottom: 20,
    minHeight: 48,
    background: '#252525',
    borderRadius: 8,
    padding: '8px 16px',
  },
  keypad: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
    marginBottom: 16,
  },
  key: {
    minHeight: 60,
    fontSize: 24,
    fontWeight: 700,
    border: '2px solid #444',
    borderRadius: 8,
    background: '#2A2A2A',
    color: '#FFF',
    cursor: 'pointer',
  },
  error: {
    color: '#FF1744',
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 12,
  },
  btnRow: {
    display: 'flex',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 48,
    fontSize: 16,
    fontWeight: 700,
    border: '2px solid #FF1744',
    borderRadius: 8,
    background: '#2A2A2A',
    color: '#FF1744',
    cursor: 'pointer',
  },
}

export default function PinModal({ onConfirm, onCancel, message }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  const handleKey = (digit) => {
    if (pin.length >= 3) return
    const newPin = pin + digit
    setPin(newPin)
    setError(false)
    if (newPin.length === 3) {
      if (newPin === PIN_CODE) {
        onConfirm()
      } else {
        setError(true)
        setTimeout(() => setPin(''), 400)
      }
    }
  }

  const handleClear = () => {
    setPin('')
    setError(false)
  }

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div style={styles.modal}>
        <div style={styles.title}>Coach PIN Required</div>
        <div style={styles.subtitle}>{message || 'Enter PIN to confirm change'}</div>
        <div style={{ ...styles.display, borderColor: error ? '#FF1744' : 'transparent', border: error ? '2px solid #FF1744' : 'none' }}>
          {'*'.repeat(pin.length)}
        </div>
        {error && <div style={styles.error}>Wrong PIN - Try again</div>}
        <div style={styles.keypad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button key={n} style={styles.key} onClick={() => handleKey(String(n))}>
              {n}
            </button>
          ))}
          <button style={styles.key} onClick={handleClear}>CLR</button>
          <button style={styles.key} onClick={() => handleKey('0')}>0</button>
          <button style={{ ...styles.key, borderColor: '#FFD700', color: '#FFD700' }} onClick={() => pin.length > 0 && setPin(pin.slice(0, -1))}>DEL</button>
        </div>
        <div style={styles.btnRow}>
          <button style={styles.cancelBtn} onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
