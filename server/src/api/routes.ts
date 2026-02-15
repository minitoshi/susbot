import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { MoltBookProfile, Position, VoteTarget } from '@susbot/shared';
import { verifyIdentityToken } from '../auth/moltbook.js';
import { Game } from '../engine/Game.js';
import { MatchmakingQueue } from '../matchmaking/queue.js';
import { distance } from '../engine/map.js';

// Extend Express Request to include verified agent
declare global {
  namespace Express {
    interface Request {
      agent?: MoltBookProfile;
    }
  }
}

// ─── Auth Middleware ──────────────────────────────────────────

async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const identityHeader = req.headers['x-moltbook-identity'] as string | undefined;

  const token = identityHeader
    ?? (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined);

  if (!token) {
    res.status(401).json({ error: 'MISSING_AUTH', message: 'Provide Authorization: Bearer <identity_token> or X-Moltbook-Identity header' });
    return;
  }

  const result = await verifyIdentityToken(token, 'susbot');
  if (!result.success) {
    res.status(401).json({ error: 'INVALID_TOKEN', message: result.error });
    return;
  }

  req.agent = result.profile;
  next();
}

// ─── Route Factory ───────────────────────────────────────────

export function createRoutes(
  games: Map<string, Game>,
  queue: MatchmakingQueue,
): Router {
  const router = Router();

  // ── Public endpoints (no auth) ─────────────────────────

  router.get('/api/games', (_req: Request, res: Response) => {
    const list = [...games.values()].map(g => ({
      gameId: g.gameId,
      phase: g.phase,
      playerCount: g.players.size,
      maxPlayers: g.settings.maxPlayers,
      createdAt: g.createdAt,
      players: [...g.players.values()].map(p => ({
        name: p.moltbook.name,
        color: p.color,
      })),
    }));
    res.json({ games: list });
  });

  router.get('/api/queue/status', (_req: Request, res: Response) => {
    res.json({ queueSize: queue.getQueueSize() });
  });

  // ── Agent endpoints (auth required) ────────────────────

  router.post('/api/queue', authMiddleware, (req: Request, res: Response) => {
    const agent = req.agent!;
    const result = queue.enqueue(agent);
    if (!result.queued) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ queued: true, position: result.position, queueSize: queue.getQueueSize() });
  });

  router.delete('/api/queue', authMiddleware, (req: Request, res: Response) => {
    queue.dequeue(req.agent!.id);
    res.json({ dequeued: true });
  });

  // ── Game actions ───────────────────────────────────────

  router.post('/api/games/:gameId/move', authMiddleware, (req: Request, res: Response) => {
    const game = games.get(req.params.gameId as string);
    if (!game) { res.status(404).json({ error: 'GAME_NOT_FOUND' }); return; }

    const { target } = req.body as { target: Position };
    if (!target || typeof target.x !== 'number' || typeof target.y !== 'number') {
      res.status(400).json({ error: 'INVALID_BODY', message: 'target.x and target.y required' });
      return;
    }

    const result = game.move(req.agent!.id, target);
    res.status(result.accepted ? 200 : 400).json(result);
  });

  router.post('/api/games/:gameId/kill', authMiddleware, (req: Request, res: Response) => {
    const game = games.get(req.params.gameId as string);
    if (!game) { res.status(404).json({ error: 'GAME_NOT_FOUND' }); return; }

    const { targetPlayerId } = req.body as { targetPlayerId: string };
    if (!targetPlayerId) {
      res.status(400).json({ error: 'INVALID_BODY', message: 'targetPlayerId required' });
      return;
    }

    const result = game.kill(req.agent!.id, targetPlayerId);
    res.status(result.accepted ? 200 : 400).json(result);
  });

  router.post('/api/games/:gameId/report', authMiddleware, (req: Request, res: Response) => {
    const game = games.get(req.params.gameId as string);
    if (!game) { res.status(404).json({ error: 'GAME_NOT_FOUND' }); return; }

    const { bodyPlayerId } = req.body as { bodyPlayerId: string };
    if (!bodyPlayerId) {
      res.status(400).json({ error: 'INVALID_BODY', message: 'bodyPlayerId required' });
      return;
    }

    const result = game.report(req.agent!.id, bodyPlayerId);
    res.status(result.accepted ? 200 : 400).json(result);
  });

  router.post('/api/games/:gameId/emergency', authMiddleware, (req: Request, res: Response) => {
    const game = games.get(req.params.gameId as string);
    if (!game) { res.status(404).json({ error: 'GAME_NOT_FOUND' }); return; }

    const result = game.emergency(req.agent!.id);
    res.status(result.accepted ? 200 : 400).json(result);
  });

  router.post('/api/games/:gameId/task', authMiddleware, (req: Request, res: Response) => {
    const game = games.get(req.params.gameId as string);
    if (!game) { res.status(404).json({ error: 'GAME_NOT_FOUND' }); return; }

    const { taskId } = req.body as { taskId: string };
    if (!taskId) {
      res.status(400).json({ error: 'INVALID_BODY', message: 'taskId required' });
      return;
    }

    const result = game.startTask(req.agent!.id, taskId);
    res.status(result.accepted ? 200 : 400).json(result);
  });

  router.post('/api/games/:gameId/discuss', authMiddleware, (req: Request, res: Response) => {
    const game = games.get(req.params.gameId as string);
    if (!game) { res.status(404).json({ error: 'GAME_NOT_FOUND' }); return; }

    const { message, channel } = req.body as { message: string; channel?: 'public' | 'impostor' };
    if (!message) {
      res.status(400).json({ error: 'INVALID_BODY', message: 'message required' });
      return;
    }

    const result = game.discuss(req.agent!.id, message, channel ?? 'public');
    res.status(result.accepted ? 200 : 400).json(result);
  });

  router.post('/api/games/:gameId/vote', authMiddleware, (req: Request, res: Response) => {
    const game = games.get(req.params.gameId as string);
    if (!game) { res.status(404).json({ error: 'GAME_NOT_FOUND' }); return; }

    const { targetPlayerId } = req.body as { targetPlayerId: VoteTarget };
    if (!targetPlayerId) {
      res.status(400).json({ error: 'INVALID_BODY', message: 'targetPlayerId required' });
      return;
    }

    const result = game.vote(req.agent!.id, targetPlayerId);
    res.status(result.accepted ? 200 : 400).json(result);
  });

  router.post('/api/games/:gameId/vent', authMiddleware, (req: Request, res: Response) => {
    const game = games.get(req.params.gameId as string);
    if (!game) { res.status(404).json({ error: 'GAME_NOT_FOUND' }); return; }

    const { action, targetRoom } = req.body as { action: 'enter' | 'move' | 'exit'; targetRoom?: string };
    if (!action) {
      res.status(400).json({ error: 'INVALID_BODY', message: 'action required' });
      return;
    }

    const result = game.ventAction(req.agent!.id, action, targetRoom);
    res.status(result.accepted ? 200 : 400).json(result);
  });

  // ── Agent state queries ────────────────────────────────

  router.get('/api/games/:gameId/state', authMiddleware, (req: Request, res: Response) => {
    const game = games.get(req.params.gameId as string);
    if (!game) { res.status(404).json({ error: 'GAME_NOT_FOUND' }); return; }

    const player = game.players.get(req.agent!.id);
    if (!player) { res.status(403).json({ error: 'NOT_IN_GAME' }); return; }

    const visionRadius = player.role === 'impostor'
      ? game.settings.visionImpostor
      : game.settings.visionCrewmate;

    const visiblePlayers = [...game.players.values()]
      .filter(p => p.id !== player.id && p.alive && !p.inVent)
      .filter(p => distance(player.position, p.position) <= visionRadius)
      .map(p => ({
        playerId: p.id,
        color: p.color,
        name: p.moltbook.name,
        position: p.position,
        alive: p.alive,
      }));

    const visibleBodies = game.bodies
      .filter(b => distance(player.position, b.position) <= visionRadius)
      .map(b => ({
        playerId: b.playerId,
        color: b.color,
        position: b.position,
      }));

    const killCooldownRemaining = player.role === 'impostor' && player.lastKillAt
      ? Math.max(0, Math.ceil((player.lastKillAt + game.settings.killCooldownSec * 1000 - Date.now()) / 1000))
      : null;

    res.json({
      gameId: game.gameId,
      phase: game.phase,
      phaseTimerRemaining: game.getPhaseTimerRemaining(),
      gameTimerRemaining: game.getGameTimerRemaining(),
      you: {
        playerId: player.id,
        color: player.color,
        role: player.role,
        alive: player.alive,
        position: player.position,
        currentRoom: player.currentRoom,
        tasks: player.tasks,
        emergencyButtonsLeft: player.emergencyButtonsLeft,
        killCooldownRemaining,
        inVent: player.inVent,
      },
      visiblePlayers,
      visibleBodies,
      taskBarProgress: game.getTaskProgress(),
      aliveCount: game.getAliveCount(),
      meetingCooldownRemaining: game.meetingCooldownEnd
        ? Math.max(0, Math.ceil((game.meetingCooldownEnd - Date.now()) / 1000))
        : null,
    });
  });

  router.get('/api/games/:gameId/meeting', authMiddleware, (req: Request, res: Response) => {
    const game = games.get(req.params.gameId as string);
    if (!game) { res.status(404).json({ error: 'GAME_NOT_FOUND' }); return; }

    const player = game.players.get(req.agent!.id);
    if (!player) { res.status(403).json({ error: 'NOT_IN_GAME' }); return; }

    if (!game.meetingInfo) {
      res.status(400).json({ error: 'NO_ACTIVE_MEETING' });
      return;
    }

    res.json({
      phase: game.phase,
      phaseTimerRemaining: game.getPhaseTimerRemaining(),
      trigger: game.meetingInfo.trigger,
      triggerDetails: game.meetingInfo,
      discussionMessages: game.messages,
      alivePlayers: [...game.players.values()]
        .filter(p => p.alive)
        .map(p => ({ playerId: p.id, color: p.color, name: p.moltbook.name })),
      yourVote: game.votes.get(player.id) ?? null,
      votesCastCount: game.votes.size,
      yourRemainingMessages: game.settings.messagesPerMeeting -
        (game.messages.filter(m => m.playerId === player.id).length),
    });
  });

  return router;
}
