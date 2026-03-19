import { useDroppable } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'

function BenchPlayer({ player, unlocked }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${player.id}-BENCH`,
    data: { playerId: player.id, position: 'BENCH' },
    disabled: !unlocked,
  })

  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 16px',
    background: '#333',
    borderRadius: 8,
    border: '2px solid #555',
    fontSize: 17,
    fontWeight: 700,
    color: '#FFF',
    cursor: unlocked ? 'grab' : 'default',
    opacity: isDragging ? 0.4 : 1,
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    touchAction: 'none',
  }

  return (
    <div ref={setNodeRef} style={style} {...(unlocked ? listeners : {})} {...attributes}>
      <span style={{ color: '#FFD700', fontSize: 15, fontWeight: 900 }}>#{player.jerseyNumber}</span>
      {player.nickname || player.name}
    </div>
  )
}

export default function BenchArea({ benchPlayerIds, roster, unlocked }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'BENCH', data: { position: 'BENCH' }, disabled: !unlocked })
  const benchPlayers = benchPlayerIds
    .map((id) => roster.find((p) => p.id === id))
    .filter(Boolean)

  return (
    <div
      ref={setNodeRef}
      style={{
        marginTop: 12,
        padding: 12,
        background: isOver && unlocked ? 'rgba(255,215,0,0.1)' : '#1a1a1a',
        borderRadius: 10,
        border: isOver && unlocked ? '2px solid #FFD700' : '2px solid #333',
        minHeight: 60,
        transition: 'all 0.15s',
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
        Bench ({benchPlayers.length})
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {benchPlayers.length === 0 && (
          <div style={{ color: '#555', fontSize: 14 }}>No players on bench</div>
        )}
        {benchPlayers.map((player) => (
          <BenchPlayer key={player.id} player={player} unlocked={unlocked} />
        ))}
      </div>
    </div>
  )
}
