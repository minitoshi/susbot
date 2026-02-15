import type { Server, Socket } from 'socket.io';
import type { Position, Player } from '@susbot/shared';
import { verifyIdentityToken } from '../auth/moltbook.js';
import { Game } from '../engine/Game.js';
import { distance } from '../engine/map.js';

export function setupAgentNamespace(io: Server, games: Map<string, Game>): void {
  const agentNs = io.of('/agent');

  // Auth middleware
  agentNs.use(async (socket, next) => {
    const token = socket.handshake.auth['token'] as string
      ?? socket.handshake.headers['authorization']?.replace('Bearer ', '');

    if (!token) {
      next(new Error('MISSING_AUTH'));
      return;
    }

    const result = await verifyIdentityToken(token, 'susbot');
    if (!result.success) {
      next(new Error(`AUTH_FAILED: ${result.error}`));
      return;
    }

    socket.data['agentId'] = result.profile.id;
    socket.data['profile'] = result.profile;
    next();
  });

  agentNs.on('connection', (socket: Socket) => {
    const agentId = socket.data['agentId'] as string;
    const gameId = socket.handshake.query['gameId'] as string;

    if (!gameId) {
      socket.emit('error', { message: 'gameId query parameter required', code: 'MISSING_GAME_ID' });
      socket.disconnect();
      return;
    }

    const game = games.get(gameId);
    if (!game) {
      socket.emit('error', { message: 'Game not found', code: 'GAME_NOT_FOUND' });
      socket.disconnect();
      return;
    }

    const player = game.players.get(agentId);
    if (!player) {
      socket.emit('error', { message: 'Not in this game', code: 'NOT_IN_GAME' });
      socket.disconnect();
      return;
    }

    socket.join(gameId);

    // ── WebSocket action handlers ────────────────────────

    socket.on('action:move', (data: { target: Position }, cb) => {
      const result = game.move(agentId, data.target);
      if (typeof cb === 'function') cb(result);
    });

    socket.on('action:kill', (data: { targetPlayerId: string }, cb) => {
      const result = game.kill(agentId, data.targetPlayerId);
      if (typeof cb === 'function') cb(result);
    });

    socket.on('action:report', (data: { bodyPlayerId: string }, cb) => {
      const result = game.report(agentId, data.bodyPlayerId);
      if (typeof cb === 'function') cb(result);
    });

    socket.on('action:emergency', (_data, cb) => {
      const result = game.emergency(agentId);
      if (typeof cb === 'function') cb(result);
    });

    socket.on('action:task', (data: { taskId: string }, cb) => {
      const result = game.startTask(agentId, data.taskId);
      if (typeof cb === 'function') cb(result);
    });

    socket.on('action:discuss', (data: { message: string; channel: 'public' | 'impostor' }, cb) => {
      const result = game.discuss(agentId, data.message, data.channel);
      if (typeof cb === 'function') cb(result);
    });

    socket.on('action:vote', (data: { targetPlayerId: string }, cb) => {
      const result = game.vote(agentId, data.targetPlayerId);
      if (typeof cb === 'function') cb(result);
    });

    socket.on('action:vent', (data: { action: 'enter' | 'move' | 'exit'; targetRoom?: string }, cb) => {
      const result = game.ventAction(agentId, data.action, data.targetRoom);
      if (typeof cb === 'function') cb(result);
    });
  });
}

// ─── Vision-Filtered Event Broadcasting ──────────────────────

