import { useState, useRef } from 'react'

export default function ScheduleImportScreen({ existingCount, onComplete, onBack }) {
  const fileInputRef = useRef(null)
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState('')
  const [replaceMode, setReplaceMode] = useState(existingCount > 0 ? null : 'replace')

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setError('')
    setParsed(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        parseCSV(event.target.result)
      } catch (err) {
        setError('Failed to read file: ' + err.message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    if (lines.length === 0) {
      setError('File is empty')
      return
    }

    // Detect header
    const first = lines[0].toLowerCase()
    const startIdx = (first.includes('date') || first.includes('opponent')) ? 1 : 0

    const warnings = []
    const games = []

    for (let i = startIdx; i < lines.length; i++) {
      const cols = lines[i].match(/(".*?"|[^,]+)/g)?.map(s => s.replace(/^"|"$/g, '').trim()) || []
      if (cols.length < 2) {
        warnings.push(`Row ${i + 1}: expected at least 2 columns (date, opponent), got ${cols.length}`)
        continue
      }

      const date = cols[0]
      const opponent = cols[1]

      if (!date || !opponent) {
        warnings.push(`Row ${i + 1}: missing ${!date ? 'date' : 'opponent'}`)
        continue
      }

      // Try to normalize date
      const normalized = normalizeDate(date)
      if (!normalized) {
        warnings.push(`Row ${i + 1}: "${date}" doesn't look like a date — imported as-is`)
      }

      games.push({
        date: normalized || date,
        opponent,
        rawDate: date,
      })
    }

    if (games.length === 0) {
      setError('No valid games found. Check that each row has: date, opponent')
      return
    }

    setParsed({ games, warnings })
  }

  const handleConfirm = () => {
    if (!parsed) return
    const mode = existingCount > 0 ? replaceMode : 'replace'
    if (!mode) return
    onComplete(parsed.games, mode)
  }

  const handleDownloadTemplate = () => {
    const today = new Date()
    const sampleDates = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() + (i + 1) * 7)
      return d.toISOString().split('T')[0]
    })
    const rows = [
      'Date,Opponent',
      ...sampleDates.map((d, i) => `${d},Team ${i + 1}`),
    ]
    const csv = rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'schedule-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={styles.container}>
      <div style={styles.title}>Import Schedule</div>
      <div style={styles.subtitle}>
        Import your season game schedule from a CSV file
      </div>

      {/* Format hint */}
      <div style={styles.formatBox}>
        <div style={styles.formatTitle}>CSV Format:</div>
        <div style={styles.formatCode}>
          {'Date, Opponent\n'}
          {'2026-04-05, Eagles\n'}
          {'2026-04-12, Hawks\n'}
          {'2026-04-19, Tigers'}
        </div>
        <div style={styles.formatHint}>
          Dates can be YYYY-MM-DD, MM/DD/YYYY, or MM-DD-YYYY.
          One game per row. Header row is optional.
        </div>
      </div>

      {/* Upload + Template buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button onClick={() => fileInputRef.current?.click()} style={styles.uploadBtn}>
          Upload CSV
        </button>
        <button onClick={handleDownloadTemplate} style={styles.templateBtn}>
          Download Template
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {error && <div style={styles.errorBox}>{error}</div>}

      {parsed && (
        <>
          {parsed.warnings.length > 0 && (
            <div style={styles.warningBox}>
              <div style={styles.warningTitle}>Warnings ({parsed.warnings.length})</div>
              {parsed.warnings.map((w, i) => (
                <div key={i} style={styles.warningItem}>{w}</div>
              ))}
            </div>
          )}

          <div style={styles.previewSection}>
            <div style={styles.previewTitle}>
              Preview — {parsed.games.length} game{parsed.games.length !== 1 ? 's' : ''} found
            </div>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>#</th>
                    <th style={{ ...styles.th, textAlign: 'left' }}>Date</th>
                    <th style={{ ...styles.th, textAlign: 'left' }}>Opponent</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.games.map((game, idx) => (
                    <tr key={idx}>
                      <td style={{ ...styles.td, color: '#888' }}>{idx + 1}</td>
                      <td style={{ ...styles.td, textAlign: 'left', color: '#FFF', fontWeight: 700 }}>
                        {formatDateDisplay(game.date)}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'left', color: '#FFD700', fontWeight: 700 }}>
                        {game.opponent}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Replace vs Append if existing games */}
          {existingCount > 0 && (
            <div style={styles.modeBox}>
              <div style={styles.modeTitle}>You have {existingCount} existing game{existingCount !== 1 ? 's' : ''}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setReplaceMode('replace')}
                  style={{
                    ...styles.modeBtn,
                    borderColor: replaceMode === 'replace' ? '#FF9800' : '#555',
                    color: replaceMode === 'replace' ? '#FF9800' : '#888',
                    background: replaceMode === 'replace' ? 'rgba(255,152,0,0.1)' : '#2A2A2A',
                  }}
                >
                  Replace All
                </button>
                <button
                  onClick={() => setReplaceMode('append')}
                  style={{
                    ...styles.modeBtn,
                    borderColor: replaceMode === 'append' ? '#00C853' : '#555',
                    color: replaceMode === 'append' ? '#00C853' : '#888',
                    background: replaceMode === 'append' ? 'rgba(0,200,83,0.1)' : '#2A2A2A',
                  }}
                >
                  Add to Existing
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={existingCount > 0 && !replaceMode}
            style={{
              ...styles.confirmBtn,
              opacity: (existingCount > 0 && !replaceMode) ? 0.4 : 1,
            }}
          >
            {replaceMode === 'append'
              ? `Add ${parsed.games.length} Game${parsed.games.length !== 1 ? 's' : ''} to Schedule`
              : `Import ${parsed.games.length} Game${parsed.games.length !== 1 ? 's' : ''}`
            }
          </button>
        </>
      )}

      <button onClick={onBack} style={styles.backBtn}>
        Back to Setup
      </button>
    </div>
  )
}

