import { useState, useCallback, useEffect } from 'react'
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
import GameOverModal from '../batting/GameOverModal'

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
  absentIds,
  markPlayerAbsent,
  unmarkPlayerAbsent,
  resetGame,
  isParent,
  onSwitchToBatting,
}) {
  // Unlock/lock mode: false = locked (kids view), true = coach is editing
  const [unlocked, setUnlocked] = useState(false)
  const [showUnlockPin, setShowUnlockPin] = useState(false)
  const [showEditBatOrderPin, setShowEditBatOrderPin] = useState(false)
  const [editingBatOrder, setEditingBatOrder] = useState(false)
  const [tempBatOrder, setTempBatOrder] = useState([])
  const [showEndGamePin, setShowEndGamePin] = useState(false)
  const [showGameOver, setShowGameOver] = useState(false)
  const [showInningPin, setShowInningPin] = useState(false)
  const [pendingInning, setPendingInning] = useState(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showResetPin, setShowResetPin] = useState(false)
  const [showMarkAbsentPin, setShowMarkAbsentPin] = useState(false)
  const [showAbsentPicker, setShowAbsentPicker] = useState(false)
  const [showUnmarkAbsentPin, setShowUnmarkAbsentPin] = useState(false)
  const [pendingUnmarkId, setPendingUnmarkId] = useState(null)

  // Parents use local inning state (no PIN, no Firestore write)
  const [localViewingInning, setLocalViewingInning] = useState(viewingInning)
  useEffect(() => {
    if (isParent) setLocalViewingInning(viewingInning)
  }, [viewingInning, isParent])
  const effectiveInning = isParent ? localViewingInning : viewingInning

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  const batOrderSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  const currentAssignment = assignments[String(effectiveInning)] || {}

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
  }, [unlocked, currentAssignment, effectiveInning])

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

    updateAssignments(effectiveInning, assignment)
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

  // End game flow (away team after fielding final inning)
  const handleEndGameRequest = () => {
    setShowEndGamePin(true)
  }

  const handleEndGamePinConfirm = () => {
    setShowEndGamePin(false)
    setShowGameOver(true)
  }

  const handleGameOverNo = () => {
    // Not over — continue to extra innings
    const nextInning = atBat.currentInning + 1
    updateAtBat({
      isAtBat: false,
      currentInning: nextInning,
      awaitingFinalFielding: false,
    })
    setShowGameOver(false)
    setViewingInning(nextInning)
  }

  const handleGameOverDone = ({ scoreUs, scoreThem, result }) => {
    updateAtBat({
      isAtBat: false,
      awaitingFinalFielding: false,
    })
    setShowGameOver(false)
    if (onGameComplete) onGameComplete({ scoreUs, scoreThem, result })
  }

  // --- Inning navigation (PIN-protected) ---
  const handleInningChange = (newInning) => {
    setPendingInning(newInning)
    setShowInningPin(true)
  }
  const handleInningPinConfirm = () => {
    setShowInningPin(false)
    if (pendingInning != null) { setViewingInning(pendingInning); setPendingInning(null) }
  }

  // --- Reset Game flow ---
  const handleResetRequest = () => setShowResetConfirm(true)
  const handleResetConfirmYes = () => { setShowResetConfirm(false); setShowResetPin(true) }
  const handleResetPinConfirm = () => { setShowResetPin(false); resetGame() }

  // --- Mark Absent flow ---
  const handleMarkAbsentRequest = () => setShowMarkAbsentPin(true)
  const handleMarkAbsentPinConfirm = () => { setShowMarkAbsentPin(false); setShowAbsentPicker(true) }
  const handlePickAbsent = (playerId) => markPlayerAbsent(playerId)
  const handleCloseAbsentPicker = () => setShowAbsentPicker(false)

  // --- Unmark Absent flow ---
  const handleUnmarkAbsentRequest = (playerId) => { setPendingUnmarkId(playerId); setShowUnmarkAbsentPin(true) }
  const handleUnmarkAbsentPinConfirm = () => {
    setShowUnmarkAbsentPin(false)
    if (pendingUnmarkId) { unmarkPlayerAbsent(pendingUnmarkId); setPendingUnmarkId(null) }
  }

  const awaitingFinalFielding = !isHome && atBat.awaitingFinalFielding && effectiveInning >= INNINGS

  const battingHalf = isHome ? 'Bottom' : 'Top'
  const fieldingHalf = isHome ? 'Top' : 'Bottom'

  const nextBatter = battingOrder && atBat.nextBatterIndex != null
    ? roster.find((p) => p.id === battingOrder[atBat.nextBatterIndex])
    : null

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
          onClick={() => isParent
            ? setLocalViewingInning(Math.max(1, effectiveInning - 1))
            : handleInningChange(Math.max(1, effectiveInning - 1))
          }
          disabled={effectiveInning <= 1}
          style={{ opacity: effectiveInning <= 1 ? 0.3 : 1, minWidth: 48 }}
        >
          ◀
        </button>

        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#FFD700', lineHeight: 1 }}>
            {ordinalInning(effectiveInning)} INNING
          </div>
          <div style={{ fontSize: 12, color: '#888' }}>
            of {INNINGS} · {fieldingHalf}: We Field · {battingHalf}: We Bat
          </div>
        </div>

        <button
          className="btn btn--small"
          onClick={() => isParent
            ? setLocalViewingInning(Math.min(INNINGS, effectiveInning + 1))
            : handleInningChange(Math.min(INNINGS, effectiveInning + 1))
          }
          disabled={effectiveInning >= INNINGS}
          style={{ opacity: effectiveInning >= INNINGS ? 0.3 : 1, minWidth: 48 }}
        >
          ▶
        </button>
      </div>

      {/* LIVE indicator for parents */}
      {isParent && (
        <div style={{
          textAlign: 'center',
          padding: '6px 12px',
          marginBottom: 8,
          background: 'rgba(255,152,0,0.1)',
          border: '1px solid #FF9800',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          color: '#FF9800',
        }}>
          LIVE – Updates in real-time as the coach makes changes
        </div>
      )}

      {/* Action bar: unlock/lock + start at bat (coaches only) */}
      {!isParent && (
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
            className="btn btn--small"
            onClick={handleEditBatOrderRequest}
            style={{ fontSize: 13, borderColor: '#00E5FF', color: '#00E5FF' }}
          >
            📋 Edit Lineup
          </button>

          <button
            className="btn btn--small"
            onClick={handleMarkAbsentRequest}
            style={{ fontSize: 13, borderColor: '#FF1744', color: '#FF1744' }}
          >
            ❌ Mark Absent
          </button>
        </div>
      )}

      {/* At-bat banner — nudge coach to Batting tab */}
      {atBat.isAtBat && !isParent && (
        <button
          onClick={onSwitchToBatting}
          style={{
            width: '100%',
            padding: '14px 16px',
            marginBottom: 8,
            background: 'rgba(0,200,83,0.12)',
            border: '3px solid #00C853',
            borderRadius: 10,
            fontSize: 17,
            fontWeight: 900,
            color: '#00C853',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          ⚾ We're At Bat — Tap to Track Batting Order →
        </button>
      )}

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

      {/* Absent players section */}
      {absentIds && absentIds.length > 0 && (
        <div style={{
          marginTop: 12,
          padding: 10,
          background: 'rgba(255,23,68,0.05)',
          borderRadius: 10,
          border: '1px solid #333',
        }}>
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#FF1744',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 6,
          }}>
            Absent ({absentIds.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {absentIds.map((pid) => {
              const p = roster.find((r) => r.id === pid)
              if (!p) return null
              return isParent ? (
                <div
                  key={pid}
                  style={{
                    padding: '6px 10px',
                    fontSize: 13,
                    fontWeight: 700,
                    background: '#2A2A2A',
                    color: '#FF9800',
                    border: '1px solid #555',
                    borderRadius: 6,
                  }}
                >
                  #{p.jerseyNumber} {(p.nickname || p.name).split(' ')[0]}
                </div>
              ) : (
                <button
                  key={pid}
                  onClick={() => handleUnmarkAbsentRequest(pid)}
                  style={{
                    padding: '6px 10px',
                    fontSize: 13,
                    fontWeight: 700,
                    background: '#2A2A2A',
                    color: '#FF9800',
                    border: '1px solid #555',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  #{p.jerseyNumber} {(p.nickname || p.name).split(' ')[0]} ↩
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* End Game button — shown for away team fielding the final inning (coaches only) */}
      {awaitingFinalFielding && !isParent && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <div style={{
            padding: '10px 16px',
            marginBottom: 10,
            background: 'rgba(0,200,83,0.1)',
            border: '2px solid #00C853',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            color: '#00C853',
          }}>
            Bottom of the {ordinalInning(effectiveInning)} — We're fielding. When the inning ends:
          </div>
          <button
            onClick={handleEndGameRequest}
            style={{
              width: '100%',
              minHeight: 60,
              fontSize: 22,
              fontWeight: 900,
              border: '3px solid #FFD700',
              borderRadius: 12,
              background: 'rgba(255,215,0,0.15)',
              color: '#FFD700',
              cursor: 'pointer',
              padding: '14px',
            }}
          >
            🏁 End Game
          </button>
        </div>
      )}

      {/* Game info footer */}
      <div style={{ textAlign: 'center', marginTop: 8, fontSize: 13, color: '#555' }}>
        {teamName || 'Our Team'} vs {opponent || 'TBD'} · {isHome ? '🏠 HOME' : '🚌 AWAY'}
      </div>
      {!isParent && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button
            onClick={handleResetRequest}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#666',
              background: 'transparent',
              border: '1px solid #444',
              borderRadius: 6,
              padding: '6px 14px',
              cursor: 'pointer',
            }}
          >
            Reset Game (wrong team?)
          </button>
        </div>
      )}

      {/* Unlock PIN modal */}
      {showUnlockPin && (
        <PinModal
          message="Enter coach PIN to edit positions"
          onConfirm={handleUnlockConfirm}
          onCancel={() => setShowUnlockPin(false)}
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

      {/* End game PIN modal */}
      {showEndGamePin && (
        <PinModal
          message="Enter coach PIN to end the game"
          onConfirm={handleEndGamePinConfirm}
          onCancel={() => setShowEndGamePin(false)}
        />
      )}

      {/* Game over modal */}
      {showGameOver && (
        <GameOverModal
          teamName={teamName}
          opponent={opponent}
          onNo={handleGameOverNo}
          onDone={handleGameOverDone}
        />
      )}

      {/* Absent picker modal */}
      {showAbsentPicker && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20,
        }}>
          <div style={{
            background: '#1e1e1e',
            border: '2px solid #FF1744',
            borderRadius: 12,
            padding: 20,
            width: '100%',
            maxWidth: 360,
            maxHeight: '80vh',
            overflowY: 'auto',
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#FF1744', textAlign: 'center', marginBottom: 4 }}>
              Mark Player Absent
            </div>
            <div style={{ fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 16 }}>
              Tap a player to mark them absent
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {roster
                .filter((p) => !(absentIds || []).includes(p.id))
                .map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handlePickAbsent(player.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 14px',
                      background: '#252525',
                      border: '2px solid #444',
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: '#FFF',
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                  >
                    <span style={{ color: '#FFD700', fontSize: 14 }}>#{player.jerseyNumber}</span>
                    <span>{player.nickname || player.name}</span>
                  </button>
                ))}
            </div>
            <button
              onClick={handleCloseAbsentPicker}
              style={{
                width: '100%',
                marginTop: 16,
                minHeight: 48,
                fontSize: 16,
                fontWeight: 700,
                border: '2px solid #555',
                borderRadius: 8,
                background: '#2A2A2A',
                color: '#FFF',
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Reset game confirmation */}
      {showResetConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20,
        }}>
          <div style={{
            background: '#1e1e1e',
            border: '2px solid #FF1744',
            borderRadius: 12,
            padding: 24,
            width: '100%',
            maxWidth: 340,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#FF1744', marginBottom: 8 }}>
              Reset This Game?
            </div>
            <div style={{ fontSize: 14, color: '#aaa', marginBottom: 20, lineHeight: 1.4 }}>
              This will erase all lineup, positions, and batting data for this game. The game will go back to "not started" on the schedule.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowResetConfirm(false)}
                style={{
                  flex: 1, minHeight: 48, fontSize: 15, fontWeight: 700,
                  border: '2px solid #555', borderRadius: 10,
                  background: '#2A2A2A', color: '#888', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleResetConfirmYes}
                style={{
                  flex: 1, minHeight: 48, fontSize: 15, fontWeight: 900,
                  border: '2px solid #FF1744', borderRadius: 10,
                  background: 'rgba(255,23,68,0.15)', color: '#FF1744', cursor: 'pointer',
                }}
              >
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset game PIN modal */}
      {showResetPin && (
        <PinModal
          message="Enter coach PIN to reset this game"
          onConfirm={handleResetPinConfirm}
          onCancel={() => setShowResetPin(false)}
        />
      )}

      {/* Inning change PIN modal */}
      {showInningPin && (
        <PinModal
          message={`Enter coach PIN to switch to ${pendingInning ? ordinalInning(pendingInning) : ''} inning`}
          onConfirm={handleInningPinConfirm}
          onCancel={() => { setShowInningPin(false); setPendingInning(null) }}
        />
      )}

      {/* Mark absent PIN modal */}
      {showMarkAbsentPin && (
        <PinModal
          message="Enter coach PIN to mark a player absent"
          onConfirm={handleMarkAbsentPinConfirm}
          onCancel={() => setShowMarkAbsentPin(false)}
        />
      )}

      {/* Unmark absent PIN modal */}
      {showUnmarkAbsentPin && (
        <PinModal
          message="Enter coach PIN to bring player back"
          onConfirm={handleUnmarkAbsentPinConfirm}
          onCancel={() => { setShowUnmarkAbsentPin(false); setPendingUnmarkId(null) }}
        />
      )}
    </div>
  )
}
