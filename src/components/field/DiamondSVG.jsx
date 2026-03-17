import { POSITIONS, POSITION_COORDS } from '../../constants'
import { useDroppable } from '@dnd-kit/core'
import PlayerChip from './PlayerChip'

function DroppableSlot({ position, player, unlocked }) {
  const { setNodeRef, isOver: slotIsOver } = useDroppable({ id: position, data: { position }, disabled: !unlocked })
  const coords = POSITION_COORDS[position]
  const chipWidth = 90
  const chipHeight = 56

  return (
    <foreignObject
      x={coords.x - chipWidth / 2}
      y={coords.y - chipHeight / 2}
      width={chipWidth}
      height={chipHeight}
    >
      <div
        ref={setNodeRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          border: slotIsOver && unlocked ? '2px solid #FFD700' : '2px solid rgba(255,255,255,0.15)',
          background: slotIsOver && unlocked
            ? 'rgba(255,215,0,0.3)'
            : 'rgba(0,0,0,0.65)',
          transition: 'all 0.15s',
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 700, color: '#00E5FF', textAlign: 'center', lineHeight: 1 }}>
          {position}
        </div>
        {player ? (
          <PlayerChip player={player} position={position} unlocked={unlocked} />
        ) : (
          <div style={{ fontSize: 10, color: '#666', textAlign: 'center' }}>empty</div>
        )}
      </div>
    </foreignObject>
  )
}

export default function DiamondSVG({ roster, assignment, unlocked }) {
  return (
    <svg viewBox="0 0 500 480" style={{ width: '100%', maxWidth: 600, display: 'block', margin: '0 auto' }}>
      {/* Grass background */}
      <rect x="0" y="0" width="500" height="480" rx="16" fill="#1a472a" />

      {/* Outfield arc */}
      <path d="M 20,130 Q 250,-20 480,130" fill="none" stroke="#2d7a3a" strokeWidth="2" strokeDasharray="6 4" />

      {/* Infield dirt */}
      <polygon points="250,155 385,270 250,390 115,270" fill="#6B5210" opacity="0.5" />

      {/* Base paths (white lines) */}
      <line x1="250" y1="160" x2="380" y2="268" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
      <line x1="380" y1="268" x2="250" y2="385" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
      <line x1="250" y1="385" x2="120" y2="268" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
      <line x1="120" y1="268" x2="250" y2="160" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />

      {/* Bases */}
      <rect x="244" y="154" width="12" height="12" fill="white" transform="rotate(45 250 160)" />
      <rect x="374" y="262" width="12" height="12" fill="white" transform="rotate(45 380 268)" />
      <rect x="114" y="262" width="12" height="12" fill="white" transform="rotate(45 120 268)" />

      {/* Home plate */}
      <polygon points="250,385 244,393 250,399 256,393" fill="white" />

      {/* Pitcher's mound */}
      <circle cx="250" cy="260" r="8" fill="#8B6914" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />

      {/* Position slots */}
      {POSITIONS.map((pos) => {
        const player = assignment[pos]
          ? roster.find((p) => p.id === assignment[pos])
          : null
        return (
          <DroppableSlot
            key={pos}
            position={pos}
            player={player}
            unlocked={unlocked}
          />
        )
      })}
    </svg>
  )
}
