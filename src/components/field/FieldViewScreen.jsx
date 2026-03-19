import { useState, useCallback } from 'react'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
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
import { POSITIONS, INNINGS, ordinalInning } from '../../constants'
import DiamondSVG from './DiamondSVG'
import BenchArea from './BenchArea'
import PinModal from './PinModal'
import AtBatView from './AtBatView'

function SortableBatterRow({ player, idx }) {
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
    touchAction: 'none',
    cursor: 'grab',
    zIndex: isDragging ? 10 : 0,
    marginBottom: 3,
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: '#FFD700', color: '#000', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>{idx + 1}</div>
      <div style={{ color: '#555', fontSize: 16, flexShrink: 0 }}>⠿</div>
      <span style={{ color: '#FFD700', fontSize: 13, fontWeight: 700 }}>#{player.jerseyNumber}</span>
      <span style={{ color: '#FFF', fontSize: 15, fontWeight: 700 }}>{player.nickname || player.name}</span>
    </div>
  )
}

export default function FieldViewScreen({
  roster,
  assignments,
  viewingInning,
  setViewingInning,
  updateAssignments,
  opponent,
  teamName,
  atBat,
  updateAtBat,
  battingOrder,
  updateBattingOrder,
  isHome,
  onGameComplete,
}) {
  // Unlock/lock mode: false = locked (kids view), true = coach is editing
  const [unlocked, setUnlocked] = useState(false)
  const [showUnlockPin, setShowUnlockPin] = useState(false)
  const [showAtBat, setShowAtBat] = useState(false)
  const [showAtBatPin, setShowAtBatPin] = useState(false)
  const [showEditBatOrderPin, setShowEditBatOrderPin] = useState(false)
  const [editingBatOrder, setEditingBatOrder] = useState(false)
  const [tempBatOrder, setTempBatOrder] = useState([])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  const batOrderSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  const currentAssignment = assignments[String(viewingInning)] || {}

  // Drag is only functional when unlocked
  const handleDragEnd = useCallback((event) => {
    if (!unlocked) return
    const { active, over } = event
    if (!active || !over) return

    const fromData = active.data.current
    const toPosition = over.data.current?.position || over.id
    if (fromData.position === toPosition) return

    // Apply swap immediately (already unlocked)
    applySwap(fromData.playerId, fromData.position, toPosition)
  }, [unlocked, currentAssignment, viewingInning])

  const applySwap = (playerId, fromPosition, toPosition) => {
    const assignment = { ...currentAssignment }
    const bench = [...(assignment.BENCH || [])]

    if (fromPosition === 'BENCH' && toPosition === 'BENCH') return

    if (fromPosition === 'BENCH') {
      const existingPlayerId = assignment[toPosition]
      const benchIdx = bench.indexOf(playerId)
      if (benchIdx >= 0) bench.splice(benchIdx, 1)
      if (existingPlayerId) bench.push(existingPlayerId)
      assignment[toPosition] = playerId
      assignment.BENCH = bench
    } else if (toPosition === 'BENCH') {
      assignment[fromPosition] = null
      if (!bench.includes(playerId)) bench.push(playerId)
      assignment.BENCH = bench
    } else {
      const existingPlayerId = assignment[toPosition]
      assignment[toPosition] = playerId
      assignment[fromPosition] = existingPlayerId || null
    }

    updateAssignments(viewingInning, assignment)
  }

  const handleUnlockRequest = () => {
    setShowUnlockPin(true)
  }

  const handleUnlockConfirm = () => {
    setShowUnlockPin(false)
    setUnlocked(true)
  }

  const handleLock = () => {
    setUnlocked(false)
  }

  // At bat flow
  const handleStartAtBat = () => {
    setShowAtBatPin(true)
  }

  const handleAtBatPinConfirm = () => {
    setShowAtBatPin(false)
    updateAtBat({ isAtBat: true })
    setShowAtBat(true)
  }

  const handleExitAtBat = () => {
    setShowAtBat(false)
  }

  // Edit batting order flow
  const handleEditBatOrderRequest = () => {
    setShowEditBatOrderPin(true)
  }

  const handleEditBatOrderPinConfirm = () => {
    setShowEditBatOrderPin(false)
    setTempBatOrder([...battingOrder])
    setEditingBatOrder(true)
  }

  const handleBatOrderDragEnd = (event) => {
    const { active, over } = event
    if (!active || !over || active.id === over.id) return
    setTempBatOrder((prev) => {
      const oldIdx = prev.indexOf(active.id)
      const newIdx = prev.indexOf(over.id)
      return arrayMove(prev, oldIdx, newIdx)
    })
  }

  const handleSaveBatOrder = () => {
    if (updateBattingOrder) updateBattingOrder(tempBatOrder)
    setEditingBatOrder(false)
    setTempBatOrder([])
  }

  const handleCancelBatOrderEdit = () => {
    setEditingBatOrder(false)
    setTempBatOrder([])
  }

  const battingHalf = isHome ? 'Bottom' : 'Top'
  const fieldingHalf = isHome ? 'Top' : 'Bottom'

  const nextBatter = battingOrder && atBat.nextBatterIndex != null
    ? roster.find((p) => p.id === battingOrder[atBat.nextBatterIndex])
    : null

  // If showing at bat view, render that instead of the diamond
  if (showAtBat) {
    return (
      <AtBatView
        roster={roster}
        battingOrder={battingOrder}
        atBat={atBat}
        updateAtBat={updateAtBat}
        isHome={isHome}
        teamName={teamName}
        opponent={opponent}
        onExitAtBat={handleExitAtBat}
        setViewingInning={setViewingInning}
        onGameComplete={onGameComplete}
      />
    )
  }

  // Editing batting order overlay
  if (editingBatOrder) {
    const tempPlayers = tempBatOrder.map((id) => roster.find((p) => p.id === id)).filter(Boolean)
    return (
      <div>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#FFD700' }}>Edit Batting Order</div>
          <div style={{ fontSize: 13, color: '#888' }}>Drag players to rearrange</div>
        </div>
        <DndContext sensors={batOrderSensors} collisionDetection={closestCenter} onDragEnd={handleBatOrderDragEnd}>
          <SortableContext items={tempBatOrder} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
              {tempPlayers.map((player, idx) => (
                <SortableBatterRow key={player.id} player={player} idx={idx} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleCancelBatOrderEdit}
            style={{ flex: 1, minHeight: 48, fontSize: 15, fontWeight: 700, border: '2px solid #555', borderRadius: 10, background: '#2A2A2A', color: '#888', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSaveBatOrder}
            style={{ flex: 1, minHeight: 48, fontSize: 15, fontWeight: 900, border: '2px solid #00C853', borderRadius: 10, background: 'rgba(0,200,83,0.15)', color: '#00C853', cursor: 'pointer' }}
          >
            ✅ Save Order
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Inning navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
        <button
          className="btn btn--small"
          onClick={() => setViewingInning(Math.max(1, viewingInning - 1))}
          disabled={viewingInning <= 1}
          style={{ opacity: viewingInning <= 1 ? 0.3 : 1, minWidth: 48 }}
        >
          ◀
        </button>

        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#FFD700', lineHeight: 1 }}>
            {ordinalInning(viewingInning)} INNING
          </div>
          <div style={{ fontSize: 12, color: '#888' }}>
            of {INNINGS} · {fieldingHalf}: We Field · {battingHalf}: We Bat
          </div>
        </div>

        <button
          className="btn btn--small"
          onClick={() => setViewingInning(Math.min(INNINGS, viewingInning + 1))}
          disabled={viewingInning >= INNINGS}
          style={{ opacity: viewingInning >= INNINGS ? 0.3 : 1, minWidth: 48 }}
        >
          ▶
        </button>
      </div>

      {/* Action bar: unlock/lock + start at bat */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        {!unlocked ? (
          <button
            className="btn btn--small"
            onClick={handleUnlockRequest}
            style={{ fontSize: 13, borderColor: '#FF9800', color: '#FF9800' }}
          >
            🔒 Unlock to Edit
          </button>
        ) : (
          <button
            className="btn btn--small btn--accent"
            onClick={handleLock}
            style={{ fontSize: 13 }}
          >
            ✅ Lock Positions
          </button>
        )}

        <button
          className="btn btn--small btn--success"
          onClick={handleStartAtBat}
          style={{ fontSize: 13 }}
        >
          ⚾ Start At Bat
        </button>

        <button
          className="btn btn--small"
          onClick={handleEditBatOrderRequest}
          style={{ fontSize: 13, borderColor: '#00E5FF', color: '#00E5FF' }}
        >
          📋 Edit Lineup
        </button>
      </div>

      {/* Next 3 batters bar */}
      {battingOrder && battingOrder.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 8,
          padding: '8px 10px',
          background: '#1a1a1a',
          borderRadius: 8,
          border: '1px solid #333',
          overflowX: 'auto',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, flexShrink: 0 }}>
            Next Up:
          </div>
          {[0, 1, 2].map((offset) => {
            const idx = ((atBat.nextBatterIndex || 0) + offset) % battingOrder.length
            const p = roster.find((r) => r.id === battingOrder[idx])
            if (!p) return null
            return (
              <div key={`${p.id}-${offset}`} style={{
                padding: '4px 10px',
                background: offset === 0 ? '#1a472a' : '#252525',
                border: offset === 0 ? '2px solid #00C853' : '1px solid #444',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 700,
                color: '#FFF',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                <span style={{ color: '#FFD700' }}>#{p.jerseyNumber}</span>{' '}
                {p.nickname || p.name.split(' ')[0]}
              </div>
            )
          })}
        </div>
      )}

      {/* Unlocked indicator */}
      {unlocked && (
        <div style={{
          textAlign: 'center',
          padding: '6px 12px',
          marginBottom: 8,
          background: 'rgba(255,152,0,0.15)',
          border: '2px solid #FF9800',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 700,
          color: '#FF9800',
        }}>
          🔓 EDITING MODE — Drag players to swap positions. Tap "Lock" when done.
        </div>
      )}

      {/* Diamond */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <DiamondSVG roster={roster} assignment={currentAssignment} unlocked={unlocked} />
        <BenchArea benchPlayerIds={currentAssignment.BENCH || []} roster={roster} unlocked={unlocked} />
      </DndContext>

      {/* Game info footer */}
      <div style={{ textAlign: 'center', marginTop: 8, fontSize: 13, color: '#555' }}>
        {teamName || 'Our Team'} vs {opponent || 'TBD'} · {isHome ? '🏠 HOME' : '🚌 AWAY'}
      </div>

      {/* Unlock PIN modal */}
      {showUnlockPin && (
        <PinModal
          message="Enter coach PIN to edit positions"
          onConfirm={handleUnlockConfirm}
          onCancel={() => setShowUnlockPin(false)}
        />
      )}

      {/* At bat PIN modal */}
      {showAtBatPin && (
        <PinModal
          message="Enter coach PIN to start at-bat"
          onConfirm={handleAtBatPinConfirm}
          onCancel={() => setShowAtBatPin(false)}
        />
      )}

      {/* Edit batting order PIN modal */}
      {showEditBatOrderPin && (
        <PinModal
          message="Enter coach PIN to edit batting order"
          onConfirm={handleEditBatOrderPinConfirm}
          onCancel={() => setShowEditBatOrderPin(false)}
        />
      )}
    </div>
  )
}
