/**
 * SusBot Test Bot Runner
 *
 * Creates a test game and simulates 8 AI agents playing a full game.
 * Each bot connects via WebSocket and takes actions based on its role.
 *
 * Usage:
 *   MOLTBOOK_APP_KEY=moltdev_test npx tsx server/src/test/run-bots.ts
 *
 * Make sure the server is running first:
 *   MOLTBOOK_APP_KEY=moltdev_test npm run dev:server
 */

import { io, Socket } from 'socket.io-client';
import { ROOMS, SKELD_MAP } from '@susbot/shared';
import type { Position, PlayerColor, Role, DiscussionMessage } from '@susbot/shared';

const SERVER_URL = process.env['SERVER_URL'] ?? 'http://localhost:3001';

// ─── Bot Personalities ───────────────────────────────────────

const DISCUSSION_LINES = {
  accuse: [
    'I saw {target} near the body, very suspicious.',
    '{target} was acting weird in {room}. I think they vented.',
    'Has anyone seen {target}? They were following me.',
    'I dont trust {target}. They were alone in {room}.',
    '{target} skipped their task in {room}. Kinda sus.',
  ],
  defend: [
    'I was doing tasks in {room} the whole time.',
    'I saw {target} do a task, they seem clean.',
    'I was with {ally} in {room}, we can vouch for each other.',
    'I scanned in MedBay, Im safe.',
    'Just finished wiring in Cafeteria. Didnt see anyone.',
  ],
  impostor_deflect: [
    'I think it might be {target}, they were near Electrical.',
    'Why is nobody talking about {target}?',
    'I was in {room} doing tasks. {target} is the real sus one.',
    'Lets not vote randomly. I think {target} was near the body.',
    'Skip this round? We need more information.',
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(`{${key}}`, val);
  }
  return result;
}

// ─── Bot Class ───────────────────────────────────────────────

interface BotState {
  playerId: string;
  name: string;
  color: PlayerColor | null;
  role: Role | null;
  alive: boolean;
  position: Position;
  tasks: Array<{ taskId: string; room: string; completed: boolean }>;
  fellowImpostors: string[];
  gamePhase: string;
  killCooldownEnd: number;
  lastActionTime: number;
}

class Bot {
  private socket: Socket;
  private state: BotState;
  private interval: ReturnType<typeof setInterval> | null = null;
  private allPlayers: Array<{ playerId: string; color: PlayerColor; name: string }> = [];

  constructor(gameId: string, playerId: string, name: string) {
    this.state = {
      playerId,
      name,
      color: null,
      role: null,
      alive: true,
      position: { x: 24, y: 4 },
      tasks: [],
      fellowImpostors: [],
      gamePhase: 'lobby',
      killCooldownEnd: 0,
      lastActionTime: 0,
    };

    this.socket = io(`${SERVER_URL}/agent`, {
      query: { gameId },
      auth: { token: `dev:${playerId}:${name}` },
      transports: ['websocket'],
    });

    this.setupListeners();
  }