export function bindGameToAgents(io: Server, game: Game): void {
  const agentNs = io.of('/agent');
  const room = game.gameId;

  game.on('phase_changed', (phase, timerSec) => {
    agentNs.to(room).emit('game:phase_changed', { phase, timerSec });

    // When entering 'starting', send player list so bots know who's in the game
    if (phase === 'starting') {
      const playerList = [...game.players.values()].map(p => ({
        playerId: p.id,
        color: p.color,
        name: p.moltbook.name,
      }));
      agentNs.to(room).emit('game:starting', { players: playerList });
    }
  });

  game.on('game_started', (players) => {
    // Send individual role assignments
    for (const p of players) {
      const fellowImpostors = p.role === 'impostor'
        ? players.filter((f: Player) => f.role === 'impostor' && f.id !== p.id)
            .map((f: Player) => ({ playerId: f.id, color: f.color, name: f.moltbook.name }))
        : null;

      // Find the socket for this agent
      const sockets = agentNs.sockets;
      for (const [_sid, socket] of sockets) {
        if (socket.data['agentId'] === p.id) {
          socket.emit('game:role_assigned', {
            role: p.role,
            tasks: p.tasks,
            fellowImpostors,
          });
        }
      }
    }
  });

  // Movement — only send to agents who can see the moving player
  game.on('player_moved', (playerId, position) => {
    const movedPlayer = game.players.get(playerId);
    if (!movedPlayer) return;

    const sockets = agentNs.sockets;
    for (const [_sid, socket] of sockets) {
      if (!socket.rooms.has(room)) continue;
      const observerId = socket.data['agentId'] as string;
      if (observerId === playerId) continue;

      const observer = game.players.get(observerId);
      if (!observer || !observer.alive) continue;

      const visionRadius = observer.role === 'impostor'
        ? game.settings.visionImpostor
        : game.settings.visionCrewmate;

      if (distance(observer.position, position) <= visionRadius) {
        socket.emit('player:moved', {
          playerId,
          color: movedPlayer.color,
          position,
        });
      }
    }
  });

  // Kill — send to victim, and to witnesses in vision range
  game.on('player_killed', (killerId, victimId, location) => {
    const killer = game.players.get(killerId);
    const victim = game.players.get(victimId);
    if (!killer || !victim) return;

    const sockets = agentNs.sockets;
    for (const [_sid, socket] of sockets) {
      if (!socket.rooms.has(room)) continue;
      const observerId = socket.data['agentId'] as string;

      if (observerId === victimId) {
        socket.emit('you:killed', { killerId, killerColor: killer.color });
        continue;
      }

      if (observerId === killerId) continue; // Killer already knows

      const observer = game.players.get(observerId);
      if (!observer || !observer.alive) continue;

      const visionRadius = observer.role === 'impostor'
        ? game.settings.visionImpostor
        : game.settings.visionCrewmate;

      if (distance(observer.position, location) <= visionRadius) {
        // Witness sees the kill
        const canSeeKiller = distance(observer.position, killer.position) <= visionRadius;
        socket.emit('player:killed', {
          victimId,
          victimColor: victim.color,
          location,
          killerId: canSeeKiller ? killerId : null,
          killerColor: canSeeKiller ? killer.color : null,
        });
      }
    }
  });

  // Meeting events — broadcast to all alive agents
  game.on('meeting_called', (info) => {
    agentNs.to(room).emit('meeting:called', info);
  });

  game.on('discussion_message', (msg) => {
    // Only alive players see discussion messages
    const sockets = agentNs.sockets;
    for (const [_sid, socket] of sockets) {
      if (!socket.rooms.has(room)) continue;
      const id = socket.data['agentId'] as string;
      const p = game.players.get(id);
      if (p && p.alive) {
        socket.emit('discussion:message', msg);
      }
    }
  });

  // Impostor chat — only impostors
  game.on('impostor_chat', (playerId, message) => {
    const sender = game.players.get(playerId);
    if (!sender) return;

    const sockets = agentNs.sockets;
    for (const [_sid, socket] of sockets) {
      if (!socket.rooms.has(room)) continue;
      const id = socket.data['agentId'] as string;
      const p = game.players.get(id);
      if (p && p.role === 'impostor') {
        socket.emit('impostor:chat', {
          playerId,
          color: sender.color,
          name: sender.moltbook.name,
          message,
        });
      }
    }
  });

  game.on('voting_opened', (timerSec) => {
    const alivePlayers = [...game.players.values()]
      .filter(p => p.alive)
      .map(p => ({ playerId: p.id, color: p.color }));
    agentNs.to(room).emit('voting:opened', { timerSec, alivePlayers });
  });

  game.on('player_voted', (playerId) => {
    const player = game.players.get(playerId);
    if (!player) return;
    agentNs.to(room).emit('voting:player_voted', { playerId, color: player.color });
  });

  game.on('vote_result', (result) => {
    agentNs.to(room).emit('vote:result', result);
  });

  game.on('task_completed', (playerId, taskId, taskName) => {
    // Only send to the player who completed it
    const sockets = agentNs.sockets;
    for (const [_sid, socket] of sockets) {
      if (socket.data['agentId'] === playerId) {
        socket.emit('task:completed', { taskId, taskName });
      }
    }
  });

  game.on('taskbar_updated', (progress) => {
    agentNs.to(room).emit('taskbar:updated', { progress });
  });

  game.on('game_over', (winner, reason, roles) => {
    agentNs.to(room).emit('game:over', { winner, reason, roles });
  });
}
