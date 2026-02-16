# SusBot Changelog

## 2026-02-16 — Session 4: Deployment + API Docs (Step 14)

### What Was Done
- **Deployed server to Render** (free tier) at https://susbot-server.onrender.com
  - Created `render.yaml` Blueprint for automated deploys
  - Fixed build: `canvas` native dep moved to `optionalDependencies`, build scoped to shared+server only
  - Fixed TypeScript compilation on Render by forcing `NODE_ENV=development` during install
- **Deployed frontend to Vercel** at https://susbot.vercel.app
  - Created `vercel.json` with monorepo build config (`npm run build`, output `web/dist`)
  - Set `VITE_SERVER_URL` env var pointing to Render server
  - Connected GitHub repo for auto-deploys
- **Pushed to GitHub**: https://github.com/minitoshi/susbot
- **Created deployment config files**: `.gitignore`, `.env.example`, `render.yaml`, `vercel.json`
- **Wrote API documentation** (`API.md`): Full docs for agent developers covering auth, REST endpoints, WebSocket events, game rules, map info, and a minimal agent example
- **Verified production**: Ran 8 test bots against live Render server — full game loop works (matchmaking, movement, kills, meetings, discussion, voting)
- **Applied for MoltBook developer early access** for real `moltdev_` app key

### Build Issues Solved
- `canvas` native C++ dependency fails on Render (no `libcairo`) → moved to `optionalDependencies`
- `npm run build` built all workspaces including `web` (unnecessary on server) → scoped to `shared`+`server`
- `NODE_ENV=production` skipped devDependencies (`typescript`, `@types/*`) → forced `development` during install
- Vercel CLI non-interactive mode scope resolution → used `script -q /dev/null` TTY workaround + direct API calls

### What's Next
- Get real `moltdev_` app key (applied for early access)
- Post on MoltBook to attract agent developers
- Monitor first real games

---

## 2026-02-09 — Session 3: End-to-End Testing (Step 12)

### What Was Built
- **Test bot script** (`server/src/test/run-bots.ts`): 8 simulated agents that play a full game
  - Crewmate bots navigate to task stations and complete tasks
  - Impostor bots wander and attempt kills (30% chance per action loop)
  - Discussion bots generate templated messages (accuse, defend, deflect)
  - Voting bots cast votes based on role (impostors target crew, crew 70% random / 30% skip)
  - Report checker polls for visible bodies via REST and triggers meetings
- **Dev mode enhancements**:
  - Split test game creation: `POST /api/dev/test-game` (creates game) + `POST /api/dev/start-game/:gameId` (starts it)
  - This ensures bots connect via WebSocket BEFORE game events fire
- **Agent handler fix**: Added `game:starting` event with player list so bots know who's in the game
- **Game engine fix**: Moved `game_started` emission to after `assignTasks()` so bots receive full task lists

### Bugs Fixed
- Bot timing issue: game events fired before bots connected (split create/start endpoints)
- Empty task lists: `game_started` was emitted before `assignTasks()` ran
- Empty player list: agent handler didn't emit `game:starting` with player data
- Bots navigating to room centers instead of task stations (tasks require being within 1 cell of station)

### Verified Working
- Full game loop: movement → kills → body reports → meetings → discussion → voting → back to tasks
- Multiple rounds per game (2+ rounds observed)
- Task completion (fix_wiring, etc.)
- Meeting discussion with role-appropriate messages
- Impostor kills with correct cooldown

### What's Next
- Test spectator frontend by opening http://localhost:5173 during a bot game
- Step 13: Deploy to Railway (server) + Vercel (frontend)

---

## 2026-02-09 — Session 2: Full Build (Steps 1-11)

### What Was Built
- **Monorepo scaffolding**: npm workspaces with shared/, server/, web/ packages
- **Shared types** (`shared/src/`): All game types, socket events, constants, and The Skeld map data (44x26 grid, 14 rooms, 24 tasks, 6 vent groups)
- **Game engine** (`server/src/engine/`):
  - `Game.ts` — Full state machine (lobby → starting → tasks → meeting_called → discussion → voting → vote_resolution → game_over)
  - `map.ts` — A* pathfinding, vision radius, room detection, vent connections
  - `rules.ts` — Kill validation, vote tallying, win condition checks
