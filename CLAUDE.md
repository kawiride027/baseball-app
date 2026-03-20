# Baseball App

Youth baseball team management app for tracking field positions, batting orders, and game scores during a season.

## Tech Stack
- React 19 + Vite 8
- Firebase Firestore for real-time multi-device sync
- No router — tab-based navigation managed in App.jsx state
- All state persisted to Firestore (real-time sync) + localStorage (offline cache) via `useAppData()` hook
- Drag-and-drop via @dnd-kit (core + sortable)
- Coach PIN: 999 (protects undo, innings, absent, reset, etc.)

## Running
```bash
npm run dev     # Vite dev server (base: /baseball-app/)
npm run build   # Production build to dist/
```

## Project Structure
```
src/
├── App.jsx                  # Main app — team code gate, tab routing, game setup flow, all top-level state
├── constants.js             # POSITIONS, INNINGS (6), PIN_CODE, field coordinates, DEFAULT_DATA
├── firebase.js              # Firebase initialization + offline persistence (config: baseball-app-2625c)
├── hooks/useLocalStorage.js # useAppData() — Firestore sync + localStorage cache + undo stack (max 30)
├── components/
│   ├── TeamCodeScreen.jsx           # Landing page — Create Team / Join Team (generates team codes)
│   ├── setup/SetupScreen.jsx        # Team name + roster management
│   ├── gameSelect/GameSelectScreen.jsx  # Season schedule, tap GO to start a game
│   ├── field/
│   │   ├── FieldViewScreen.jsx      # Main field view — diamond + bench + inning nav + mark absent + reset game
│   │   ├── DiamondSVG.jsx           # Visual baseball diamond (620×400 viewBox, 110×64 chips)
│   │   ├── BenchArea.jsx            # Bench player list
│   │   ├── PlayerChip.jsx           # Draggable player chip (18px name, 14px jersey for sunlight)
│   │   ├── PreGameWizard.jsx        # Pre-game position assignment wizard
│   │   ├── BattingOrderSetup.jsx    # Drag-to-reorder batting lineup + mark absent
│   │   ├── AtBatView.jsx            # In-game at-bat tracking (handles home/away end-of-game flows)
│   │   └── PinModal.jsx             # Coach PIN entry (PIN: 999)
│   ├── batting/
│   │   ├── BattingScreen.jsx        # Batting order view + at-bat tracking
│   │   ├── GameOverModal.jsx        # End-of-game score entry (W/L)
│   │   └── LastOutModal.jsx         # Record last out
│   ├── lineup/LineupScreen.jsx      # Team summary view
│   └── history/GameHistoryScreen.jsx # Past game results
```

## Firebase Cloud Sync (Multi-Device)

### Architecture
```
App() → checks for team code in localStorage
  ├── No code → TeamCodeScreen (Create Team / Join Team)
  └── Has code → MainApp()
        └── useAppData() → Firestore real-time sync + localStorage offline cache
```

### How It Works
- **Create Team**: Generates random 8-char code (e.g., `KFWN-8X3P`), creates Firestore doc at `teams/{code}`
- **Join Team**: Enter code → fetches Firestore doc → syncs in real-time
- **Real-time sync**: `onSnapshot()` listens for remote changes, `setDoc()` pushes local changes
- **Offline support**: `enableIndexedDbPersistence` + localStorage cache — app works without wifi, syncs when reconnected
- **No user accounts**: Team codes + coach PIN (999) — no auth needed
- **Loop prevention**: `isRemoteUpdate` ref flag prevents Firestore→local→Firestore infinite loops
- Team code stored in localStorage under key `baseball_team_code`
- All team data stored in Firestore under `teams/{teamCode}` document

### Firebase Project
- Project: `baseball-app-2625c`
- Firestore location: Los Angeles
- Plan: Spark (free)
- Security rules: Test mode (open read/write for 30 days from setup)

