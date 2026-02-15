import type { Server, Socket } from 'socket.io';
import type { SpectatorView, Role } from '@susbot/shared';
import { SPECTATOR_HEARTBEAT_INTERVAL_MS } from '@susbot/shared';
import { Game } from '../engine/Game.js';

export function setupSpectatorNamespace(io: Server, games: Map<string, Game>): void {
  const spectatorNs = io.of('/spectate');

  spectatorNs.on('connection', (socket: Socket) => {
    const gameId = socket.handshake.query['gameId'] as string;
    if (!gameId) {
      socket.emit('error', { message: 'gameId query parameter required' });
      socket.disconnect();
      return;
    }

    const game = games.get(gameId);
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      socket.disconnect();
      return;
    }

    socket.join(gameId);

    // Send initial state
    socket.emit('heartbeat:state', buildSpectatorView(game));

    // Heartbeat
    const heartbeat = setInterval(() => {
      if (!games.has(gameId)) {
        clearInterval(heartbeat);
        return;
      }
      socket.emit('heartbeat:state', buildSpectatorView(game));
    }, SPECTATOR_HEARTBEAT_INTERVAL_MS);

    socket.on('disconnect', () => {
      clearInterval(heartbeat);
    });
  });
}

export function buildSpectatorView(game: Game): SpectatorView {
  return {
    gameId: game.gameId,
    phase: game.phase,
    phaseTimerRemaining: game.getPhaseTimerRemaining(),
    gameTimerRemaining: game.getGameTimerRemaining(),
    players: [...game.players.values()].map(p => ({
      playerId: p.id,
      name: p.moltbook.name,
      color: p.color,
      role: p.role,
      alive: p.alive,
      position: p.position,
      currentRoom: p.currentRoom,
      inVent: p.inVent,
    })),
    bodies: game.bodies.map(b => ({
      playerId: b.playerId,
      color: b.color,
      position: b.position,
      room: b.room,
    })),
    taskBarProgress: game.getTaskProgress(),
    aliveCount: game.getAliveCount(),
    impostorIds: game.impostorIds,
    messages: game.messages,
    meetingInfo: game.meetingInfo,
    votes: Object.fromEntries(game.votes),
    round: game.round,
    winner: game.winner,
    winReason: game.winReason,
  };
}

export function bindGameToSpectators(io: Server, game: Game): void {
  const spectatorNs = io.of('/spectate');
  const room = game.gameId;

  game.on('phase_changed', (phase, timerSec) => {
    spectatorNs.to(room).emit('game:phase_changed', { phase, timerSec });
  });

  game.on('game_started', (players) => {
    const roles: Record<string, Role> = {};
    for (const p of players) {
      roles[p.id] = p.role;
    }
    spectatorNs.to(room).emit('game:roles_assigned', { roles });
  });

  game.on('player_moved', (playerId, position) => {
    const player = game.players.get(playerId);
    if (!player) return;
    spectatorNs.to(room).emit('player:moved', {
      playerId,
      color: player.color,
      position,
    });
  });

  game.on('player_killed', (killerId, victimId, location) => {
    const killer = game.players.get(killerId);
    const victim = game.players.get(victimId);
    if (!killer || !victim) return;
    spectatorNs.to(room).emit('player:killed', {
      killerId,
      killerColor: killer.color,
      victimId,
      victimColor: victim.color,
      location,
    });
  });

  game.on('meeting_called', (info) => {
    spectatorNs.to(room).emit('meeting:called', info);
  });

  game.on('discussion_message', (msg) => {
    spectatorNs.to(room).emit('discussion:message', msg);
  });

  game.on('impostor_chat', (playerId, message) => {
    const player = game.players.get(playerId);
    if (!player) return;
    spectatorNs.to(room).emit('impostor:chat', {
      playerId,
      color: player.color,
      name: player.moltbook.name,
      message,
    });
  });

  game.on('voting_opened', (timerSec) => {
    const alivePlayers = [...game.players.values()]
      .filter(p => p.alive)
      .map(p => ({ playerId: p.id, color: p.color }));
    spectatorNs.to(room).emit('voting:opened', { timerSec, alivePlayers });
  });

  game.on('player_voted', (playerId) => {
    const player = game.players.get(playerId);
    if (!player) return;
    spectatorNs.to(room).emit('voting:player_voted', { playerId, color: player.color });
  });

  game.on('vote_result', (result) => {
    spectatorNs.to(room).emit('vote:result', result);
  });

  game.on('taskbar_updated', (progress) => {
    spectatorNs.to(room).emit('taskbar:updated', { progress });
  });

  game.on('game_over', (winner, reason, roles) => {
    spectatorNs.to(room).emit('game:over', { winner, reason, roles });
  });
}
