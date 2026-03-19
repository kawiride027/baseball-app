import { POSITIONS, POSITION_COORDS } from '../../constants'
import { useDroppable } from '@dnd-kit/core'
import PlayerChip from './PlayerChip'

function DroppableSlot({ position, player, unlocked }) {
  const { setNodeRef, isOver: slotIsOver } = useDroppable({ id: position, data: { position }, disabled: !unlocked })
  const coords = POSITION_COORDS[position]
  const chipWidth = 110
  const chipHeight = 64

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
        <div style={{ fontSize: 12, fontWeight: 900, color: '#00E5FF', textAlign: 'center', lineHeight: 1 }}>
          {position}
        </div>
        {player ? (
          <PlayerChip player={player} position={position} unlocked={unlocked} />
        ) : (
          <div style={{ fontSize: 12, color: '#666', textAlign: 'center' }}>empty</div>
        )}
      </div>
    </foreignObject>
  )
}

export default function DiamondSVG({ roster, assignment, unlocked }) {
  return (
    <svg viewBox="0 0 620 400" style={{ width: '100%', display: 'block', margin: '0 auto' }}>
      {/* Grass background */}
      <rect x="0" y="0" width="620" height="400" rx="16" fill="#1a472a" />

      {/* Outfield arc */}
      <path d="M 25,108 Q 310,-17 595,108" fill="none" stroke="#2d7a3a" strokeWidth="2" strokeDasharray="6 4" />

      {/* Infield dirt */}
      <polygon points="310,129 477,225 310,325 143,225" fill="#6B5210" opacity="0.5" />

      {/* Base paths (white lines) */}
      <line x1="310" y1="133" x2="471" y2="223" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
      <line x1="471" y1="223" x2="310" y2="321" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
      <line x1="310" y1="321" x2="149" y2="223" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
      <line x1="149" y1="223" x2="310" y2="133" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />

      {/* Bases */}
      <rect x="304" y="127" width="12" height="12" fill="white" transform="rotate(45 310 133)" />
      <rect x="465" y="217" width="12" height="12" fill="white" transform="rotate(45 471 223)" />
      <rect x="143" y="217" width="12" height="12" fill="white" transform="rotate(45 149 223)" />

      {/* Home plate */}
      <polygon points="310,321 304,327 310,333 316,327" fill="white" />

      {/* Pitcher's mound */}
      <circle cx="310" cy="220" r="8" fill="#8B6914" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />

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
