import { useState, useCallback } from 'react'
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import PinModal from '../field/PinModal'
import LastOutModal from './LastOutModal'
import GameOverModal from './GameOverModal'
import { INNINGS, ordinalInning } from '../../constants'

function SortablePlayer({ player, index, isNextUp, isLastOut }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: player.id,
  })

  const style = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    marginBottom: 4,
    background: isNextUp ? 'rgba(255,215,0,0.15)' : isDragging ? 'rgba(255,215,0,0.1)' : '#252525',
    borderRadius: 8,
    border: isNextUp ? '2px solid #FFD700' : '2px solid transparent',
    fontSize: 17,
    fontWeight: 700,
    color: '#FFF',
    cursor: 'grab',
    opacity: isDragging ? 0.5 : 1,
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: 'none',
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <span style={{
        width: 32,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        background: isNextUp ? '#FFD700' : '#444',
        color: isNextUp ? '#000' : '#FFF',
        fontSize: 15,
        fontWeight: 900,
        flexShrink: 0,
      }}>
        {index + 1}
      </span>
      <span style={{ color: '#FFD700', fontSize: 15, flexShrink: 0 }}>#{player.jerseyNumber}</span>
      <span style={{ flex: 1 }}>{player.name}</span>
      {isNextUp && (
        <span style={{
          padding: '3px 10px',
          background: '#FFD700',
          color: '#000',
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: 1,
        }}>
          LEADS OFF
        </span>
      )}
      {isLastOut && (
        <span style={{
          padding: '3px 10px',
          background: '#FF1744',
          color: '#FFF',
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 900,
        }}>
          LAST OUT
        </span>
      )}
      <span style={{ color: '#555', fontSize: 20 }}>⠿</span>
    </div>
  )
}

