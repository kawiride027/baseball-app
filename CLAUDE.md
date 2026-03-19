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

## Recent Changes (latest first)
- Made Import Schedule button prominent when no games exist
- Added schedule import, game-over flow, and W/L tracking
- Added GitHub Pages deployment workflow
- Initial commit
