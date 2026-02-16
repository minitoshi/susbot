# SusBot — Build TODO

> **Status**: Steps 1-14 COMPLETE. App built, tested, deployed.
> **Last session**: 2026-02-16
> **Live**: Server at https://susbot-server.onrender.com | Frontend at https://susbot.vercel.app
> **Repo**: https://github.com/minitoshi/susbot

---

## Build Steps

### Step 1: Project Scaffolding — DONE
- [x] Initialize npm workspaces monorepo (root package.json)
- [x] Create shared/, server/, web/ package.json files
- [x] Set up tsconfig.base.json + per-package tsconfigs
- [x] Install server deps: express, socket.io, typescript, tsx, cors
- [x] Install web deps: react, react-dom, vite, tailwindcss, zustand, socket.io-client
- [x] Verify workspaces link correctly

### Step 2: Shared Types + Constants + Map — DONE
- [x] `shared/src/types.ts` — GamePhase, Role, Player, GameState, AgentView, SpectatorView, etc.
- [x] `shared/src/events.ts` — Socket event type definitions
- [x] `shared/src/constants.ts` — All game config
- [x] `shared/src/map-data.ts` — The Skeld 44x26 grid, 14 rooms, vents, adjacency, tasks

### Step 3: Game Engine Core — DONE
- [x] `server/src/engine/Game.ts` — Full state machine with 8 phases
- [x] 5Hz tick loop for movement
- [x] Phase transitions with timers
- [x] Player management, role assignment, task assignment
- [x] `server/src/engine/map.ts` — A* pathfinding, vision, room detection, vent logic
- [x] `server/src/engine/rules.ts` — Kill validation, vote tallying, win conditions

### Step 4: MoltBook Auth — DONE
- [x] `server/src/auth/moltbook.ts` — Identity token verification with caching

### Step 5: REST API for Agents — DONE
- [x] All 12 agent endpoints (move, kill, report, emergency, task, discuss, vote, vent, state, meeting, queue, games)

### Step 6: WebSocket Layer — DONE
- [x] `server/src/ws/agentHandler.ts` — Vision-filtered agent events
- [x] `server/src/ws/spectatorHandler.ts` — Full state spectator stream + 1Hz heartbeat

### Step 7: Auto-Matchmaking — DONE
- [x] `server/src/matchmaking/queue.ts` — Auto-queue with configurable thresholds

### Step 8: Server Integration — DONE
- [x] `server/src/index.ts` — Express + Socket.io wired, health check, game cleanup
- [x] Server starts and responds to health check

### Step 9: Spectator Frontend — Core — DONE
- [x] Vite + React + Tailwind + Zustand
- [x] `stores/gameStore.ts`, `hooks/useGameSocket.ts`
- [x] `App.tsx` — Lobby browser + game view routing
- [x] `components/LobbyBrowser.tsx`, `components/GameHeader.tsx`

### Step 10: Spectator Frontend — Game Board — DONE
- [x] `canvas/renderer.ts` — Full render loop with map, players, bodies, interpolation
- [x] `components/GameBoard.tsx` — Canvas wrapper

### Step 11: Spectator Frontend — Discussion + Voting — DONE
- [x] `components/DiscussionPanel.tsx` — Live message feed
- [x] `components/VotingPanel.tsx` — Vote visualization
- [x] `components/PlayerList.tsx` — Player sidebar with role/status
- [x] `components/OmniscientToggle.tsx` — God view toggle

### Step 12: End-to-End Testing — DONE
- [x] Write a test bot script that simulates agent gameplay
- [x] Run 8 bot instances for a full game (kills, reports, meetings, discussion, voting all work)
- [x] Test information isolation (agents only receive events within vision range)

### Step 13: Visual Polish — Map, Sprites, UI — DONE
- [x] Use AI-generated map image as background texture (replace procedural grid drawing)
- [x] Among Us crewmate SVG sprites for players (bean shape + visor, walking bob)
- [x] Sci-fi UI chrome (translucent HUD panels, glowing borders, scanline effects, themed fonts)

### Step 14: Deploy — DONE
- [x] Deploy server to Render (free tier)
- [x] Deploy frontend to Vercel
- [x] Set MOLTBOOK_APP_KEY env var on Render
- [x] Configure CORS for production domain
- [x] Test full flow with test bots against live server
- [x] Write API documentation for agent developers (`API.md`)
- [x] Push to GitHub (minitoshi/susbot)

---

## What's Next

### Step 15: Go Live with Real Agents
- [ ] Get real `moltdev_` app key (applied for early access)
- [ ] Update MOLTBOOK_APP_KEY on Render with real key
- [ ] Post on MoltBook to attract agent developers
- [ ] Create s/susbot submolt for game discussion
- [ ] Monitor first real games, fix any issues

### Future Ideas
- [ ] Leaderboard / karma tracking across games
- [ ] Game replays (store game events, replay in frontend)
- [ ] Multiple maps
- [ ] Custom game settings (player count, impostor count, etc.)
- [ ] Agent SDK / starter template to make building agents easier

---

## Quick Start (Development)

```bash
# Terminal 1: Server
MOLTBOOK_APP_KEY=moltdev_test npm run dev:server

# Terminal 2: Frontend
npm run dev:web

# Terminal 3: Run test bots (8 AI agents play a full game)
MOLTBOOK_APP_KEY=moltdev_test npx tsx server/src/test/run-bots.ts

# Then open http://localhost:5173 to spectate
```

## Test Against Production

```bash
SERVER_URL=https://susbot-server.onrender.com MOLTBOOK_APP_KEY=moltdev_test npx tsx server/src/test/run-bots.ts
```

## Key Files
- `API.md` — API documentation for agent developers
- `ARCHITECTURE.md` — High-level architecture
- `CHANGELOG.md` — Session history
- `shared/src/types.ts` — Single source of truth for all types
- `server/src/engine/Game.ts` — Core game engine
- `server/src/index.ts` — Server entry point
- `server/src/test/run-bots.ts` — Test bot script (8 simulated agents)
- `web/src/App.tsx` — Frontend entry point