function normalizeDate(input) {
  if (!input) return null
  const clean = input.trim()

  // YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(clean)) return clean

  // MM/DD/YYYY or MM-DD-YYYY
  const m = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (m) {
    return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  }

  // MM/DD/YY or MM-DD-YY
  const m2 = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/)
  if (m2) {
    const year = parseInt(m2[3]) > 50 ? `19${m2[3]}` : `20${m2[3]}`
    return `${year}-${m2[1].padStart(2, '0')}-${m2[2].padStart(2, '0')}`
  }

  return null
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr + 'T12:00:00')
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

const styles = {
  container: { padding: 4 },
  title: { fontSize: 28, fontWeight: 900, color: '#FFD700', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 16 },
  formatBox: {
    padding: 12,
    background: '#1a1a1a',
    borderRadius: 10,
    border: '1px solid #333',
    marginBottom: 16,
  },
  formatTitle: { fontSize: 12, fontWeight: 700, color: '#00E5FF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  formatCode: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#CCC',
    whiteSpace: 'pre',
    padding: 8,
    background: '#252525',
    borderRadius: 6,
    marginBottom: 6,
    overflowX: 'auto',
  },
  formatHint: { fontSize: 11, color: '#888' },
  uploadBtn: {
    flex: 1,
    minHeight: 52,
    fontSize: 18,
    fontWeight: 900,
    border: '2px solid #FFD700',
    borderRadius: 10,
    background: 'rgba(255,215,0,0.1)',
    color: '#FFD700',
    cursor: 'pointer',
  },
  templateBtn: {
    flex: 1,
    minHeight: 52,
    fontSize: 14,
    fontWeight: 700,
    border: '2px solid #555',
    borderRadius: 10,
    background: '#2A2A2A',
    color: '#888',
    cursor: 'pointer',
  },
  errorBox: {
    padding: 12,
    marginBottom: 16,
    background: 'rgba(255,23,68,0.15)',
    border: '2px solid #FF1744',
    borderRadius: 10,
    color: '#FF8A80',
    fontSize: 14,
    fontWeight: 700,
  },
  warningBox: {
    padding: 12,
    marginBottom: 12,
    background: 'rgba(255,152,0,0.1)',
    border: '1px solid #FF9800',
    borderRadius: 10,
  },
  warningTitle: { fontSize: 12, fontWeight: 900, color: '#FF9800', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  warningItem: { fontSize: 13, color: '#FFB74D', marginBottom: 2 },
  previewSection: {
    marginBottom: 16,
    padding: 10,
    background: '#1a1a1a',
    borderRadius: 10,
    border: '1px solid #333',
  },
  previewTitle: { fontSize: 12, fontWeight: 700, color: '#00E5FF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '8px 4px', fontSize: 12, fontWeight: 700, color: '#FFD700', borderBottom: '2px solid #333', textAlign: 'center' },
  td: { padding: '6px 4px', fontSize: 14, textAlign: 'center', borderBottom: '1px solid #2a2a2a' },
  modeBox: {
    padding: 12,
    marginBottom: 16,
    background: '#1a1a1a',
    borderRadius: 10,
    border: '1px solid #333',
  },
  modeTitle: { fontSize: 13, fontWeight: 700, color: '#888', marginBottom: 8 },
  modeBtn: {
    flex: 1,
    minHeight: 44,
    fontSize: 14,
    fontWeight: 700,
    border: '2px solid #555',
    borderRadius: 8,
    background: '#2A2A2A',
    color: '#888',
    cursor: 'pointer',
  },
  confirmBtn: {
    width: '100%',
    minHeight: 56,
    fontSize: 18,
    fontWeight: 900,
    border: '2px solid #00C853',
    borderRadius: 12,
    background: 'rgba(0,200,83,0.15)',
    color: '#00C853',
    cursor: 'pointer',
    padding: '12px 16px',
    marginBottom: 12,
  },
  backBtn: {
    width: '100%',
    minHeight: 44,
    fontSize: 14,
    fontWeight: 700,
    border: '2px solid #555',
    borderRadius: 10,
    background: '#2A2A2A',
    color: '#888',
    cursor: 'pointer',
    padding: '8px 16px',
  },
}
