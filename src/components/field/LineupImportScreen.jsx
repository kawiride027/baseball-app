import { useState, useRef } from 'react'
import { POSITIONS, INNINGS, ordinalInning } from '../../constants'

const POSITION_ALIASES = {
  'P': 'P', 'PITCHER': 'P',
  'C': 'C', 'CATCHER': 'C',
  '1B': '1B', '1ST': '1B', 'FIRST': '1B',
  '2B': '2B', '2ND': '2B', 'SECOND': '2B',
  'SS': 'SS', 'SHORT': 'SS', 'SHORTSTOP': 'SS',
  '3B': '3B', '3RD': '3B', 'THIRD': '3B',
  'LF': 'LF', 'LEFT': 'LF',
  'LCF': 'LCF', 'LC': 'LCF', 'LEFT CENTER': 'LCF',
  'RCF': 'RCF', 'RC': 'RCF', 'RIGHT CENTER': 'RCF',
  'RF': 'RF', 'RIGHT': 'RF',
  'BN': 'BENCH', 'BENCH': 'BENCH', 'OUT': 'BENCH', 'SIT': 'BENCH',
}

function normalizePosition(input) {
  if (!input) return null
  return POSITION_ALIASES[input.trim().toUpperCase()] || null
}

function matchPlayer(input, roster, alreadyMatched) {
  const clean = input.trim()
  if (!clean) return null
  const available = roster.filter(p => !alreadyMatched.has(p.id))

  // Jersey number match: "#12 Name" or "12 Name"
  const jerseyMatch = clean.match(/^#?(\d+)\s*(.*)/)
  if (jerseyMatch) {
    const num = jerseyMatch[1]
    const name = jerseyMatch[2].trim().toLowerCase()
    if (name) {
      const byBoth = available.find(p =>
        String(p.jerseyNumber) === num &&
        (p.name.toLowerCase().includes(name) ||
          (p.nickname && p.nickname.toLowerCase().includes(name)))
      )
      if (byBoth) return byBoth
    }
    const byNum = available.find(p => String(p.jerseyNumber) === num)
    if (byNum) return byNum
  }

  const lower = clean.toLowerCase()
  // Exact match
  const exact = available.find(p =>
    p.name.toLowerCase() === lower ||
    (p.nickname && p.nickname.toLowerCase() === lower)
  )
  if (exact) return exact

  // First name match
  const firstName = available.find(p =>
    p.name.split(' ')[0].toLowerCase() === lower ||
    (p.nickname && p.nickname.split(' ')[0].toLowerCase() === lower)
  )
  if (firstName) return firstName

  // Partial match
  const partial = available.find(p =>
    p.name.toLowerCase().includes(lower) ||
    (p.nickname && p.nickname.toLowerCase().includes(lower)) ||
    lower.includes(p.name.split(' ')[0].toLowerCase())
  )
  return partial || null
}

export default function LineupImportScreen({ roster, onComplete, onBack, onCancel, opponent }) {
  const fileInputRef = useRef(null)
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState('')

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
  }

  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) {
      setError('File needs at least a header row and one player row')
      return
    }

    const warnings = []
    const rows = []
    const alreadyMatched = new Set()

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim())
      if (!cols[0]) continue

      const playerInput = cols[0]
      const matched = matchPlayer(playerInput, roster, alreadyMatched)

      if (!matched) {
        warnings.push(`"${playerInput}" — not found in roster`)
      } else {
        alreadyMatched.add(matched.id)
      }

      const positions = []
      for (let j = 1; j <= INNINGS && j < cols.length; j++) {
        const raw = cols[j]
        const pos = normalizePosition(raw)
        if (raw && !pos) {
          warnings.push(`"${playerInput}" inning ${j}: "${raw}" is not a valid position`)
        }
        positions.push(pos || 'BENCH')
      }
      while (positions.length < INNINGS) {
        positions.push('BENCH')
      }

      rows.push({ input: playerInput, player: matched, positions })
    }

    // Conflict detection
    const conflicts = []
    for (let inn = 0; inn < INNINGS; inn++) {
      const posMap = {}
      rows.forEach((row) => {
        if (!row.player) return
        const pos = row.positions[inn]
        if (pos && pos !== 'BENCH') {
          if (!posMap[pos]) posMap[pos] = []
          posMap[pos].push(row)
        }
      })
      Object.entries(posMap).forEach(([pos, players]) => {
        if (players.length > 1) {
          const names = players.map(r => r.player?.nickname || r.player?.name || r.input).join(' & ')
          conflicts.push({ inning: inn + 1, pos, names })
          warnings.push(`${ordinalInning(inn + 1)}: ${names} both at ${pos}`)
        }
      })
    }

    const missing = roster.filter(p => !alreadyMatched.has(p.id))
    setParsed({ rows, warnings, conflicts, missing })
  }

  const handleConfirm = () => {
    if (!parsed) return
    const battingOrder = parsed.rows
      .filter(r => r.player)
      .map(r => r.player.id)

    const absentIds = roster
      .filter(p => !battingOrder.includes(p.id))
      .map(p => p.id)

    const assignments = {}
    for (let i = 1; i <= INNINGS; i++) {
      const inning = {}
      POSITIONS.forEach(pos => { inning[pos] = null })
      inning.BENCH = []
      parsed.rows.forEach(row => {
        if (!row.player) return
        const pos = row.positions[i - 1]
        if (pos === 'BENCH') {
          inning.BENCH.push(row.player.id)
        } else if (POSITIONS.includes(pos)) {
          if (inning[pos]) {
            inning.BENCH.push(inning[pos])
          }
          inning[pos] = row.player.id
        }
      })
      assignments[String(i)] = inning
    }

    onComplete(assignments, battingOrder, absentIds)
  }

  const handleDownloadTemplate = () => {
    const header = ['Player', ...Array.from({ length: INNINGS }, (_, i) => ordinalInning(i + 1))]
    const csvRows = roster.map(p => {
      const name = `#${p.jerseyNumber} ${p.nickname || p.name}`
      return [name, ...Array(INNINGS).fill('')]
    })
    const csv = [header.join(','), ...csvRows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lineup-template${opponent ? '-vs-' + opponent.replace(/[^a-zA-Z0-9]/g, '') : ''}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const matchedCount = parsed ? parsed.rows.filter(r => r.player).length : 0
  const hasConflicts = parsed?.conflicts?.length > 0

  return (
    <div style={styles.container}>
      <div style={styles.title}>Upload Lineup</div>
      <div style={styles.subtitle}>
        Import batting order & positions from a CSV file
        {opponent ? ` · vs ${opponent}` : ''}
      </div>

      {/* Format hint */}
      <div style={styles.formatBox}>
        <div style={styles.formatTitle}>CSV Format:</div>
        <div style={styles.formatCode}>
          {'Player, 1st, 2nd, 3rd, 4th, 5th, 6th\n'}
          {'#12 Easton, P, SS, 2B, LF, C, 3B\n'}
          {'#5 Liam, C, 2B, SS, 3B, LF, RF'}
        </div>
        <div style={styles.formatHint}>
          Rows = batting order (top = lead-off). Use player name, nickname, or #jersey.
          Positions: P, C, 1B, 2B, SS, 3B, LF, LCF, RCF, RF, BN
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
              Preview — {matchedCount} of {parsed.rows.length} matched
            </div>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>#</th>
                    <th style={{ ...styles.th, textAlign: 'left' }}>Player</th>
                    {Array.from({ length: INNINGS }, (_, i) => (
                      <th key={i} style={styles.th}>{ordinalInning(i + 1)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ ...styles.td, color: '#888' }}>{idx + 1}</td>
                      <td style={{
                        ...styles.td,
                        textAlign: 'left',
                        color: row.player ? '#FFF' : '#FF1744',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}>
                        {row.player
                          ? `#${row.player.jerseyNumber} ${row.player.nickname || row.player.name}`
                          : `? ${row.input}`
                        }
                      </td>
                      {row.positions.map((pos, i) => {
                        const isConflict = row.player && pos !== 'BENCH' && parsed.conflicts.some(
                          c => c.inning === i + 1 && c.pos === pos
                        )
                        return (
                          <td key={i} style={{
                            ...styles.td,
                            color: isConflict ? '#FF1744' : pos === 'BENCH' ? '#888' : '#00C853',
                            fontWeight: 700,
                            background: isConflict ? 'rgba(255,23,68,0.15)' : 'transparent',
                          }}>
                            {pos === 'BENCH' ? 'BN' : pos}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {parsed.missing.length > 0 && (
            <div style={styles.missingBox}>
              <div style={styles.missingTitle}>
                Not in lineup ({parsed.missing.length}) — will be marked absent:
              </div>
              <div style={styles.missingList}>
                {parsed.missing.map(p => (
                  <span key={p.id} style={styles.missingChip}>
                    #{p.jerseyNumber} {p.nickname || p.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={matchedCount === 0}
            style={{
              ...styles.confirmBtn,
              opacity: matchedCount === 0 ? 0.4 : 1,
            }}
          >
            {hasConflicts
              ? `Confirm Lineup (${parsed.conflicts.length} conflict${parsed.conflicts.length > 1 ? 's' : ''})`
              : 'Confirm Lineup — Start Game'
            }
          </button>
        </>
      )}

      <button onClick={onBack} style={styles.backBtn}>
        Back to Manual Setup
      </button>

      {onCancel && (
        <button onClick={onCancel} style={styles.cancelBtn}>
          Cancel Setup
        </button>
      )}
    </div>
  )
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
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 400 },
  th: { padding: '8px 4px', fontSize: 12, fontWeight: 700, color: '#FFD700', borderBottom: '2px solid #333', textAlign: 'center' },
  td: { padding: '6px 4px', fontSize: 13, textAlign: 'center', borderBottom: '1px solid #2a2a2a' },
  missingBox: {
    padding: 10,
    marginBottom: 16,
    background: 'rgba(255,152,0,0.05)',
    borderRadius: 10,
    border: '1px solid #333',
  },
  missingTitle: { fontSize: 12, fontWeight: 700, color: '#FF9800', marginBottom: 6 },
  missingList: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  missingChip: {
    padding: '4px 10px',
    fontSize: 13,
    fontWeight: 700,
    background: '#2A2A2A',
    color: '#FF9800',
    border: '1px solid #555',
    borderRadius: 6,
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
  cancelBtn: {
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
  },
}