### Key Files
- `src/firebase.js` — Firebase config + Firestore init + offline persistence
- `src/hooks/useLocalStorage.js` — `useAppData()` with Firestore sync, exports: `generateTeamCode()`, `getStoredTeamCode()`, `setStoredTeamCode()`, `clearStoredTeamCode()`
- `src/components/TeamCodeScreen.jsx` — Create/Join team landing page
- `src/App.jsx` — `App()` wrapper checks team code, `MainApp()` has all game logic

## Key Architecture Decisions
- **Single data object**: All app state lives in one object synced to Firestore + cached in localStorage under key `baseball_app_data`
- **Undo system**: `updateData()` pushes previous state to an undo stack; undo is PIN-protected
- **Game setup flow**: Select game → Home/Away picker → Batting order setup → Position wizard → Auto-route to field (home) or batting (away)
- **Away team end-of-game**: After top of 6th batting → `awaitingFinalFielding` flag → field view for bottom of 6th → End Game button
- **Mid-game Mark Absent**: PIN-protected, removes from battingOrder + field positions + bench, recalculates `nextBatterIndex` by ID lookup, tracked in `absentIds` array
- **Reset Game**: PIN-protected, erases all game data for the active game, returns to game select
- **10 field positions**: P, C, 1B, 2B, SS, 3B, LF, LCF, RCF, RF (no CF in this division)
- **6 innings per game**
- **Schedule**: Loaded from schedule.json, season runs Mar–May 2026

## Deployment
- GitHub Pages via GitHub Actions (deploy workflow on main branch)
- Base URL: `/baseball-app/`

## Status: Firebase Sync DEPLOYED
Firebase config uses environment variables (`.env` locally, GitHub Actions secrets for deployment).
- Firebase project: `baseball-app-2625c` (Firestore location: Los Angeles, Spark free plan)
- Security rules: Test mode (expires ~30 days from 2026-03-19 setup)
- First visit shows "Create Team" / "Join Team" screen

## Parent Spectator Mode
- Parents join via separate parent code (not the coach code) — read-only access
- Parent code stored in `teams/{teamCode}.parentCode` + reverse-lookup at `parentCodes/{parentCode}`
- Role stored in localStorage under key `baseball_app_role` ('coach' or 'parent')
- `useAppData(role)` returns no-op `updateData` for parents (no Firestore writes)
- Parents see: Field Positions, Batting Order, History tabs only
- All coach-only UI hidden: Unlock, Start At Bat, Edit Lineup, Mark Absent, Reset, End Game
- Inning browsing for parents uses local state (no PIN, no Firestore write)
- LIVE indicator banner on parent field view
- Coach sees both codes in team info dropdown (coach code + parent code)
- Existing teams without parentCode get "Generate Parent Code" button

## Recent Changes (latest first)
- Game-day fixes: spectator auto-refresh (visibilitychange + Firestore reconnect), drag-handle-only for batting order scroll on iPad, single at-bat control (Batting tab only, removed from Field tab), removed CF position (10 positions now)
- Parent Spectator Mode: separate parent code for read-only real-time viewing (field positions, batting order, history)
- Firebase Cloud Sync: Firestore real-time sync, team codes, TeamCodeScreen, offline persistence
- PIN-protected "Reset Game" button — erases all game data if coach selected wrong team
- Wider field layout (620×400 viewBox) so all positions fit on iPad without scrolling
- PIN-protected inning ◀/▶ arrows so kids can't accidentally change innings
- Mid-game "Mark Absent" feature (PIN-protected) — removes player from batting order, field positions, and bench
- Bigger field view: larger player chips (110×64), bigger fonts for sunlight readability
- Fixed away team game flow: after top of 6th → field view for bottom of 6th → End Game button
- Fixed home team End Game button not clickable (GameOverModal was outside early return)
- Fixed score display showing raw \u2013 escape instead of en-dash
- PIN-protected game cancel/uncancel buttons
- W/L results in green/red on Today's Game and Team Setup tabs
- Made Import Schedule button prominent when no games exist
- Added schedule import, game-over flow, and W/L tracking
- Added GitHub Pages deployment workflow
- Initial commit