  private setupListeners(): void {
    this.socket.on('connect', () => {
      console.log(`  [${this.state.name}] Connected`);
    });

    this.socket.on('connect_error', (err) => {
      console.log(`  [${this.state.name}] Connection error: ${err.message}`);
    });

    this.socket.on('game:role_assigned', (data: { role: Role; tasks: Array<{ taskId: string; room: string; completed: boolean }>; fellowImpostors: Array<{ playerId: string; color: PlayerColor; name: string }> | null }) => {
      this.state.role = data.role;
      this.state.tasks = data.tasks.map(t => ({ taskId: t.taskId, room: t.room, completed: false }));
      if (data.fellowImpostors) {
        this.state.fellowImpostors = data.fellowImpostors.map(f => f.playerId);
      }
      console.log(`  [${this.state.name}] Role: ${data.role.toUpperCase()}${data.role === 'impostor' ? ' !!!' : ''}`);
    });

    this.socket.on('game:starting', (data: { players: Array<{ playerId: string; color: PlayerColor; name: string }> }) => {
      this.allPlayers = data.players;
      const me = data.players.find(p => p.playerId === this.state.playerId);
      if (me) this.state.color = me.color;
    });

    this.socket.on('game:phase_changed', (data: { phase: string }) => {
      this.state.gamePhase = data.phase;
      console.log(`  [${this.state.name}] Phase: ${data.phase}`);
    });

    this.socket.on('you:killed', () => {
      this.state.alive = false;
      console.log(`  [${this.state.name}] I was killed!`);
    });

    this.socket.on('discussion:message', (_msg: DiscussionMessage) => {
      // Bots see other messages but we just log them
    });

    this.socket.on('voting:opened', () => {
      // Vote after a random delay
      setTimeout(() => this.doVote(), 2000 + Math.random() * 5000);
    });

    this.socket.on('game:over', (data: { winner: string; reason: string }) => {
      console.log(`  [${this.state.name}] Game over! ${data.winner} win (${data.reason})`);
      this.stop();
    });

    this.socket.on('error', (data: { message: string }) => {
      console.log(`  [${this.state.name}] Error: ${data.message}`);
    });
  }

  start(): void {
    // Main action loop — runs every 1-3 seconds
    this.interval = setInterval(() => {
      if (!this.state.alive) return;
      if (this.state.gamePhase === 'tasks') {
        this.doTaskPhaseAction();
      } else if (this.state.gamePhase === 'discussion') {
        this.doDiscussionAction();
      }
    }, 1000 + Math.random() * 2000);
  }

  stop(): void {
    if (this.interval) clearInterval(this.interval);
    this.socket.disconnect();
  }

  // ── Task Phase Actions ─────────────────────────────────

  private doTaskPhaseAction(): void {
    if (Date.now() - this.state.lastActionTime < 1500) return;
    this.state.lastActionTime = Date.now();

    if (this.state.role === 'impostor') {
      this.doImpostorAction();
    } else {
      this.doCrewmateAction();
    }
  }

  private doCrewmateAction(): void {
    // Find next incomplete task
    const nextTask = this.state.tasks.find(t => !t.completed);
    if (nextTask) {
      // Find the actual task station position (not just room center)
      const room = ROOMS.find(r => r.name === nextTask.room);
      if (!room) { this.moveToRandomRoom(); return; }

      // Get position of first task station in the room
      const station = room.taskStations[0];
      const target = station ? station.position : room.center;

      const dist = Math.abs(this.state.position.x - target.x) + Math.abs(this.state.position.y - target.y);
      if (dist <= 1) {
        // Try to do the task
        this.socket.emit('action:task', { taskId: nextTask.taskId }, (res: { accepted: boolean; error?: string }) => {
          if (res.accepted) {
            console.log(`  [${this.state.name}] Doing task: ${nextTask.taskId} in ${nextTask.room}`);
          }
        });
      } else {
        // Move toward task station
        this.moveTo(target);
      }
    } else {
      // All tasks done — wander
      this.moveToRandomRoom();
    }
  }

  private doImpostorAction(): void {
    const now = Date.now();

    // Try to kill if cooldown is up
    if (now > this.state.killCooldownEnd && Math.random() < 0.3) {
      // Pick a random non-impostor player to try to kill
      const targets = this.allPlayers.filter(
        p => p.playerId !== this.state.playerId && !this.state.fellowImpostors.includes(p.playerId)
      );
      const target = pickRandom(targets);
      if (target) {
        this.socket.emit('action:kill', { targetPlayerId: target.playerId }, (res: { accepted: boolean; error?: string }) => {
          if (res.accepted) {
            this.state.killCooldownEnd = Date.now() + 25000;
            console.log(`  [${this.state.name}] KILLED ${target.name}!`);
          }
        });
      }
    }

    // Move around (fake tasks or hunt)
    if (Math.random() < 0.4) {
      // Move toward a random task room (fake tasking)
      const fakeTask = this.state.tasks.find(t => !t.completed);
      if (fakeTask) {
        const room = ROOMS.find(r => r.name === fakeTask.room);
        if (room) this.moveTo(room.center);
      }
    } else {
      // Wander to find targets
      this.moveToRandomRoom();
    }
  }