export default function BattingScreen({ roster, battingOrder, updateBattingOrder, atBat, updateAtBat, opponent, isHome, onSwitchToField, teamName, onGameComplete, isParent }) {
  const [pendingReorder, setPendingReorder] = useState(null)
  const [showPin, setShowPin] = useState(false)
  const [showLastOut, setShowLastOut] = useState(false)
  const [showGameOver, setShowGameOver] = useState(false)
  const [pendingLastOut, setPendingLastOut] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = battingOrder.indexOf(active.id)
    const newIndex = battingOrder.indexOf(over.id)
    if (oldIndex === -1 || newIndex === -1) return

    setPendingReorder({ oldIndex, newIndex })
    setShowPin(true)
  }, [battingOrder])

  const applyReorder = () => {
    if (!pendingReorder) return
    const newOrder = arrayMove(battingOrder, pendingReorder.oldIndex, pendingReorder.newIndex)
    updateBattingOrder(newOrder)
    setPendingReorder(null)
    setShowPin(false)
  }

  const handleAtBatToggle = () => {
    if (!atBat.isAtBat) {
      updateAtBat({ isAtBat: true })
    } else {
      setShowLastOut(true)
    }
  }

  const handleLastOutSelect = (playerId) => {
    const idx = battingOrder.indexOf(playerId)
    const nextIdx = idx >= 0 ? (idx + 1) % battingOrder.length : 0

    if (atBat.currentInning >= INNINGS) {
      // Last inning or extra innings — ask if game is over
      setPendingLastOut({ playerId, nextIdx })
      setShowLastOut(false)
      setShowGameOver(true)
    } else {
      updateAtBat({
        isAtBat: false,
        lastOutPlayerId: playerId,
        nextBatterIndex: nextIdx,
        currentInning: atBat.currentInning + 1,
      })
      setShowLastOut(false)
      if (onSwitchToField) onSwitchToField()
    }
  }

  const handleGameOverNo = () => {
    // Not over — continue to extra innings
    if (pendingLastOut) {
      updateAtBat({
        isAtBat: false,
        lastOutPlayerId: pendingLastOut.playerId,
        nextBatterIndex: pendingLastOut.nextIdx,
        currentInning: atBat.currentInning + 1,
      })
    }
    setShowGameOver(false)
    setPendingLastOut(null)
    if (onSwitchToField) onSwitchToField()
  }

  const handleGameOverDone = ({ scoreUs, scoreThem, result }) => {
    if (pendingLastOut) {
      updateAtBat({
        isAtBat: false,
        lastOutPlayerId: pendingLastOut.playerId,
        nextBatterIndex: pendingLastOut.nextIdx,
        currentInning: atBat.currentInning,
      })
    }
    setShowGameOver(false)
    setPendingLastOut(null)
    if (onGameComplete) onGameComplete({ scoreUs, scoreThem, result })
  }

  const orderedPlayers = battingOrder
    .map((id) => roster.find((p) => p.id === id))
    .filter(Boolean)

  const lastOutPlayer = atBat.lastOutPlayerId
    ? roster.find((p) => p.id === atBat.lastOutPlayerId)
    : null

  return (
    <div>
      <div className="screen-title">
        Batting Order {opponent ? `vs ${opponent}` : ''}
      </div>

      {/* At-bat controls */}
      {isParent ? (
        <div style={{
          textAlign: 'center',
          padding: 12,
          marginBottom: 16,
          background: atBat.isAtBat ? 'rgba(0,200,83,0.1)' : '#1a1a1a',
          borderRadius: 10,
          border: atBat.isAtBat ? '2px solid #00C853' : '2px solid #333',
        }}>
          <span style={{ fontSize: 14, color: '#888' }}>Current Inning: </span>
          <span style={{ fontSize: 20, fontWeight: 900, color: '#FFD700' }}>{ordinalInning(atBat.currentInning)}</span>
          {atBat.isAtBat && (
            <div style={{ fontSize: 13, fontWeight: 700, color: '#00C853', marginTop: 4 }}>
              AT BAT NOW
            </div>
          )}
        </div>
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 16,
          padding: 12,
          background: atBat.isAtBat ? 'rgba(0,200,83,0.1)' : '#1a1a1a',
          borderRadius: 10,
          border: atBat.isAtBat ? '2px solid #00C853' : '2px solid #333',
        }}>
          <div style={{ textAlign: 'center', flex: '1 1 100%', marginBottom: 4 }}>
            <span style={{ fontSize: 14, color: '#888' }}>Batting: </span>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#FFD700' }}>{ordinalInning(atBat.currentInning)} Inning</span>
          </div>
          <button
            className={`btn ${atBat.isAtBat ? 'btn--danger' : 'btn--success'}`}
            onClick={handleAtBatToggle}
            style={{ fontSize: 16, minWidth: 180 }}
          >
            {atBat.isAtBat ? '⬛ END AT BAT' : '▶ START AT BAT'}
          </button>
        </div>
      )}

      {/* Last out info */}
      {lastOutPlayer && (
        <div style={{
          textAlign: 'center',
          padding: 10,
          marginBottom: 12,
          background: '#1a1a1a',
          borderRadius: 8,
          fontSize: 14,
          color: '#888',
        }}>
          Last out: <strong style={{ color: '#FF1744' }}>#{lastOutPlayer.jerseyNumber} {lastOutPlayer.name}</strong>
          <span style={{ color: '#555' }}> ({ordinalInning(Math.max(1, atBat.currentInning - 1))} Inning)</span>
        </div>
      )}

      {/* Batting order list */}
      {isParent ? (
        <div>
          {orderedPlayers.map((player, index) => (
            <div key={player.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              marginBottom: 4,
              background: index === atBat.nextBatterIndex ? 'rgba(255,215,0,0.15)' : '#252525',
              borderRadius: 8,
              border: index === atBat.nextBatterIndex ? '2px solid #FFD700' : '2px solid transparent',
              fontSize: 17,
              fontWeight: 700,
              color: '#FFF',
            }}>
              <span style={{
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%',
                background: index === atBat.nextBatterIndex ? '#FFD700' : '#444',
                color: index === atBat.nextBatterIndex ? '#000' : '#FFF',
                fontSize: 15, fontWeight: 900, flexShrink: 0,
              }}>
                {index + 1}
              </span>
              <span style={{ color: '#FFD700', fontSize: 15, flexShrink: 0 }}>#{player.jerseyNumber}</span>
              <span style={{ flex: 1 }}>{player.name}</span>
              {index === atBat.nextBatterIndex && (
                <span style={{
                  padding: '3px 10px', background: '#FFD700', color: '#000',
                  borderRadius: 4, fontSize: 11, fontWeight: 900, letterSpacing: 1,
                }}>
                  UP NEXT
                </span>
              )}
              {player.id === atBat.lastOutPlayerId && (
                <span style={{
                  padding: '3px 10px', background: '#FF1744', color: '#FFF',
                  borderRadius: 4, fontSize: 11, fontWeight: 900,
                }}>
                  LAST OUT
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={battingOrder} strategy={verticalListSortingStrategy}>
              {orderedPlayers.map((player, index) => (
                <SortablePlayer
                  key={player.id}
                  player={player}
                  index={index}
                  isNextUp={index === atBat.nextBatterIndex}
                  isLastOut={player.id === atBat.lastOutPlayerId}
                />
              ))}
            </SortableContext>
          </DndContext>

          <div style={{ marginTop: 16, fontSize: 13, color: '#555', textAlign: 'center' }}>
            Drag players to reorder batting lineup (PIN required)
          </div>
        </>
      )}

      {showPin && (
        <PinModal
          message="Enter coach PIN to reorder batting lineup"
          onConfirm={applyReorder}
          onCancel={() => { setShowPin(false); setPendingReorder(null) }}
        />
      )}

      {showLastOut && (
        <LastOutModal
          roster={roster}
          battingOrder={battingOrder}
          onSelect={handleLastOutSelect}
          onCancel={() => setShowLastOut(false)}
        />
      )}

      {showGameOver && (
        <GameOverModal
          teamName={teamName}
          opponent={opponent}
          onNo={handleGameOverNo}
          onDone={handleGameOverDone}
        />
      )}
    </div>
  )
}
