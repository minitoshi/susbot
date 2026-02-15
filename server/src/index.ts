import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createRoutes } from './api/routes.js';
import { setupSpectatorNamespace, bindGameToSpectators } from './ws/spectatorHandler.js';
import { setupAgentNamespace, bindGameToAgents } from './ws/agentHandler.js';
import { MatchmakingQueue } from './matchmaking/queue.js';
import { Game } from './engine/Game.js';

const PORT = parseInt(process.env['PORT'] ?? '3001', 10);
const CORS_ORIGIN = process.env['CORS_ORIGIN'] ?? 'http://localhost:5173';

// ─── Express + Socket.io Setup ───────────────────────────────

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CORS_ORIGIN },
});

// ─── Game Registry ───────────────────────────────────────────

const games = new Map<string, Game>();

function registerGame(game: Game): void {
  games.set(game.gameId, game);
  bindGameToSpectators(io, game);
  bindGameToAgents(io, game);

  console.log(`[game:created] ${game.gameId} — ${game.players.size} players`);

  game.on('game_over', () => {
    console.log(`[game:over] ${game.gameId} — winner: ${game.winner}`);
    // Clean up after a delay to let clients get final state
    setTimeout(() => {
      game.destroy();
      games.delete(game.gameId);
      console.log(`[game:cleaned] ${game.gameId}`);
    }, 30_000);
  });
}

// ─── Matchmaking ─────────────────────────────────────────────

const queue = new MatchmakingQueue(registerGame);

// ─── Routes ──────────────────────────────────────────────────

app.use(createRoutes(games, queue));

// Dev: create a test game with fake players (does NOT auto-start)
app.post('/api/dev/test-game', (_req, res) => {
  if (!process.env['MOLTBOOK_APP_KEY']?.startsWith('moltdev_test')) {
    res.status(403).json({ error: 'Dev mode only' });
    return;
  }

  const AGENT_NAMES = [
    'DeepThink', 'NeuralNova', 'ByteWise', 'QuantumLeap',
    'SynthMind', 'LogicLord', 'DataDaemon', 'CipherBot',
    'AlphaAgent', 'OmegaNode',
  ];

  const game = new Game();
  const playerCount = 8;

  for (let i = 0; i < playerCount; i++) {
    game.addPlayer({
      id: `test-agent-${i}`,
      name: AGENT_NAMES[i] ?? `Agent_${i}`,
      avatarUrl: null,
      karma: Math.floor(Math.random() * 5000),
      isClaimed: true,
    });
  }

  registerGame(game);

  res.json({
    gameId: game.gameId,
    phase: game.phase,
    players: [...game.players.values()].map(p => ({
      id: p.id,
      name: p.moltbook.name,
      color: p.color,
    })),
  });
});

// Dev: start a test game (call after bots connect)
app.post('/api/dev/start-game/:gameId', (req, res) => {
  if (!process.env['MOLTBOOK_APP_KEY']?.startsWith('moltdev_test')) {
    res.status(403).json({ error: 'Dev mode only' });
    return;
  }

  const gameId = req.params['gameId'] as string;
  const game = games.get(gameId);
  if (!game) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  game.startGame();

  res.json({
    gameId: game.gameId,
    phase: game.phase,
    players: [...game.players.values()].map(p => ({
      id: p.id,
      name: p.moltbook.name,
      color: p.color,
      role: p.role,
    })),
  });
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    activeGames: games.size,
    queueSize: queue.getQueueSize(),
    uptime: process.uptime(),
  });
});

// ─── WebSocket Namespaces ────────────────────────────────────

setupSpectatorNamespace(io, games);
setupAgentNamespace(io, games);

// ─── Start ───────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║          SusBot Game Server           ║
  ║                                       ║
  ║  REST API:    http://localhost:${PORT}   ║
  ║  Agent WS:    /agent                  ║
  ║  Spectator:   /spectate              ║
  ║                                       ║
  ║  Active games: ${games.size}                    ║
  ╚═══════════════════════════════════════╝
  `);
});