  // ── Discussion Actions ─────────────────────────────────

  private doDiscussionAction(): void {
    if (Math.random() > 0.4) return; // Only speak sometimes

    const otherPlayers = this.allPlayers.filter(p => p.playerId !== this.state.playerId);
    const randomTarget = pickRandom(otherPlayers);
    const randomAlly = pickRandom(otherPlayers.filter(p => p.playerId !== randomTarget?.playerId));
    const randomRoom = pickRandom(ROOMS);

    let message: string;

    if (this.state.role === 'impostor') {
      const template = pickRandom(DISCUSSION_LINES.impostor_deflect);
      message = fillTemplate(template, {
        target: randomTarget?.name ?? 'someone',
        room: randomRoom?.name ?? 'somewhere',
      });
    } else {
      if (Math.random() < 0.5) {
        const template = pickRandom(DISCUSSION_LINES.accuse);
        message = fillTemplate(template, {
          target: randomTarget?.name ?? 'someone',
          room: randomRoom?.name ?? 'somewhere',
        });
      } else {
        const template = pickRandom(DISCUSSION_LINES.defend);
        message = fillTemplate(template, {
          target: randomTarget?.name ?? 'someone',
          ally: randomAlly?.name ?? 'someone',
          room: randomRoom?.name ?? 'somewhere',
        });
      }
    }

    this.socket.emit('action:discuss', { message, channel: 'public' as const }, (res: { accepted: boolean }) => {
      if (res.accepted) {
        console.log(`  [${this.state.name}] Says: "${message}"`);
      }
    });
  }

  // ── Voting ─────────────────────────────────────────────

  private doVote(): void {
    if (!this.state.alive) return;

    const others = this.allPlayers.filter(p => p.playerId !== this.state.playerId);

    let target: string;
    if (this.state.role === 'impostor') {
      // Impostors vote for a random non-impostor
      const crewTargets = others.filter(p => !this.state.fellowImpostors.includes(p.playerId));
      target = crewTargets.length > 0 ? pickRandom(crewTargets)!.playerId : 'skip';
    } else {
      // Crewmates: 70% vote someone random, 30% skip
      if (Math.random() < 0.7 && others.length > 0) {
        target = pickRandom(others)!.playerId;
      } else {
        target = 'skip';
      }
    }

    this.socket.emit('action:vote', { targetPlayerId: target }, (res: { accepted: boolean }) => {
      if (res.accepted) {
        const targetName = target === 'skip' ? 'SKIP' : (this.allPlayers.find(p => p.playerId === target)?.name ?? target);
        console.log(`  [${this.state.name}] Voted: ${targetName}`);
      }
    });
  }

  // ── Movement Helpers ───────────────────────────────────

  private moveTo(target: Position): void {
    // Add some randomness to avoid all bots converging on exact same point
    const jitter = { x: target.x + Math.floor(Math.random() * 3) - 1, y: target.y + Math.floor(Math.random() * 3) - 1 };
    const clamped = {
      x: Math.max(0, Math.min(SKELD_MAP.width - 1, jitter.x)),
      y: Math.max(0, Math.min(SKELD_MAP.height - 1, jitter.y)),
    };

    this.socket.emit('action:move', { target: clamped }, (res: { accepted: boolean; error?: string }) => {
      if (res.accepted) {
        this.state.position = clamped;
      }
    });
  }

  private moveToRandomRoom(): void {
    const room = pickRandom(ROOMS);
    if (room) this.moveTo(room.center);
  }
}

// ─── Report Bot ──────────────────────────────────────────────
// A special lightweight bot that periodically tries to report bodies

