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
          borderRadius: 10,
          border: slotIsOver && unlocked ? '2px solid #FFD700' : '1.5px solid rgba(255,255,255,0.12)',
          background: slotIsOver && unlocked
            ? 'rgba(255,215,0,0.3)'
            : 'rgba(0,0,0,0.7)',
          transition: 'all 0.15s',
          boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 900, color: '#4FC3F7', textAlign: 'center', lineHeight: 1, letterSpacing: 1 }}>
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
      <defs>
        {/* Checkered grass pattern - outfield */}
        <pattern id="grass" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="28" height="28" fill="#2e7d32" />
          <rect width="14" height="14" fill="#388e3c" />
          <rect x="14" y="14" width="14" height="14" fill="#388e3c" />
        </pattern>
        {/* Checkered grass pattern - infield */}
        <pattern id="grassInfield" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="20" height="20" fill="#33822e" />
          <rect width="10" height="10" fill="#3a9435" />
          <rect x="10" y="10" width="10" height="10" fill="#3a9435" />
        </pattern>
        {/* Fan-shaped clip */}
        <clipPath id="fieldClip">
          <path d="M 310,365 L 20,105 Q 310,-25 600,105 Z" />
        </clipPath>
      </defs>

      {/* Dark background behind field */}
      <rect x="0" y="0" width="620" height="400" fill="#121212" />

      {/* Field fan shape with checkered grass */}
      <g clipPath="url(#fieldClip)">
        <rect x="0" y="0" width="620" height="400" fill="url(#grass)" />
      </g>

      {/* Field outline */}
      <path d="M 310,365 L 20,105 Q 310,-25 600,105 Z" fill="none" stroke="#1b5e20" strokeWidth="4" strokeLinejoin="round" />

      {/* Warning track arc */}
      <path d="M 38,113 Q 310,-8 582,113" fill="none" stroke="rgba(139,105,20,0.25)" strokeWidth="10" />

      {/* Infield dirt diamond */}
      <polygon points="310,133 471,223 310,325 149,223" fill="#c8a24e" opacity="0.65" />

      {/* Infield grass (inner diamond) */}
      <polygon points="310,165 435,223 310,290 185,223" fill="url(#grassInfield)" />

      {/* Dirt cutouts at bases */}
      <circle cx="310" cy="133" r="13" fill="#c8a24e" opacity="0.65" />
      <circle cx="471" cy="223" r="13" fill="#c8a24e" opacity="0.65" />
      <circle cx="149" cy="223" r="13" fill="#c8a24e" opacity="0.65" />

      {/* Pitcher's mound dirt */}
      <circle cx="310" cy="220" r="16" fill="#c8a24e" opacity="0.65" />
      {/* Pitcher's rubber */}
      <rect x="303" y="218" width="14" height="4" rx="1" fill="white" opacity="0.85" />

      {/* Foul lines */}
      <line x1="310" y1="340" x2="20" y2="105" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
      <line x1="310" y1="340" x2="600" y2="105" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />

      {/* Base paths */}
      <line x1="310" y1="133" x2="471" y2="223" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
      <line x1="471" y1="223" x2="310" y2="325" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
      <line x1="310" y1="325" x2="149" y2="223" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
      <line x1="149" y1="223" x2="310" y2="133" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />

      {/* Bases (white diamonds) */}
      <rect x="304" y="127" width="12" height="12" rx="1" fill="white" transform="rotate(45 310 133)" />
      <rect x="465" y="217" width="12" height="12" rx="1" fill="white" transform="rotate(45 471 223)" />
      <rect x="143" y="217" width="12" height="12" rx="1" fill="white" transform="rotate(45 149 223)" />

      {/* Home plate */}
      <polygon points="310,321 304,327 307,333 313,333 316,327" fill="white" />

      {/* Batter's boxes */}
      <rect x="288" y="319" width="13" height="20" rx="2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <rect x="319" y="319" width="13" height="20" rx="2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />

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
