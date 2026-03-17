import { useDraggable } from '@dnd-kit/core'

export default function PlayerChip({ player, position, unlocked }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${player.id}-${position}`,
    data: { playerId: player.id, position },
    disabled: !unlocked,
  })

  const displayName = player.nickname || player.name.split(' ')[0]

  const style = {
    fontSize: 14,
    fontWeight: 900,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 1.1,
    cursor: unlocked ? 'grab' : 'default',
    padding: '2px 4px',
    borderRadius: 4,
    background: isDragging ? 'rgba(255,215,0,0.3)' : 'transparent',
    opacity: isDragging ? 0.5 : 1,
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    touchAction: 'none',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
  }

  return (
    <div ref={setNodeRef} style={style} {...(unlocked ? listeners : {})} {...attributes}>
      <div style={{ color: '#FFD700', fontSize: 11, fontWeight: 700 }}>#{player.jerseyNumber}</div>
      <div>{displayName}</div>
    </div>
  )
}
