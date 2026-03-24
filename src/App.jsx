import { useState } from 'react'
import { useAppData, getStoredTeamCode, clearStoredTeamCode, getStoredRole, clearStoredRole, generateTeamCode } from './hooks/useLocalStorage'
import { doc, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import { POSITIONS, INNINGS, ROLES } from './constants'
import TeamCodeScreen from './components/TeamCodeScreen'
import SetupScreen from './components/setup/SetupScreen'
import GameSelectScreen from './components/gameSelect/GameSelectScreen'
import FieldViewScreen from './components/field/FieldViewScreen'
import LineupScreen from './components/lineup/LineupScreen'
import BattingScreen from './components/batting/BattingScreen'
import GameHistoryScreen from './components/history/GameHistoryScreen'
import PreGameWizard from './components/field/PreGameWizard'
import BattingOrderSetup from './components/field/BattingOrderSetup'
import LineupImportScreen from './components/field/LineupImportScreen'
import PinModal from './components/field/PinModal'
import './App.css'

const ALL_TABS = [
  { id: 'setup', label: 'Team Setup', coachOnly: true },
  { id: 'game', label: "Today's Game", parentLabel: 'Schedule', coachOnly: false },
  { id: 'field', label: 'Field Positions', coachOnly: false },
  { id: 'batting', label: 'Batting Order', coachOnly: false },
  { id: 'lineup', label: 'Team Summary', coachOnly: true },
  { id: 'history', label: 'History', coachOnly: false },
]

function App() {
  const [teamCode, setTeamCode] = useState(getStoredTeamCode)
  const [role, setRole] = useState(getStoredRole)

  // If no team code yet, show create/join screen
  if (!teamCode) {
    return <TeamCodeScreen onTeamReady={(code, newRole) => {
      setTeamCode(code)
      setRole(newRole || ROLES.COACH)
      // Force re-mount by reloading — ensures useAppData picks up new team code
      window.location.reload()
    }} />
  }

  return <MainApp teamCode={teamCode} role={role} onLeaveTeam={() => {
    clearStoredTeamCode()
    clearStoredRole()
    localStorage.removeItem('baseball_app_data')
    setTeamCode(null)
    setRole(null)
  }} />
}

function MainApp({ teamCode, role, onLeaveTeam }) {
  const isParent = role === ROLES.PARENT
  const [data, updateData, undo, canUndo] = useAppData(role)
  const TABS = isParent ? ALL_TABS.filter(t => !t.coachOnly) : ALL_TABS
  const [currentTab, setCurrentTab] = useState(isParent ? 'game' : 'setup')

  // New game setup flow states
  const [showHomeAwayPicker, setShowHomeAwayPicker] = useState(false)
  const [showBattingOrderSetup, setShowBattingOrderSetup] = useState(false)
  const [showPreGameWizard, setShowPreGameWizard] = useState(false)
  const [showLineupImport, setShowLineupImport] = useState(false)
  const [pendingGameId, setPendingGameId] = useState(null)
  const [pendingBattingOrder, setPendingBattingOrder] = useState(null)
  const [pendingAbsentIds, setPendingAbsentIds] = useState([])

  // PIN-protected undo
  const [showUndoPin, setShowUndoPin] = useState(false)

  const activeGame = data.activeGameId ? data.games[data.activeGameId] : null
  const activeSchedule = data.activeGameId
    ? data.schedule.find((g) => g.id === data.activeGameId)
    : null

  // Tab navigation (no PIN — kids can browse freely, edits are PIN-protected)
  const handleTabClick = (tabId) => {
    if (showPreGameWizard || showBattingOrderSetup || showLineupImport) return
    if (tabId === currentTab) return
    setCurrentTab(tabId)
  }

  // Undo with PIN
  const handleUndoRequest = () => {
    if (!canUndo) return
    setShowUndoPin(true)
  }

  const handleUndoPinConfirm = () => {
    setShowUndoPin(false)
    undo()
  }

  const handleUndoPinCancel = () => {
    setShowUndoPin(false)
  }

  // Step 1: User taps GO on a game
  const selectGame = (gameId) => {
    const existing = data.games[gameId]
    if (!existing) {
      // Brand new game → home/away → batting order → positions → auto-route
      setPendingGameId(gameId)
      setShowHomeAwayPicker(true)
    } else {
      // Already set up → just go to field view
      updateData((prev) => ({ ...prev, activeGameId: gameId, viewingInning: 1 }))
      setCurrentTab('field')
    }
  }

  // Step 2: Home or Away selected → go to batting order setup
  const handleHomeAway = (isHome) => {
    setShowHomeAwayPicker(false)
    const gameId = pendingGameId
    const emptyAssignments = {}
    for (let i = 1; i <= INNINGS; i++) {
      const inning = {}
      POSITIONS.forEach((pos) => { inning[pos] = null })
      inning.BENCH = data.roster.map((p) => p.id)
      emptyAssignments[String(i)] = inning
    }
    updateData((prev) => ({
      ...prev,
      activeGameId: gameId,
      viewingInning: 1,
      games: {
        ...prev.games,
        [gameId]: {
          assignments: emptyAssignments,
          battingOrder: prev.roster.map((p) => p.id),
          atBat: {
            currentInning: 1,
            isAtBat: false,
            lastOutPlayerId: null,
            nextBatterIndex: 0,
          },
          isHome: isHome,
          setupComplete: false,
          absentIds: [],
        },
      },
    }))
    // Step 3: Go straight to batting order setup (no PIN needed)
    setShowBattingOrderSetup(true)
  }

  // Step 3: Batting order set → go to position wizard
  const handleBattingOrderComplete = (battingOrder, absentIds = []) => {
    setPendingBattingOrder(battingOrder)
    setPendingAbsentIds(absentIds)
    setShowBattingOrderSetup(false)
    setShowPreGameWizard(true)
  }

  // Step 4: Position wizard complete → save everything and auto-route based on home/away
  const handleWizardComplete = (assignments, absentIds = []) => {
    setPendingAbsentIds(absentIds)
    const battingOrder = pendingBattingOrder
    const isHome = data.games[data.activeGameId]?.isHome

    updateData((prev) => {
      const currentGame = prev.games[prev.activeGameId]
      return {
        ...prev,
        games: {
          ...prev.games,
          [prev.activeGameId]: {
            ...currentGame,
            assignments,
            battingOrder: battingOrder || currentGame.battingOrder,
            setupComplete: true,
          },
        },
      }
    })
    setShowPreGameWizard(false)
    setPendingBattingOrder(null)
    setPendingAbsentIds([])
    setPendingGameId(null)
    // Auto-route: HOME team fields first → field view, AWAY team bats first → batting view
    setCurrentTab(isHome ? 'field' : 'batting')
  }

  const updateAssignments = (inning, newAssignment) => {
    if (!data.activeGameId) return
    updateData((prev) => ({
      ...prev,
      games: {
        ...prev.games,
        [prev.activeGameId]: {
          ...prev.games[prev.activeGameId],
          assignments: {
            ...prev.games[prev.activeGameId].assignments,
            [String(inning)]: newAssignment,
          },
        },
      },
    }))
  }

  const updateBattingOrder = (newOrder) => {
    if (!data.activeGameId) return
    updateData((prev) => ({
      ...prev,
      games: {
        ...prev.games,
        [prev.activeGameId]: {
          ...prev.games[prev.activeGameId],
          battingOrder: newOrder,
        },
      },
    }))
  }

  const updateAtBat = (atBatUpdate) => {
    if (!data.activeGameId) return
    updateData((prev) => ({
      ...prev,
      games: {
        ...prev.games,
        [prev.activeGameId]: {
          ...prev.games[prev.activeGameId],
          atBat: {
            ...prev.games[prev.activeGameId].atBat,
            ...atBatUpdate,
          },
        },
      },
    }))
  }

  const markPlayerAbsent = (playerId) => {
    if (!data.activeGameId) return
    updateData((prev) => {
      const game = prev.games[prev.activeGameId]
      const currentInning = game.atBat.currentInning

      // --- Batting order adjustment ---
      const oldOrder = game.battingOrder
      const oldNextIdx = game.atBat.nextBatterIndex || 0
      const currentNextBatterId = oldOrder[oldNextIdx]
      const newOrder = oldOrder.filter((id) => id !== playerId)

      let newNextIdx
      if (playerId === currentNextBatterId) {
        // Absent player WAS the next batter — keep same index (now points to next person)
        newNextIdx = oldNextIdx >= newOrder.length ? 0 : oldNextIdx
      } else {
        newNextIdx = newOrder.indexOf(currentNextBatterId)
        if (newNextIdx === -1) newNextIdx = 0
      }

      // --- Remove from field positions + bench for current + future innings ---
      const newAssignments = { ...game.assignments }
      for (let i = currentInning; i <= INNINGS; i++) {
        const key = String(i)
        if (!newAssignments[key]) continue
        const inning = { ...newAssignments[key] }
        POSITIONS.forEach((pos) => {
          if (inning[pos] === playerId) inning[pos] = null
        })
        if (inning.BENCH) {
          inning.BENCH = inning.BENCH.filter((id) => id !== playerId)
        }
        newAssignments[key] = inning
      }

      return {
        ...prev,
        games: {
          ...prev.games,
          [prev.activeGameId]: {
            ...game,
            battingOrder: newOrder,
            assignments: newAssignments,
            absentIds: [...(game.absentIds || []), playerId],
            atBat: { ...game.atBat, nextBatterIndex: newNextIdx },
          },
        },
      }
    })
  }

  const unmarkPlayerAbsent = (playerId) => {
    if (!data.activeGameId) return
    updateData((prev) => {
      const game = prev.games[prev.activeGameId]
      const currentInning = game.atBat.currentInning

      // Add back to end of batting order
      const newOrder = [...game.battingOrder, playerId]

      // Add to BENCH for current + future innings
      const newAssignments = { ...game.assignments }
      for (let i = currentInning; i <= INNINGS; i++) {
        const key = String(i)
        if (!newAssignments[key]) continue
        const inning = { ...newAssignments[key] }
        if (!inning.BENCH) inning.BENCH = []
        if (!inning.BENCH.includes(playerId)) {
          inning.BENCH = [...inning.BENCH, playerId]
        }
        newAssignments[key] = inning
      }

      return {
        ...prev,
        games: {
          ...prev.games,
          [prev.activeGameId]: {
            ...game,
            battingOrder: newOrder,
            assignments: newAssignments,
            absentIds: (game.absentIds || []).filter((id) => id !== playerId),
          },
        },
      }
    })
  }

  const resetGame = () => {
    if (!data.activeGameId) return
    const gameId = data.activeGameId
    updateData((prev) => {
      const newGames = { ...prev.games }
      delete newGames[gameId]
      return { ...prev, activeGameId: null, viewingInning: 1, games: newGames }
    })
    setCurrentTab('game')
  }

  const setViewingInning = (inning) => {
    updateData((prev) => ({ ...prev, viewingInning: inning }))
  }

  const completeGame = ({ scoreUs, scoreThem, result }) => {
    if (!data.activeGameId) return
    updateData((prev) => ({
      ...prev,
      activeGameId: null,
      games: {
        ...prev.games,
        [prev.activeGameId]: {
          ...prev.games[prev.activeGameId],
          completed: true,
          score: { us: scoreUs, them: scoreThem },
          result,
        },
      },
    }))
    setCurrentTab('game')
  }

  // Cancel game setup — removes the in-progress game data and goes back to game list
  const cancelSetup = () => {
    const gameId = data.activeGameId
    if (gameId) {
      updateData((prev) => {
        const newGames = { ...prev.games }
        delete newGames[gameId]
        return { ...prev, activeGameId: null, viewingInning: 1, games: newGames }
      })
    }
    setShowBattingOrderSetup(false)
    setShowPreGameWizard(false)
    setShowLineupImport(false)
    setPendingBattingOrder(null)
    setPendingAbsentIds([])
    setPendingGameId(null)
    setCurrentTab('game')
  }

  const renderScreen = () => {
    // CSV lineup import (replaces both batting order + position wizard)
    if (showLineupImport && data.activeGameId) {
      return (
        <LineupImportScreen
          roster={data.roster}
          opponent={activeSchedule?.opponent}
          onCancel={cancelSetup}
          onComplete={(assignments, battingOrder, absentIds) => {
            const isHome = data.games[data.activeGameId]?.isHome
            updateData(prev => {
              const currentGame = prev.games[prev.activeGameId]
              return {
                ...prev,
                games: {
                  ...prev.games,
                  [prev.activeGameId]: {
                    ...currentGame,
                    assignments,
                    battingOrder,
                    setupComplete: true,
                    absentIds: absentIds || [],
                  },
                },
              }
            })
            setShowLineupImport(false)
            setPendingBattingOrder(null)
            setPendingAbsentIds([])
            setPendingGameId(null)
            setCurrentTab(isHome ? 'field' : 'batting')
          }}
          onBack={() => {
            setShowLineupImport(false)
            setShowBattingOrderSetup(true)
          }}
        />
      )
    }

    // Batting order setup (Step 3: after home/away, before positions)
    if (showBattingOrderSetup && data.activeGameId) {
      return (
        <BattingOrderSetup
          roster={data.roster}
          battingOrder={data.games[data.activeGameId]?.battingOrder || []}
          onComplete={handleBattingOrderComplete}
          opponent={activeSchedule?.opponent}
          onCancel={cancelSetup}
          onUploadLineup={() => {
            setShowBattingOrderSetup(false)
            setShowLineupImport(true)
          }}
        />
      )
    }

    // Pre-game position wizard (Step 4: after batting order, final step)
    if (showPreGameWizard && data.activeGameId) {
      return (
        <PreGameWizard
          roster={data.roster}
          onComplete={handleWizardComplete}
          onCancel={cancelSetup}
          opponent={activeSchedule?.opponent}
          games={data.games}
          activeGameId={data.activeGameId}
          initialAbsentIds={pendingAbsentIds}
        />
      )
    }

    switch (currentTab) {
      case 'setup':
        return <SetupScreen data={data} updateData={updateData} />
      case 'game':
        return (
          <GameSelectScreen
            schedule={data.schedule}
            activeGameId={data.activeGameId}
            games={data.games}
            onSelectGame={selectGame}
            isParent={isParent}
            onCancelGame={(gameId, cancelled) => {
              updateData((prev) => ({
                ...prev,
                activeGameId: cancelled && prev.activeGameId === gameId ? null : prev.activeGameId,
                games: {
                  ...prev.games,
                  [gameId]: {
                    ...(prev.games[gameId] || {}),
                    cancelled,
                  },
                },
              }))
            }}
            onResetGame={(gameId) => {
              updateData((prev) => {
                const newGames = { ...prev.games }
                delete newGames[gameId]
                return {
                  ...prev,
                  activeGameId: prev.activeGameId === gameId ? null : prev.activeGameId,
                  viewingInning: prev.activeGameId === gameId ? 1 : prev.viewingInning,
                  games: newGames,
                }
              })
            }}
          />
        )
      case 'field':
        if (!activeGame) {
          return (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ fontSize: 20, color: 'var(--text-accent)', marginBottom: 16 }}>
                No game selected
              </p>
              {isParent ? (
                <p style={{ fontSize: 14, color: '#888' }}>
                  The coach hasn't started a game yet. This page will update automatically when a game begins.
                </p>
              ) : (
                <button className="btn btn--accent" onClick={() => setCurrentTab('game')}>
                  Select a Game
                </button>
              )}
            </div>
          )
        }
        return (
          <FieldViewScreen
            roster={data.roster}
            assignments={activeGame.assignments}
            viewingInning={data.viewingInning}
            setViewingInning={setViewingInning}
            updateAssignments={updateAssignments}
            opponent={activeSchedule?.opponent}
            teamName={data.teamName}
            atBat={activeGame.atBat}
            updateAtBat={updateAtBat}
            battingOrder={activeGame.battingOrder}
            updateBattingOrder={updateBattingOrder}
            isHome={activeGame.isHome}
            onGameComplete={completeGame}
            absentIds={activeGame.absentIds || []}
            markPlayerAbsent={markPlayerAbsent}
            unmarkPlayerAbsent={unmarkPlayerAbsent}
            resetGame={resetGame}
            isParent={isParent}
            isCompleted={!!activeGame.completed}
            onSwitchToBatting={() => setCurrentTab('batting')}
          />
        )
      case 'lineup':
        if (!activeGame) {
          return (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ fontSize: 20, color: 'var(--text-accent)', marginBottom: 16 }}>
                No game selected
              </p>
              <button className="btn btn--accent" onClick={() => setCurrentTab('game')}>
                Select a Game
              </button>
            </div>
          )
        }
        return (
          <LineupScreen
            roster={data.roster}
            assignments={activeGame.assignments}
            updateAssignments={updateAssignments}
            opponent={activeSchedule?.opponent}
            battingOrder={activeGame.battingOrder}
          />
        )
      case 'batting':
        if (!activeGame) {
          return (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ fontSize: 20, color: 'var(--text-accent)', marginBottom: 16 }}>
                No game selected
              </p>
              {isParent ? (
                <p style={{ fontSize: 14, color: '#888' }}>
                  The coach hasn't started a game yet. This page will update automatically when a game begins.
                </p>
              ) : (
                <button className="btn btn--accent" onClick={() => setCurrentTab('game')}>
                  Select a Game
                </button>
              )}
            </div>
          )
        }
        return (
          <BattingScreen
            roster={data.roster}
            battingOrder={activeGame.battingOrder}
            updateBattingOrder={updateBattingOrder}
            atBat={activeGame.atBat}
            updateAtBat={updateAtBat}
            opponent={activeSchedule?.opponent}
            isHome={activeGame.isHome}
            onSwitchToField={(inning) => {
              if (inning) setViewingInning(inning)
              setCurrentTab('field')
            }}
            teamName={data.teamName}
            onGameComplete={completeGame}
            isParent={isParent}
          />
        )
      case 'history':
        return (
          <GameHistoryScreen
            schedule={data.schedule}
            games={data.games}
            roster={data.roster}
          />
        )
      default:
        return null
    }
  }

  const [showTeamInfo, setShowTeamInfo] = useState(false)

  return (
    <div className="app">
      {/* Team code bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        background: isParent ? '#1a1200' : '#0a0a0a',
        borderBottom: isParent ? '2px solid #FF9800' : '1px solid #222',
        fontSize: 12,
      }}>
        <span style={{ color: '#888' }}>
          {data.teamName || 'My Team'}
          {isParent && (
            <span style={{
              marginLeft: 8,
              padding: '2px 8px',
              background: 'rgba(255,152,0,0.2)',
              border: '1px solid #FF9800',
              borderRadius: 4,
              color: '#FF9800',
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}>
              SPECTATOR
            </span>
          )}
        </span>
        <button
          onClick={() => setShowTeamInfo(!showTeamInfo)}
          style={{
            background: 'transparent',
            border: '1px solid #444',
            borderRadius: 4,
            color: '#FFD700',
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 8px',
            cursor: 'pointer',
            letterSpacing: 1,
          }}
        >
          {isParent ? 'Team Info' : `Code: ${teamCode}`}
        </button>
      </div>

      {/* Team info dropdown */}
      {showTeamInfo && (
        <div style={{
          padding: '12px 16px',
          background: '#1a1a1a',
          borderBottom: '1px solid #333',
          textAlign: 'center',
        }}>
          {!isParent && (
            <>
              <div style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>
                Coach code (share with assistant coaches):
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#FFD700', letterSpacing: 3, marginBottom: 12 }}>
                {teamCode}
              </div>

              {data.parentCode ? (
                <>
                  <div style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>
                    Parent spectator code (share with parents):
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#FF9800', letterSpacing: 3, marginBottom: 4 }}>
                    {data.parentCode}
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
                    Parents see field positions & batting order in real-time (read-only)
                  </div>
                </>
              ) : (
                <button
                  onClick={async () => {
                    const parentCode = generateTeamCode()
                    updateData((prev) => ({ ...prev, parentCode }))
                    try {
                      await setDoc(doc(db, 'parentCodes', parentCode), { teamCode })
                    } catch (e) {
                      console.warn('Failed to create parent code lookup:', e)
                    }
                  }}
                  style={{
                    fontSize: 14, fontWeight: 700, color: '#FF9800',
                    background: 'rgba(255,152,0,0.1)', border: '2px solid #FF9800',
                    borderRadius: 8, padding: '10px 20px', cursor: 'pointer',
                    marginBottom: 12,
                  }}
                >
                  Generate Parent Spectator Code
                </button>
              )}
            </>
          )}

          {isParent && (
            <div style={{ fontSize: 14, color: '#888', marginBottom: 12 }}>
              You are viewing as a spectator. Live updates from the coach will appear automatically.
            </div>
          )}

          <button
            onClick={() => {
              if (window.confirm('Leave this team? You can rejoin later with the code.')) {
                onLeaveTeam()
              }
            }}
            style={{
              fontSize: 12,
              color: '#FF1744',
              background: 'transparent',
              border: '1px solid #FF1744',
              borderRadius: 6,
              padding: '6px 14px',
              cursor: 'pointer',
            }}
          >
            Leave Team
          </button>
        </div>
      )}

      <nav className="nav">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`nav-btn ${currentTab === tab.id ? 'nav-btn--active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
            style={(showPreGameWizard || showBattingOrderSetup || showLineupImport) ? { opacity: 0.3, pointerEvents: 'none' } : {}}
          >
            {isParent && tab.parentLabel ? tab.parentLabel : tab.label}
          </button>
        ))}
      </nav>
      <div className="app-content">
        {renderScreen()}
      </div>

      {/* Floating Undo button (coaches only) */}
      {canUndo && !isParent && (
        <button
          onClick={handleUndoRequest}
          style={undoBtnStyle}
          title="Undo last change"
        >
          ↩ Undo
        </button>
      )}

      {/* Home/Away picker modal (coaches only) */}
      {showHomeAwayPicker && !isParent && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 360, textAlign: 'center' }}>
            <div className="modal-title">Home or Away?</div>
            <p style={{ color: '#BBB', fontSize: 14, marginBottom: 20 }}>
              Away team bats first (top of inning)
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn btn--full"
                onClick={() => handleHomeAway(false)}
                style={{ flex: 1, fontSize: 20, minHeight: 64, background: '#1a472a', borderColor: '#00C853' }}
              >
                🚌 AWAY
              </button>
              <button
                className="btn btn--full"
                onClick={() => handleHomeAway(true)}
                style={{ flex: 1, fontSize: 20, minHeight: 64, background: '#1a1a3a', borderColor: '#448AFF' }}
              >
                🏠 HOME
              </button>
            </div>
            <button
              className="btn btn--full"
              style={{ marginTop: 12, borderColor: '#555', color: '#888' }}
              onClick={() => { setShowHomeAwayPicker(false); setPendingGameId(null) }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}


      {/* Undo PIN modal */}
      {showUndoPin && (
        <PinModal
          message="Coach PIN to undo last change"
          onConfirm={handleUndoPinConfirm}
          onCancel={handleUndoPinCancel}
        />
      )}
    </div>
  )
}

const undoBtnStyle = {
  position: 'fixed',
  bottom: 20,
  left: 20,
  zIndex: 900,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '10px 18px',
  minHeight: 44,
  fontSize: 14,
  fontWeight: 900,
  border: '2px solid #FF9800',
  borderRadius: 24,
  background: 'rgba(30,30,30,0.95)',
  color: '#FF9800',
  cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
}

export default App
