import { useState } from 'react'
import PinModal from './PinModal'
import GameOverModal from '../batting/GameOverModal'
import { INNINGS, ordinalInning } from '../../constants'

export default function AtBatView({
  roster,
  battingOrder,
  atBat,
  updateAtBat,
  isHome,
  teamName,
  opponent,
  onExitAtBat,
  setViewingInning,
  onGameComplete,
}) {
  const [selectedLastOut, setSelectedLastOut] = useState(null)
  const [showPin, setShowPin] = useState(false)
  const [lastOutConfirmed, setLastOutConfirmed] = useState(false)
  const [confirmedPlayer, setConfirmedPlayer] = useState(null)
  const [showGameOver, setShowGameOver] = useState(false)

  const orderedPlayers = battingOrder
    .map((id) => roster.find((p) => p.id === id))
    .filter(Boolean)

  const nextBatterIdx = atBat.nextBatterIndex || 0

  // Current batter and next 3
  const currentBatter = orderedPlayers[nextBatterIdx]
  const onDeck = []
  for (let i = 1; i <= 3; i++) {
    const idx = (nextBatterIdx + i) % orderedPlayers.length
    onDeck.push({ player: orderedPlayers[idx], index: idx })
  }

  const lastOutPlayer = atBat.lastOutPlayerId
    ? roster.find((p) => p.id === atBat.lastOutPlayerId)
    : null

  const battingHalf = isHome ? 'BOTTOM' : 'TOP'

  const handleSelectLastOut = (playerId) => {
    setSelectedLastOut(playerId)
    setShowPin(true)
  }

  const handlePinConfirm = () => {
    if (!selectedLastOut) return
    const player = roster.find((p) => p.id === selectedLastOut)
    const idx = battingOrder.indexOf(selectedLastOut)
    const nextIdx = idx >= 0 ? (idx + 1) % battingOrder.length : 0

    // Save the last out + next batter, but DON'T advance inning yet or exit
    updateAtBat({
      lastOutPlayerId: selectedLastOut,
      nextBatterIndex: nextIdx,
    })

    setShowPin(false)
    setConfirmedPlayer(player)
    setLastOutConfirmed(true)
    setSelectedLastOut(null)
  }

  const handleEndAtBat = () => {
    if (atBat.currentInning >= INNINGS) {
      // Last inning — ask if game is over
      setShowGameOver(true)
      return
    }
    const nextInning = atBat.currentInning + 1
    updateAtBat({
      isAtBat: false,
      currentInning: nextInning,
    })
    if (setViewingInning) {
      setViewingInning(nextInning)
    }
    onExitAtBat()
  }

  const handleGameOverNo = () => {
    // Not over — continue to extra innings
    const nextInning = atBat.currentInning + 1
    updateAtBat({
      isAtBat: false,
      currentInning: nextInning,
    })
    setShowGameOver(false)
    if (setViewingInning) {
      setViewingInning(nextInning)
    }
    onExitAtBat()
  }

  const handleGameOverDone = ({ scoreUs, scoreThem, result }) => {
    updateAtBat({
      isAtBat: false,
      currentInning: atBat.currentInning,
    })
    setShowGameOver(false)
    if (onGameComplete) onGameComplete({ scoreUs, scoreThem, result })
  }

  // After last out is confirmed, show the "End At Bat" screen
  if (lastOutConfirmed && confirmedPlayer) {
    const nextBatter = orderedPlayers[atBat.nextBatterIndex || 0]
    const nextInning = Math.min(atBat.currentInning + 1, INNINGS)

    return (
      <div>
        {/* Confirmed banner */}
        <div style={{
          textAlign: 'center',
          padding: '20px 16px',
          marginBottom: 16,
          background: 'rgba(255,23,68,0.1)',
          borderRadius: 12,
          border: '3px solid #FF1744',
        }}>
          <div style={{ fontSize: 14, color: '#FF1744', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
            Last Out Recorded
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#FFD700', lineHeight: 1 }}>
            #{confirmedPlayer.jerseyNumber}
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#FFF', marginTop: 4 }}>
            {confirmedPlayer.nickname || confirmedPlayer.name}
          </div>
        </div>

        {/* Next batter info */}
        {nextBatter && (
          <div style={{
            textAlign: 'center',
            padding: 16,
            marginBottom: 16,
            background: '#1a472a',
            borderRadius: 10,
            border: '2px solid #00C853',
          }}>
            <div style={{ fontSize: 12, color: '#00C853', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
              Next time up — Batter #{(atBat.nextBatterIndex || 0) + 1}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#FFD700' }}>
              #{nextBatter.jerseyNumber} {nextBatter.nickname || nextBatter.name}
            </div>
          </div>
        )}

        {/* End At Bat button */}
        <button
          onClick={handleEndAtBat}
          style={{
            width: '100%',
            minHeight: 64,
            fontSize: 22,
            fontWeight: 900,
            border: '3px solid #FFD700',
            borderRadius: 12,
            background: 'rgba(255,215,0,0.15)',
            color: '#FFD700',
            cursor: 'pointer',
            padding: '16px',
            marginBottom: 12,
          }}
        >
          {atBat.currentInning >= INNINGS ? 'End At Bat → End Game?' : `End At Bat → ${ordinalInning(nextInning)} Inning ▶`}
        </button>

        {/* Option to pick a different player */}
        <button
          onClick={() => {
            setLastOutConfirmed(false)
            setConfirmedPlayer(null)
          }}
          style={{
            width: '100%',
            minHeight: 44,
            fontSize: 14,
            fontWeight: 700,
            border: '1px solid #555',
            borderRadius: 8,
            background: '#2A2A2A',
            color: '#888',
            cursor: 'pointer',
            padding: '10px',
          }}
        >
          ← Wrong player? Go back
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        padding: '12px 0',
        marginBottom: 12,
        background: 'rgba(255,215,0,0.1)',
        borderRadius: 10,
        border: '2px solid #FFD700',
      }}>
        <div style={{ fontSize: 14, color: '#888', textTransform: 'uppercase', letterSpacing: 2 }}>
          {battingHalf} of the {ordinalInning(atBat.currentInning)} Inning
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#FFD700' }}>
          ⚾ WE'RE AT BAT
        </div>
        <div style={{ fontSize: 13, color: '#888' }}>
          {teamName || 'Our Team'} vs {opponent || 'TBD'} · {isHome ? 'HOME' : 'AWAY'}
        </div>
      </div>

      {/* Current batter - BIG */}
      {currentBatter && (
        <div style={{
          textAlign: 'center',
          padding: 20,
          marginBottom: 12,
          background: '#1a472a',
          borderRadius: 12,
          border: '3px solid #00C853',
        }}>
          <div style={{ fontSize: 12, color: '#00C853', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
            NOW BATTING
          </div>
          <div style={{ fontSize: 42, fontWeight: 900, color: '#FFD700', lineHeight: 1 }}>
            #{currentBatter.jerseyNumber}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#FFF', marginTop: 4 }}>
            {currentBatter.nickname || currentBatter.name}
          </div>
        </div>
      )}

      {/* On deck - next 3 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          On Deck
        </div>
        {onDeck.map(({ player, index }, i) => (
          <div key={`${player.id}-${i}`} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 16px',
            marginBottom: 4,
            background: i === 0 ? 'rgba(0,229,255,0.08)' : '#1e1e1e',
            borderRadius: 8,
            border: i === 0 ? '2px solid #00E5FF' : '2px solid transparent',
          }}>
            <span style={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              background: i === 0 ? '#00E5FF' : '#333',
              color: i === 0 ? '#000' : '#888',
              fontSize: 13,
              fontWeight: 900,
              flexShrink: 0,
            }}>
              {i === 0 ? 'OD' : i + 1}
            </span>
            <span style={{ color: '#FFD700', fontSize: 15 }}>#{player.jerseyNumber}</span>
            <span style={{ color: '#FFF', fontSize: 17, fontWeight: 700 }}>{player.nickname || player.name}</span>
          </div>
        ))}
      </div>

      {/* Full batting order / last out selector */}
      <div style={{
        padding: 12,
        background: '#1a1a1a',
        borderRadius: 10,
        border: '2px solid #333',
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#FF1744', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, textAlign: 'center' }}>
          Tap the player who made the last out
        </div>
        {orderedPlayers.map((player, idx) => {
          const isSelected = selectedLastOut === player.id
          const isCurrent = idx === nextBatterIdx
          const isLast = player.id === atBat.lastOutPlayerId

          return (
            <button
              key={player.id}
              onClick={() => handleSelectLastOut(player.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                marginBottom: 3,
                background: isSelected ? 'rgba(255,23,68,0.2)' : isCurrent ? 'rgba(255,215,0,0.08)' : '#252525',
                border: isSelected ? '2px solid #FF1744' : '2px solid transparent',
                borderRadius: 8,
                cursor: 'pointer',
                textAlign: 'left',
                color: '#FFF',
                fontSize: 15,
              }}
            >
              <span style={{
                width: 26,
                height: 26,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                background: isCurrent ? '#FFD700' : '#333',
                color: isCurrent ? '#000' : '#888',
                fontSize: 12,
                fontWeight: 900,
                flexShrink: 0,
              }}>
                {idx + 1}
              </span>
              <span style={{ color: '#FFD700', fontSize: 13 }}>#{player.jerseyNumber}</span>
              <span style={{ flex: 1, fontWeight: 600 }}>{player.nickname || player.name}</span>
              {isSelected && (
                <span style={{ padding: '2px 8px', background: '#FF1744', borderRadius: 4, fontSize: 11, fontWeight: 900 }}>
                  LAST OUT
                </span>
              )}
              {isLast && !isSelected && (
                <span style={{ fontSize: 11, color: '#666' }}>prev out</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Last out info */}
      {lastOutPlayer && (
        <div style={{ textAlign: 'center', marginTop: 10, fontSize: 13, color: '#666' }}>
          Previous last out: #{lastOutPlayer.jerseyNumber} {lastOutPlayer.nickname || lastOutPlayer.name}
        </div>
      )}

      {/* PIN confirm for last out */}
      {showPin && (
        <PinModal
          message={`Confirm: #${roster.find(p => p.id === selectedLastOut)?.jerseyNumber} ${roster.find(p => p.id === selectedLastOut)?.nickname || roster.find(p => p.id === selectedLastOut)?.name} made the last out?`}
          onConfirm={handlePinConfirm}
          onCancel={() => { setShowPin(false); setSelectedLastOut(null) }}
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
