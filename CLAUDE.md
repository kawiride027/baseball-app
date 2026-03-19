# Baseball App

Youth baseball team management app for tracking field positions, batting orders, and game scores during a season.

## Tech Stack
- React 19 + Vite 8
- No router — tab-based navigation managed in App.jsx state
- All state persisted to localStorage via `useAppData()` hook (src/hooks/useLocalStorage.js)
- Drag-and-drop via @dnd-kit (core + sortable)
- No backend — fully client-side

## Running
```bash
npm run dev     # Vite dev server (base: /baseball-app/)
npm run build   # Production build to dist/
```

## Project Structure
```
src/
├── App.jsx                  # Main app — tab routing, game setup flow, all top-level state
├── constants.js             # POSITIONS, INNINGS (6), PIN_CODE, field coordinates, DEFAULT_DATA
├── hooks/useLocalStorage.js # useAppData() — localStorage persistence + undo stack (max 30)
├── components/
│   ├── setup/SetupScreen.jsx        # Team name + roster management
│   ├── gameSelect/GameSelectScreen.jsx  # Season schedule, tap GO to start a game
│   ├── field/
│   │   ├── FieldViewScreen.jsx      # Main field view — diamond + bench + inning nav
│   │   ├── DiamondSVG.jsx           # Visual baseball diamond with player positions
│   │   ├── BenchArea.jsx            # Bench player list
│   │   ├── PlayerChip.jsx           # Draggable player chip
│   │   ├── PreGameWizard.jsx        # Pre-game position assignment wizard
│   │   ├── BattingOrderSetup.jsx    # Drag-to-reorder batting lineup + mark absent
│   │   ├── AtBatView.jsx            # In-game at-bat tracking
│   │   └── PinModal.jsx             # Coach PIN entry (PIN: 999)
│   ├── batting/
│   │   ├── BattingScreen.jsx        # Batting order view + at-bat tracking
│   │   ├── GameOverModal.jsx        # End-of-game score entry (W/L)
│   │   └── LastOutModal.jsx         # Record last out
│   ├── lineup/LineupScreen.jsx      # Team summary view
│   └── history/GameHistoryScreen.jsx # Past game results
```

## Key Architecture Decisions
- **Single data object**: All app state lives in one object persisted to localStorage under key `baseball_app_data`
- **Undo system**: `updateData()` pushes previous state to an undo stack; undo is PIN-protected (coach PIN: 999)
- **Game setup flow**: Select game → Home/Away picker → Batting order setup → Position wizard → Auto-route to field (home) or batting (away)
- **11 field positions**: P, C, 1B, 2B, SS, 3B, LF, LCF, CF, RCF, RF (youth league uses 4 outfielders)
- **6 innings per game**
- **Schedule**: Loaded from schedule.json, season runs Mar–May 2026

## Deployment
- GitHub Pages via GitHub Actions (deploy workflow on main branch)
- Base URL: `/baseball-app/`

## Planned: Firebase Cloud Sync (Multi-Device)
When ready, add real-time sync so multiple coaches can share the same team data.

### What's needed
1. **Firebase project** — create at console.firebase.google.com (free Spark plan)
   - Enable Firestore Database
   - Enable Anonymous Auth (or skip auth, use team codes only)
   - Copy the Firebase config object (apiKey, projectId, etc.)
2. **Install Firebase SDK** — `npm install firebase`
3. **Replace localStorage with Firestore**
   - Replace `useAppData()` in `src/hooks/useLocalStorage.js` with a Firestore-backed version
   - Use `onSnapshot()` for real-time sync between devices
   - Keep localStorage as offline fallback/cache
4. **Add Team Code system**
   - "Create Team" generates a unique code (e.g., `HAWKS-7X3K`)
   - "Join Team" lets another device enter the code
   - All team data stored under `teams/{teamCode}` in Firestore
   - Coach PIN (999) still protects actions — no user accounts needed
5. **Add landing screen** — first time: "Create Team" or "Join Team" before showing the main app

### Architecture change
```
Current:  App → useAppData() → localStorage (single device)
New:      App → useAppData() → Firestore (real-time sync) + localStorage (offline cache)
```

### Key files to modify
- `src/hooks/useLocalStorage.js` → rename/rewrite to Firestore hook
- `src/App.jsx` → add team code flow before main app renders
- `vite.config.js` → no changes needed
- New: `src/firebase.js` — Firebase config + initialization

## Recent Changes (latest first)
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
