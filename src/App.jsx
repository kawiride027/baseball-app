import { useState } from 'react'
import { useAppData } from './hooks/useLocalStorage'
import { POSITIONS, INNINGS } from './constants'
import SetupScreen from './components/setup/SetupScreen'
import GameSelectScreen from './components/gameSelect/GameSelectScreen'
import FieldViewScreen from './components/field/FieldViewScreen'
import LineupScreen from './components/lineup/LineupScreen'
import BattingScreen from './components/batting/BattingScreen'
import GameHistoryScreen from './components/history/GameHistoryScreen'
import PreGameWizard from './components/field/PreGameWizard'
import BattingOrderSetup from './components/field/BattingOrderSetup'
import PinModal from './components/field/PinModal'
import './App.css'

const TABS = [
  { id: 'setup', label: 'Team Setup' },
  { id: 'game', label: "Today's Game" },
  { id: 'field', label: 'Field Positions' },
  { id: 'batting', label: 'Batting Order' },
  { id: 'lineup', label: 'Team Summary' },
  { id: 'history', label: 'History' },
]

function App() {
  const [data, updateData, undo, canUndo] = useAppData()
  const [currentTab, setCurrentTab] = useState('setup')

  // New game setup flow states
  const [showHomeAwayPicker, setShowHomeAwayPicker] = useState(false)
  const [showBattingOrderSetup, setShowBattingOrderSetup] = useState(false)
  const [showPreGameWizard, setShowPreGameWizard] = useState(false)
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
    if (showPreGameWizard || showBattingOrderSetup) return
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

  const renderScreen = () => {
    // Batting order setup (Step 3: after home/away, before positions)
    if (showBattingOrderSetup && data.activeGameId) {
      return (
        <BattingOrderSetup
          roster={data.roster}
          battingOrder={data.games[data.activeGameId]?.battingOrder || []}
          onComplete={handleBattingOrderComplete}
          opponent={activeSchedule?.opponent}
        />
      )
    }

    // Pre-game position wizard (Step 4: after batting order, final step)
    if (showPreGameWizard && data.activeGameId) {
      return (
        <PreGameWizard
          roster={data.roster}
          onComplete={handleWizardComplete}
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
          />
        )
      case 'field':
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
          />
        )
      case 'batting':
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
          <BattingScreen
            roster={data.roster}
            battingOrder={activeGame.battingOrder}
            updateBattingOrder={updateBattingOrder}
            atBat={activeGame.atBat}
            updateAtBat={updateAtBat}
            opponent={activeSchedule?.opponent}
            isHome={activeGame.isHome}
            onSwitchToField={() => setCurrentTab('field')}
            teamName={data.teamName}
            onGameComplete={completeGame}
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

  return (
    <div className="app">
      <nav className="nav">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`nav-btn ${currentTab === tab.id ? 'nav-btn--active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
            style={(showPreGameWizard || showBattingOrderSetup) ? { opacity: 0.3, pointerEvents: 'none' } : {}}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="app-content">
        {renderScreen()}
      </div>

      {/* Floating Undo button */}
      {canUndo && (
        <button
          onClick={handleUndoRequest}
          style={undoBtnStyle}
          title="Undo last change"
        >
          ↩ Undo
        </button>
      )}

      {/* Home/Away picker modal */}
      {showHomeAwayPicker && (
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