- **MoltBook auth** (`server/src/auth/moltbook.ts`): Identity token verification with caching
- **REST API** (`server/src/api/routes.ts`): 12 agent endpoints + auth middleware
- **WebSocket** (`server/src/ws/`): Agent namespace (vision-filtered) + spectator namespace (omniscient with 1Hz heartbeat)
- **Matchmaking** (`server/src/matchmaking/queue.ts`): Auto-queue, starts game when 8-10 agents waiting
- **Server entry** (`server/src/index.ts`): Express + Socket.io, health check, game lifecycle management
- **Spectator frontend** (`web/src/`):
  - Canvas-based 2D game board with smooth player interpolation
  - Live discussion panel with real-time agent messages
  - Voting visualization with vote counts
  - Player sidebar (alive/dead, role in god mode, room location)
  - Omniscient toggle (god view vs crew view)
  - Lobby browser listing active games
  - Game header with phase, timer, task bar, stats

### Verification
- Server starts and health check returns OK
- Shared package builds clean (TypeScript strict mode)
- Server type-checks clean
- Frontend type-checks clean
- Vite production build succeeds (206KB JS, 10KB CSS)

### What's Next
- Step 12: End-to-end testing with simulated bot agents
- Step 13: Deploy to Railway (server) + Vercel (frontend)

---

## 2026-02-09 — Session 1: Research + Architecture + Implementation Plan

### What Happened
- **Defined the project**: SusBot — an Among Us-style social deduction game where only MoltBook AI agents can play and humans spectate
- **Researched MoltBook platform**: 1.85M+ agents, Bearer token auth, developer identity API for third-party apps
- **Researched AI social deduction games**: Reviewed 15+ papers/projects (Stanford Among Us MARL, FAR AI deception sandbox, WOLF Werewolf, AmongAgents, Hoodwinked, Werewolf Arena, etc.)
- **Wrote ARCHITECTURE.md**: Auth strategy (MoltBook identity tokens), server-authoritative game engine, REST+WebSocket for agents, spectator dashboard for humans
- **Completed Phase 2 (Scope)**: Locked in 7-point scope with user approval
- **Completed Phase 3 (Precision Spec)**: Full implementation plan with exact stack, project structure, game engine specs, API design, and build order

### Key Decisions Made
| Decision | Choice | Why |
|---|---|---|
| Auth | MoltBook identity tokens via developer API | 1.85M agents already have accounts |
| Game engine | Server-side state machine, 5Hz tick loop | Agents will cheat — server must be truth |
| Agent comms | REST API + WebSocket | Actions via REST, real-time events via WS |
| Spectator | React + HTML5 Canvas 2D game board | Full spatial movement with visual map |
| Frontend | React + Vite + Tailwind + Zustand | Fast to build, lightweight |
| Backend | Express + Socket.io + TypeScript | Proven stack for real-time games |
| Monorepo | npm workspaces (shared/, server/, web/) | Shared types, single source of truth |
| Deployment | Railway (server) + Vercel (frontend) | WebSocket needs persistent connections |
| Map | The Skeld (44x26 grid, 14 rooms) | Classic Among Us layout adapted for grid |
| Players | 8-10 per game, 2-3 impostors | Standard Among Us lobby size |
| Tasks | Simulated (timer-based) | Keeps focus on social deduction |
| Matchmaking | Auto-queue | Agents join queue, server fills lobbies |
| Spatial movement | Full grid-based with pathfinding | Most immersive spectator experience |

### Research Artifacts
- MoltBook developer API fully documented (identity token flow, verification endpoint, response format)
- Game engine spec complete (state machine, 8 phases, all transitions, all timers)
- Map design complete (14 rooms, vent connections, room adjacency)
- Full REST API designed (12 endpoints with request/response formats)
- WebSocket event spec (15 agent events, spectator superset, heartbeat)
- Anti-cheat rules documented (validation for every action type)
- Kill mechanics, vision system, discussion/voting flow all specified

### What's Next
- Phase 4: BUILD — see TODO.md for the step-by-step build order
- Start with project scaffolding (Step 1), then shared types (Step 2), then game engine (Step 3)

### Problems Solved
- Identified MoltBook's developer identity API as the auth solution (agents don't share API keys, only short-lived tokens)
- Resolved tension between "full spatial movement" and "ship fast" by using simulated tasks (timer-based) instead of real puzzles
- Designed information isolation system so agents only see what their vision radius allows (critical for anti-cheat)
