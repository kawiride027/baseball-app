import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SortableRow({ player, idx }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: player.id,
  })

  const style = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    background: isDragging ? '#333' : '#252525',
    borderRadius: 6,
    border: isDragging ? '2px solid #FFD700' : '2px solid transparent',
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 10 : 0,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div style={rowStyles.orderNum}>{idx + 1}</div>
      <div {...listeners} style={rowStyles.grip}>⠿</div>
      <span style={rowStyles.jersey}>#{player.jerseyNumber}</span>
      <span style={rowStyles.name}>{player.nickname || player.name}</span>
    </div>
  )
}

const rowStyles = {
  orderNum: {
    width: 26,
    height: 26,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    background: '#FFD700',
    color: '#000',
    fontSize: 13,
    fontWeight: 900,
    flexShrink: 0,
  },
  grip: {
    color: '#555',
    fontSize: 22,
    flexShrink: 0,
    lineHeight: 1,
    cursor: 'grab',
    touchAction: 'none',
    padding: '4px 2px',
  },
  jersey: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 700,
  },
  name: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 700,
  },
}

export default function BattingOrderSetup({ roster, battingOrder, onComplete, opponent }) {
  const [order, setOrder] = useState([])
  const [absentIds, setAbsentIds] = useState([])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  // Active roster = everyone not absent
  const activeRoster = roster.filter((p) => !absentIds.includes(p.id))

  // Players not yet placed (from active roster only)
  const available = activeRoster.filter((p) => !order.includes(p.id))

  // Players already placed (in order)
  const placed = order
    .map((id) => roster.find((p) => p.id === id))
    .filter(Boolean)

  const handlePick = (playerId) => {
    setOrder((prev) => [...prev, playerId])
  }

  const handleUndo = () => {
    setOrder((prev) => prev.slice(0, -1))
  }

  const handleReset = () => {
    setOrder([])
  }

  const handleAbsent = (playerId) => {
    // Remove from batting order if already placed
    setOrder((prev) => prev.filter((id) => id !== playerId))
    setAbsentIds((prev) => [...prev, playerId])
  }

  const handleUnabsent = (playerId) => {
    setAbsentIds((prev) => prev.filter((id) => id !== playerId))
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!active || !over || active.id === over.id) return
    setOrder((prev) => {
      const oldIdx = prev.indexOf(active.id)
      const newIdx = prev.indexOf(over.id)
      return arrayMove(prev, oldIdx, newIdx)
    })
  }

  const allPlaced = available.length === 0 && order.length > 0

  return (
    <div style={styles.container}>
      <div style={styles.title}>Set Batting Order</div>
      <div style={styles.subtitle}>
        Tap players in order, then drag to rearrange.
        {opponent ? ` · vs ${opponent}` : ''}
      </div>

      {/* Current order so far — draggable */}
      {placed.length > 0 && (
        <div style={styles.orderSection}>
          <div style={styles.orderHeader}>
            Batting Order ({placed.length} of {activeRoster.length})
            {placed.length > 1 && (
              <span style={{ color: '#888', fontWeight: 400, marginLeft: 6 }}>— drag to reorder</span>
            )}
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              <div style={styles.orderList}>
                {placed.map((player, idx) => (
                  <SortableRow key={player.id} player={player} idx={idx} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={handleUndo} style={styles.undoBtn}>
              ↩ Undo Last
            </button>
            <button onClick={handleReset} style={styles.resetBtn}>
              ✕ Start Over
            </button>
          </div>
        </div>
      )}

      {/* Pick next batter prompt */}
      {!allPlaced && (
        <div style={styles.pickSection}>
          <div style={styles.pickHeader}>
            {order.length === 0
              ? 'Tap who bats 1st:'
              : `Tap who bats ${ordinal(order.length + 1)}:`}
          </div>
          <div style={styles.pickGrid}>
            {available.map((player) => (
              <div key={player.id} style={{ position: 'relative' }}>
                <button
                  onClick={() => handlePick(player.id)}
                  style={styles.pickBtn}
                >
                  <span style={{ color: '#FFD700', fontSize: 14, fontWeight: 700 }}>#{player.jerseyNumber}</span>
                  <span style={{ color: '#FFF', fontSize: 16, fontWeight: 700 }}>
                    {player.nickname || player.name.split(' ')[0]}
                  </span>
                </button>
                <button
                  onClick={() => handleAbsent(player.id)}
                  style={styles.absentX}
                  title="Mark absent"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Done button */}
      {allPlaced && (
        <>
          <div style={styles.preview}>
            <div style={styles.previewTitle}>First 3 Batters:</div>
            <div style={styles.previewRow}>
              {placed.slice(0, 3).map((p, i) => (
                <div key={p.id} style={styles.previewChip}>
                  <span style={{ color: '#FFD700', fontWeight: 900 }}>{i + 1}.</span>{' '}
                  #{p.jerseyNumber} {p.nickname || p.name.split(' ')[0]}
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => onComplete(order, absentIds)}
            style={styles.doneBtn}
          >
            ✅ Confirm Batting Order → Set Positions
          </button>
        </>
      )}

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
    </div>
  )
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

const styles = {
  container: {
    padding: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 900,
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginBottom: 16,
  },
  orderSection: {
    marginBottom: 16,
    padding: 10,
    background: '#1a1a1a',
    borderRadius: 10,
    border: '1px solid #333',
  },
  orderHeader: {
    fontSize: 12,
    fontWeight: 700,
    color: '#00E5FF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  orderList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  undoBtn: {
    flex: 1,
    minHeight: 40,
    fontSize: 14,
    fontWeight: 700,
    border: '1px solid #FF9800',
    borderRadius: 8,
    background: 'rgba(255,152,0,0.1)',
    color: '#FF9800',
    cursor: 'pointer',
  },
  resetBtn: {
    flex: 1,
    minHeight: 40,
    fontSize: 14,
    fontWeight: 700,
    border: '1px solid #555',
    borderRadius: 8,
    background: '#2A2A2A',
    color: '#888',
    cursor: 'pointer',
  },
  pickSection: {
    marginBottom: 16,
  },
  pickHeader: {
    fontSize: 18,
    fontWeight: 900,
    color: '#00E5FF',
    textAlign: 'center',
    marginBottom: 10,
  },
  pickGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8,
  },
  pickBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    padding: '12px 8px',
    minHeight: 60,
    width: '100%',
    background: '#1e1e1e',
    border: '2px solid #444',
    borderRadius: 10,
    cursor: 'pointer',
  },
  absentX: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    background: '#FF1744',
    color: '#FFF',
    fontSize: 13,
    fontWeight: 900,
    border: '2px solid #121212',
    cursor: 'pointer',
    zIndex: 2,
  },
  preview: {
    padding: 12,
    background: '#1a1a1a',
    borderRadius: 10,
    border: '1px solid #333',
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#00E5FF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  previewRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewChip: {
    padding: '6px 12px',
    background: '#252525',
    borderRadius: 8,
    border: '1px solid #444',
    color: '#FFF',
    fontSize: 14,
    fontWeight: 700,
  },
  doneBtn: {
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
  },
  absentSection: {
    marginTop: 16,
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
}