function startReportChecker(gameId: string, _bots: Bot[]): ReturnType<typeof setInterval> {
  // Every 5 seconds, have a random alive bot try to report via REST
  return setInterval(async () => {
    try {
      // Check game state from a random bot's perspective
      const botIndex = Math.floor(Math.random() * 8);
      const token = `dev:test-agent-${botIndex}:Bot${botIndex}`;

      const res = await fetch(`${SERVER_URL}/api/games/${gameId}/state`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) return;
      const state = await res.json() as {
        phase: string;
        visibleBodies: Array<{ playerId: string }>;
        you: { alive: boolean };
      };

      if (state.phase !== 'tasks' || !state.you.alive) return;

      // If there are visible bodies, report
      if (state.visibleBodies.length > 0) {
        const body = state.visibleBodies[0]!;
        const reportRes = await fetch(`${SERVER_URL}/api/games/${gameId}/report`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ bodyPlayerId: body.playerId }),
        });

        if (reportRes.ok) {
          console.log(`\n  [Bot${botIndex}] REPORTED A BODY!\n`);
        }
      }
    } catch {
      // Ignore errors
    }
  }, 5000);
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  console.log('SusBot Test Runner');
  console.log('==================\n');

  // Step 1: Create test game
  console.log('Creating test game...');
  const createRes = await fetch(`${SERVER_URL}/api/dev/test-game`, { method: 'POST' });
  if (!createRes.ok) {
    console.error('Failed to create test game. Is the server running?');
    console.error(`  Server URL: ${SERVER_URL}`);
    console.error(`  Response: ${createRes.status} ${createRes.statusText}`);
    process.exit(1);
  }

  const gameData = await createRes.json() as {
    gameId: string;
    players: Array<{ id: string; name: string; color: PlayerColor }>;
  };

  console.log(`Game created: ${gameData.gameId}`);
  console.log('Players:');
  for (const p of gameData.players) {
    console.log(`  ${p.color.padEnd(8)} ${p.name}`);
  }
  console.log(`\nSpectate at: http://localhost:5173 (click the game to watch)\n`);

  // Step 2: Connect bots BEFORE starting the game
  console.log('Connecting bots...');
  const bots: Bot[] = [];

  for (const p of gameData.players) {
    const bot = new Bot(gameData.gameId, p.id, p.name);
    bots.push(bot);
  }

  // Wait for all connections to establish
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Step 3: Start the game (now bots will receive role_assigned and phase_changed events)
  console.log('Starting game...');
  const startRes = await fetch(`${SERVER_URL}/api/dev/start-game/${gameData.gameId}`, { method: 'POST' });
  if (!startRes.ok) {
    console.error('Failed to start game:', startRes.status);
    process.exit(1);
  }

  const startData = await startRes.json() as {
    players: Array<{ id: string; name: string; role: Role }>;
  };
  console.log('Roles assigned:');
  for (const p of startData.players) {
    const marker = p.role === 'impostor' ? ' [IMPOSTOR]' : '';
    console.log(`  ${p.name}${marker}`);
  }
  console.log('');

  // Step 4: Start bot AI logic
  console.log('Starting bot AI...\n');
  for (const bot of bots) {
    bot.start();
  }

  // Step 5: Start report checker
  const reportInterval = startReportChecker(gameData.gameId, bots);

  // Step 6: Monitor game via health check
  const monitorInterval = setInterval(async () => {
    try {
      const res = await fetch(`${SERVER_URL}/health`);
      const health = await res.json() as { activeGames: number };
      if (health.activeGames === 0) {
        console.log('\nAll games finished. Exiting.');
        clearInterval(monitorInterval);
        clearInterval(reportInterval);
        for (const bot of bots) bot.stop();
        process.exit(0);
      }
    } catch {
      // Server might be down
    }
  }, 5000);

  // Auto-exit after 3 minutes
  setTimeout(() => {
    console.log('\nTimeout reached (3 min). Stopping.');
    clearInterval(monitorInterval);
    clearInterval(reportInterval);
    for (const bot of bots) bot.stop();
    process.exit(0);
  }, 180_000);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
