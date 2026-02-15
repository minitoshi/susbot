import { EventEmitter } from 'events';
import type {
  GamePhase, Player, PlayerColor, Role, PlayerTask,
  MeetingInfo, DiscussionMessage, VoteTarget, VoteResult, GameSettings,
  Position, MoltBookProfile, WinReason,
} from '@susbot/shared';
import {
  DEFAULT_SETTINGS, PLAYER_COLORS, SKELD_MAP, TASK_POOL,
  STARTING_COUNTDOWN_SEC, MEETING_CALLED_FREEZE_SEC,
  VOTE_RESOLUTION_DISPLAY_SEC, POST_MEETING_KILL_COOLDOWN_SEC,
  getImpostorCount, getRoomAtPosition, isWalkable,
} from '@susbot/shared';
import { getNextStep, isNearVent, isNearButton, isNearTaskStation, getConnectedVentRooms, getRoomName } from './map.js';
import { validateKill, tallyVotes, checkWinCondition, validateReport } from './rules.js';
import crypto from 'crypto';

// ─── Game Events ─────────────────────────────────────────────

export interface GameEvents {
  'phase_changed': (phase: GamePhase, timerSec: number | null) => void;
  'player_joined': (player: Player) => void;
  'player_moved': (playerId: string, position: Position) => void;
  'player_killed': (killerId: string, victimId: string, location: Position) => void;
  'body_visible': (observerId: string, bodyPlayerId: string, position: Position) => void;
  'meeting_called': (info: MeetingInfo) => void;
  'discussion_message': (msg: DiscussionMessage) => void;
  'impostor_chat': (playerId: string, message: string) => void;
  'voting_opened': (timerSec: number) => void;
  'player_voted': (playerId: string) => void;
  'vote_result': (result: VoteResult) => void;
  'task_completed': (playerId: string, taskId: string, taskName: string) => void;
  'taskbar_updated': (progress: number) => void;
  'game_started': (players: Player[]) => void;
  'game_over': (winner: 'crewmates' | 'impostors', reason: WinReason, roles: Record<string, Role>) => void;
  'tick': () => void;
}

export class Game extends EventEmitter {
  readonly gameId: string;
  readonly settings: GameSettings;

  phase: GamePhase = 'lobby';
  phaseTimerEnd: number | null = null;
  gameTimerEnd: number | null = null;

  players = new Map<string, Player>();
  impostorIds: string[] = [];
  bodies: Array<{ playerId: string; color: PlayerColor; position: Position; room: string | null }> = [];

  votes = new Map<string, VoteTarget>();
  messages: DiscussionMessage[] = [];
  meetingInfo: MeetingInfo | null = null;
  meetingCooldownEnd: number | null = null;
  round = 0;

  completedTasks = 0;
  totalTasks = 0;

  winner: 'crewmates' | 'impostors' | null = null;
  winReason: WinReason | null = null;

  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private tickCount = 0;
  private usedColors = new Set<PlayerColor>();
  private messageCountPerMeeting = new Map<string, number>();
  private lastMessageTime = new Map<string, number>();
  readonly createdAt = Date.now();

  constructor(settings?: Partial<GameSettings>) {
    super();
    this.gameId = crypto.randomUUID();
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
  }

  // ─── Lobby ───────────────────────────────────────────────

  addPlayer(moltbook: MoltBookProfile): Player | null {
    if (this.phase !== 'lobby') return null;
    if (this.players.size >= this.settings.maxPlayers) return null;
    if (this.players.has(moltbook.id)) return null;

    const color = this.assignColor();
    if (!color) return null;

    const player: Player = {
      id: moltbook.id,
      moltbook,
      color,
      role: 'crewmate',
      alive: true,
      position: { ...SKELD_MAP.spawnPosition },
      targetPosition: null,
      currentRoom: getRoomName(SKELD_MAP.spawnPosition),
      tasks: [],
      emergencyButtonsLeft: this.settings.emergencyButtonsPerPlayer,
      lastKillAt: null,
      inVent: false,
    };

    this.players.set(moltbook.id, player);
    this.emit('player_joined', player);
    return player;
  }

  removePlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;
    this.usedColors.delete(player.color);
    this.players.delete(playerId);
  }

  private assignColor(): PlayerColor | null {
    for (const color of PLAYER_COLORS) {
      if (!this.usedColors.has(color)) {
        this.usedColors.add(color);
        return color;
      }
    }
    return null;
  }

  // ─── Game Start ──────────────────────────────────────────

  startGame(): void {
    if (this.phase !== 'lobby') return;
    if (this.players.size < 5) return;

    this.setPhase('starting', STARTING_COUNTDOWN_SEC);

    setTimeout(() => {
      if (this.phase !== 'starting') return;
      this.assignRoles();
      this.assignTasks();
      // Emit game_started AFTER tasks are assigned so clients get full task lists
      this.emit('game_started', [...this.players.values()]);
      this.beginTaskPhase();
    }, STARTING_COUNTDOWN_SEC * 1000);
  }

  private assignRoles(): void {
    const playerIds = [...this.players.keys()];
    const numImpostors = getImpostorCount(playerIds.length);

    // Shuffle and pick impostors
    const shuffled = playerIds.sort(() => Math.random() - 0.5);
    this.impostorIds = shuffled.slice(0, numImpostors);

    for (const id of this.impostorIds) {
      const player = this.players.get(id);
      if (player) player.role = 'impostor';
    }
  }

  private assignTasks(): void {
    const commonTasks = TASK_POOL.filter(t => t.type === 'common').slice(0, 2);
    const shortTasks = TASK_POOL.filter(t => t.type === 'short');
    const longTasks = TASK_POOL.filter(t => t.type === 'long');

    for (const player of this.players.values()) {
      const shuffledShort = [...shortTasks].sort(() => Math.random() - 0.5);
      const shuffledLong = [...longTasks].sort(() => Math.random() - 0.5);

      const assigned: PlayerTask[] = [
        ...commonTasks.map(t => ({
          taskId: t.id,
          name: t.name,
          room: t.room,
          type: t.type,
          completed: false,
          startedAt: null,
          durationMs: t.durationMs,
        })),
        ...shuffledShort.slice(0, 2).map(t => ({
          taskId: t.id,
          name: t.name,
          room: t.room,
          type: t.type,
          completed: false,
          startedAt: null,
          durationMs: t.durationMs,
        })),
        ...shuffledLong.slice(0, 1).map(t => ({
          taskId: t.id,
          name: t.name,
          room: t.room,
          type: t.type,
          completed: false,
          startedAt: null,
          durationMs: t.durationMs,
        })),
      ];

      player.tasks = assigned;
    }

    // Only count crewmate tasks
    const crewmates = [...this.players.values()].filter(p => p.role === 'crewmate');
    this.totalTasks = crewmates.reduce((sum, p) => sum + p.tasks.length, 0);
    this.completedTasks = 0;
  }

  // ─── Phase Management ────────────────────────────────────

  private setPhase(phase: GamePhase, timerSec: number | null = null): void {
    this.phase = phase;
    this.phaseTimerEnd = timerSec !== null ? Date.now() + timerSec * 1000 : null;
    this.emit('phase_changed', phase, timerSec);
  }

  private beginTaskPhase(): void {
    this.setPhase('tasks', null);
    this.gameTimerEnd = Date.now() + this.settings.gameTimeLimitSec * 1000;

    // Reset kill cooldown after meeting
    if (this.round > 0) {
      for (const id of this.impostorIds) {
        const p = this.players.get(id);
        if (p && p.alive) {
          p.lastKillAt = Date.now() - (this.settings.killCooldownSec - POST_MEETING_KILL_COOLDOWN_SEC) * 1000;
        }
      }
    }

    // Start tick loop
    this.startTickLoop();
  }

  private startTickLoop(): void {
    this.stopTickLoop();
    const intervalMs = 1000 / this.settings.tickRateHz;
    this.tickInterval = setInterval(() => this.tick(), intervalMs);
  }

  private stopTickLoop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  // ─── Tick Loop ───────────────────────────────────────────

  private tick(): void {
    if (this.phase !== 'tasks') return;

    this.tickCount++;
    const now = Date.now();

    // Check game timer
    if (this.gameTimerEnd && now >= this.gameTimerEnd) {
      this.endGame('impostors', 'timeout');
      return;
    }

    // Move players toward targets (every 2nd tick = 2.5 cells/sec at 5Hz)
    if (this.tickCount % 2 === 0) {
      for (const player of this.players.values()) {
        if (!player.alive || player.inVent || !player.targetPosition) continue;

        const next = getNextStep(player.position, player.targetPosition);
        if (next) {
          player.position = next;
          player.currentRoom = getRoomName(next);
          this.emit('player_moved', player.id, next);
        } else {
          player.targetPosition = null;
        }
      }
    }

    // Check task completion
    for (const player of this.players.values()) {
      if (!player.alive) continue;
      for (const task of player.tasks) {
        if (task.completed || task.startedAt === null) continue;
        if (now >= task.startedAt + task.durationMs) {
          task.completed = true;
          task.startedAt = null;
          if (player.role === 'crewmate') {
            this.completedTasks++;
            const progress = this.totalTasks > 0 ? this.completedTasks / this.totalTasks : 0;
            this.emit('task_completed', player.id, task.taskId, task.name);
            this.emit('taskbar_updated', progress);

            // Check task win
            const win = checkWinCondition(this.players, this.impostorIds, this.completedTasks, this.totalTasks);
            if (win.winner) {
              this.endGame(win.winner, win.reason);
              return;
            }
          }
        }
      }
    }

    this.emit('tick');
  }

  // ─── Agent Actions ───────────────────────────────────────

  move(playerId: string, target: Position): { accepted: boolean; error?: string } {
    if (this.phase !== 'tasks') return { accepted: false, error: 'WRONG_PHASE' };
    const player = this.players.get(playerId);
    if (!player) return { accepted: false, error: 'PLAYER_NOT_FOUND' };
    if (!player.alive) return { accepted: false, error: 'PLAYER_DEAD' };
    if (player.inVent) return { accepted: false, error: 'IN_VENT' };

    if (!isWalkable(SKELD_MAP.grid, target)) {
      return { accepted: false, error: 'INVALID_TARGET' };
    }

    player.targetPosition = target;
    return { accepted: true };
  }

  kill(killerId: string, targetId: string): { accepted: boolean; error?: string } {
    if (this.phase !== 'tasks') return { accepted: false, error: 'WRONG_PHASE' };
    const killer = this.players.get(killerId);
    const target = this.players.get(targetId);
    if (!killer) return { accepted: false, error: 'PLAYER_NOT_FOUND' };
    if (!target) return { accepted: false, error: 'TARGET_NOT_FOUND' };

    const validation = validateKill(killer, target, this.settings, Date.now());
    if (!validation.valid) return { accepted: false, error: validation.error };

    // Execute kill
    target.alive = false;
    target.targetPosition = null;
    killer.lastKillAt = Date.now();

    this.bodies.push({
      playerId: target.id,
      color: target.color,
      position: { ...target.position },
      room: target.currentRoom,
    });

    this.emit('player_killed', killerId, targetId, target.position);

    // Check win condition
    const win = checkWinCondition(this.players, this.impostorIds, this.completedTasks, this.totalTasks);
    if (win.winner) {
      this.endGame(win.winner, win.reason);
    }

    return { accepted: true };
  }

  report(reporterId: string, bodyPlayerId: string): { accepted: boolean; error?: string } {
    if (this.phase !== 'tasks') return { accepted: false, error: 'WRONG_PHASE' };
    const reporter = this.players.get(reporterId);
    if (!reporter) return { accepted: false, error: 'PLAYER_NOT_FOUND' };

    const visionRadius = reporter.role === 'impostor'
      ? this.settings.visionImpostor
      : this.settings.visionCrewmate;

    const validation = validateReport(reporter, this.bodies, bodyPlayerId, visionRadius);
    if (!validation.valid) return { accepted: false, error: validation.error };

    const body = this.bodies.find(b => b.playerId === bodyPlayerId);
    const deadPlayer = this.players.get(bodyPlayerId);

    this.callMeeting({
      trigger: 'body_reported',
      callerId: reporterId,
      callerColor: reporter.color,
      bodyPlayerId,
      bodyColor: deadPlayer?.color ?? null,
      bodyRoom: body?.room ?? null,
    });

    return { accepted: true };
  }

  emergency(playerId: string): { accepted: boolean; error?: string } {
    if (this.phase !== 'tasks') return { accepted: false, error: 'WRONG_PHASE' };
    const player = this.players.get(playerId);
    if (!player) return { accepted: false, error: 'PLAYER_NOT_FOUND' };
    if (!player.alive) return { accepted: false, error: 'PLAYER_DEAD' };
    if (player.emergencyButtonsLeft <= 0) return { accepted: false, error: 'NO_BUTTONS_LEFT' };
    if (!isNearButton(player.position)) return { accepted: false, error: 'NOT_NEAR_BUTTON' };

    if (this.meetingCooldownEnd && Date.now() < this.meetingCooldownEnd) {
      return { accepted: false, error: 'MEETING_ON_COOLDOWN' };
    }

    player.emergencyButtonsLeft--;

    this.callMeeting({
      trigger: 'emergency',
      callerId: playerId,
      callerColor: player.color,
      bodyPlayerId: null,
      bodyColor: null,
      bodyRoom: null,
    });

    return { accepted: true };
  }

  startTask(playerId: string, taskId: string): { accepted: boolean; error?: string } {
    if (this.phase !== 'tasks') return { accepted: false, error: 'WRONG_PHASE' };
    const player = this.players.get(playerId);
    if (!player) return { accepted: false, error: 'PLAYER_NOT_FOUND' };
    if (!player.alive) return { accepted: false, error: 'PLAYER_DEAD' };

    const task = player.tasks.find(t => t.taskId === taskId);
    if (!task) return { accepted: false, error: 'TASK_NOT_ASSIGNED' };
    if (task.completed) return { accepted: false, error: 'TASK_ALREADY_COMPLETED' };
    if (task.startedAt !== null) return { accepted: false, error: 'TASK_IN_PROGRESS' };

    // Check if near the right room's task station
    if (!isNearTaskStation(player.position, task.room)) {
      return { accepted: false, error: 'NOT_AT_TASK_STATION' };
    }

    // Check if already doing another task
    const activeTask = player.tasks.find(t => t.startedAt !== null && !t.completed);
    if (activeTask) return { accepted: false, error: 'ALREADY_DOING_TASK' };

    task.startedAt = Date.now();
    player.targetPosition = null; // Freeze during task

    return { accepted: true };
  }

  discuss(playerId: string, message: string, channel: 'public' | 'impostor'): { accepted: boolean; error?: string } {
    const player = this.players.get(playerId);
    if (!player) return { accepted: false, error: 'PLAYER_NOT_FOUND' };
    if (!player.alive) return { accepted: false, error: 'PLAYER_DEAD' };

    if (channel === 'impostor') {
      if (this.phase !== 'tasks') return { accepted: false, error: 'WRONG_PHASE' };
      if (player.role !== 'impostor') return { accepted: false, error: 'NOT_IMPOSTOR' };
      this.emit('impostor_chat', playerId, message.slice(0, this.settings.messageMaxLength));
      return { accepted: true };
    }

    // Public discussion
    if (this.phase !== 'discussion' && this.phase !== 'voting') {
      return { accepted: false, error: 'WRONG_PHASE' };
    }

    const count = this.messageCountPerMeeting.get(playerId) ?? 0;
    if (count >= this.settings.messagesPerMeeting) {
      return { accepted: false, error: 'MESSAGE_LIMIT_REACHED' };
    }

    const lastTime = this.lastMessageTime.get(playerId) ?? 0;
    if (Date.now() - lastTime < 3000) {
      return { accepted: false, error: 'MESSAGE_COOLDOWN' };
    }

    const msg: DiscussionMessage = {
      messageId: crypto.randomUUID(),
      playerId,
      color: player.color,
      playerName: player.moltbook.name,
      message: message.slice(0, this.settings.messageMaxLength),
      timestamp: Date.now(),
    };

    this.messages.push(msg);
    this.messageCountPerMeeting.set(playerId, count + 1);
    this.lastMessageTime.set(playerId, Date.now());
    this.emit('discussion_message', msg);

    return { accepted: true };
  }

  vote(playerId: string, target: VoteTarget): { accepted: boolean; error?: string } {
    if (this.phase !== 'voting') return { accepted: false, error: 'WRONG_PHASE' };
    const player = this.players.get(playerId);
    if (!player) return { accepted: false, error: 'PLAYER_NOT_FOUND' };
    if (!player.alive) return { accepted: false, error: 'PLAYER_DEAD' };
    if (this.votes.has(playerId)) return { accepted: false, error: 'ALREADY_VOTED' };

    if (target !== 'skip') {
      const targetPlayer = this.players.get(target);
      if (!targetPlayer || !targetPlayer.alive) {
        return { accepted: false, error: 'INVALID_VOTE_TARGET' };
      }
      if (target === playerId) {
        return { accepted: false, error: 'CANNOT_SELF_VOTE' };
      }
    }

    this.votes.set(playerId, target);
    this.emit('player_voted', playerId);

    // Check if all alive players have voted
    const aliveCount = [...this.players.values()].filter(p => p.alive).length;
    if (this.votes.size >= aliveCount) {
      this.resolveVotes();
    }

    return { accepted: true };
  }

  ventAction(playerId: string, action: 'enter' | 'move' | 'exit', targetRoom?: string): { accepted: boolean; error?: string } {
    if (this.phase !== 'tasks') return { accepted: false, error: 'WRONG_PHASE' };
    const player = this.players.get(playerId);
    if (!player) return { accepted: false, error: 'PLAYER_NOT_FOUND' };
    if (player.role !== 'impostor') return { accepted: false, error: 'NOT_IMPOSTOR' };
    if (!player.alive) return { accepted: false, error: 'PLAYER_DEAD' };

    if (action === 'enter') {
      if (player.inVent) return { accepted: false, error: 'ALREADY_IN_VENT' };
      const ventRoom = isNearVent(player.position);
      if (!ventRoom) return { accepted: false, error: 'NOT_NEAR_VENT' };
      player.inVent = true;
      player.targetPosition = null;
      return { accepted: true };
    }

    if (action === 'move') {
      if (!player.inVent) return { accepted: false, error: 'NOT_IN_VENT' };
      if (!targetRoom) return { accepted: false, error: 'TARGET_ROOM_REQUIRED' };

      const currentRoom = getRoomAtPosition(player.position);
      if (!currentRoom) return { accepted: false, error: 'ROOM_NOT_FOUND' };

      const connected = getConnectedVentRooms(currentRoom.id);
      const target = connected.find(r => r.name === targetRoom);
      if (!target || !target.ventPosition) return { accepted: false, error: 'VENT_NOT_CONNECTED' };

      player.position = { ...target.ventPosition };
      player.currentRoom = target.name;
      return { accepted: true };
    }

    if (action === 'exit') {
      if (!player.inVent) return { accepted: false, error: 'NOT_IN_VENT' };
      player.inVent = false;
      return { accepted: true };
    }

    return { accepted: false, error: 'INVALID_VENT_ACTION' };
  }

  // ─── Meeting Flow ────────────────────────────────────────

  private callMeeting(info: MeetingInfo): void {
    this.stopTickLoop();
    this.meetingInfo = info;
    this.round++;

    // Cancel all in-progress tasks
    for (const player of this.players.values()) {
      for (const task of player.tasks) {
        if (task.startedAt !== null && !task.completed) {
          task.startedAt = null;
        }
      }
      // Force impostors out of vents
      player.inVent = false;
      player.targetPosition = null;
      // Teleport everyone to spawn
      player.position = { ...SKELD_MAP.spawnPosition };
      player.currentRoom = getRoomName(SKELD_MAP.spawnPosition);
    }

    this.setPhase('meeting_called', MEETING_CALLED_FREEZE_SEC);
    this.emit('meeting_called', info);

    setTimeout(() => {
      if (this.phase !== 'meeting_called') return;
      this.beginDiscussion();
    }, MEETING_CALLED_FREEZE_SEC * 1000);
  }

  private beginDiscussion(): void {
    this.messages = [];
    this.votes.clear();
    this.messageCountPerMeeting.clear();
    this.lastMessageTime.clear();

    this.setPhase('discussion', this.settings.discussionTimeSec);

    setTimeout(() => {
      if (this.phase !== 'discussion') return;
      this.beginVoting();
    }, this.settings.discussionTimeSec * 1000);
  }

  private beginVoting(): void {
    this.setPhase('voting', this.settings.votingTimeSec);
    this.emit('voting_opened', this.settings.votingTimeSec);

    setTimeout(() => {
      if (this.phase !== 'voting') return;
      // Auto-skip for anyone who didn't vote
      for (const player of this.players.values()) {
        if (player.alive && !this.votes.has(player.id)) {
          this.votes.set(player.id, 'skip');
        }
      }
      this.resolveVotes();
    }, this.settings.votingTimeSec * 1000);
  }

  private resolveVotes(): void {
    const result = tallyVotes(this.votes, this.players, this.settings.confirmEjects);

    // Eject the player if voted out
    if (result.outcome === 'ejected' && result.ejectedPlayerId) {
      const ejected = this.players.get(result.ejectedPlayerId);
      if (ejected) {
        ejected.alive = false;
      }
    }

    this.setPhase('vote_resolution', VOTE_RESOLUTION_DISPLAY_SEC);
    this.emit('vote_result', result);

    // Check win conditions
    const win = checkWinCondition(this.players, this.impostorIds, this.completedTasks, this.totalTasks);
    if (win.winner) {
      setTimeout(() => {
        this.endGame(win.winner!, win.reason);
      }, VOTE_RESOLUTION_DISPLAY_SEC * 1000);
      return;
    }

    // Return to task phase
    setTimeout(() => {
      if (this.phase !== 'vote_resolution') return;
      this.bodies = [];
      this.meetingInfo = null;
      this.meetingCooldownEnd = Date.now() + this.settings.meetingCooldownSec * 1000;
      this.beginTaskPhase();
    }, VOTE_RESOLUTION_DISPLAY_SEC * 1000);
  }

  // ─── Game End ────────────────────────────────────────────

  private endGame(winner: 'crewmates' | 'impostors', reason: WinReason): void {
    this.stopTickLoop();
    this.winner = winner;
    this.winReason = reason;
    this.setPhase('game_over', null);

    const roles: Record<string, Role> = {};
    for (const [id, player] of this.players) {
      roles[id] = player.role;
    }

    this.emit('game_over', winner, reason, roles);
  }

  // ─── State Queries ───────────────────────────────────────

  getAliveCount(): number {
    return [...this.players.values()].filter(p => p.alive).length;
  }

  getTaskProgress(): number {
    return this.totalTasks > 0 ? this.completedTasks / this.totalTasks : 0;
  }

  getPhaseTimerRemaining(): number | null {
    if (!this.phaseTimerEnd) return null;
    return Math.max(0, Math.ceil((this.phaseTimerEnd - Date.now()) / 1000));
  }

  getGameTimerRemaining(): number | null {
    if (!this.gameTimerEnd) return null;
    return Math.max(0, Math.ceil((this.gameTimerEnd - Date.now()) / 1000));
  }

  destroy(): void {
    this.stopTickLoop();
    this.removeAllListeners();
  }
}
