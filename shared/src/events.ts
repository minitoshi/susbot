import type {
  Position,
  PlayerColor,
  Role,
  GamePhase,
  PlayerTask,
  DiscussionMessage,
  VoteResult,
  WinReason,
  SpectatorView,
  LobbyInfo,
} from './types.js';

// ─── Server → Agent Events ───────────────────────────────────

export interface GameStartingEvent {
  countdown: number;
  players: Array<{ playerId: string; color: PlayerColor; name: string }>;
}

export interface RoleAssignedEvent {
  role: Role;
  tasks: PlayerTask[];
  fellowImpostors: Array<{ playerId: string; color: PlayerColor; name: string }> | null;
}

export interface PhaseChangedEvent {
  phase: GamePhase;
  timerSec: number | null;
}

export interface PlayerMovedEvent {
  playerId: string;
  color: PlayerColor;
  position: Position;
}

export interface PlayerKilledEvent {
  victimId: string;
  victimColor: PlayerColor;
  location: Position;
  killerId: string | null;
  killerColor: PlayerColor | null;
}

export interface BodyAppearedEvent {
  bodyPlayerId: string;
  color: PlayerColor;
  position: Position;
}

export interface MeetingCalledEvent {
  trigger: 'body_reported' | 'emergency';
  callerId: string;
  callerColor: PlayerColor;
  bodyPlayerId: string | null;
  bodyColor: PlayerColor | null;
  bodyRoom: string | null;
}

export interface VotingOpenedEvent {
  timerSec: number;
  alivePlayers: Array<{ playerId: string; color: PlayerColor }>;
}

export interface PlayerVotedEvent {
  playerId: string;
  color: PlayerColor;
}

export interface TaskCompletedEvent {
  taskId: string;
  taskName: string;
}

export interface TaskBarUpdatedEvent {
  progress: number;
}

export interface GameOverEvent {
  winner: 'crewmates' | 'impostors';
  reason: WinReason;
  roles: Record<string, Role>;
}

export interface ImpostorChatEvent {
  playerId: string;
  color: PlayerColor;
  name: string;
  message: string;
}

export interface YouKilledEvent {
  killerId: string;
  killerColor: PlayerColor;
}

// ─── Event Map ───────────────────────────────────────────────

export interface ServerToAgentEvents {
  'game:starting': (data: GameStartingEvent) => void;
  'game:role_assigned': (data: RoleAssignedEvent) => void;
  'game:phase_changed': (data: PhaseChangedEvent) => void;
  'player:moved': (data: PlayerMovedEvent) => void;
  'player:killed': (data: PlayerKilledEvent) => void;
  'body:appeared': (data: BodyAppearedEvent) => void;
  'meeting:called': (data: MeetingCalledEvent) => void;
  'discussion:message': (data: DiscussionMessage) => void;
  'voting:opened': (data: VotingOpenedEvent) => void;
  'voting:player_voted': (data: PlayerVotedEvent) => void;
  'vote:result': (data: VoteResult) => void;
  'task:completed': (data: TaskCompletedEvent) => void;
  'taskbar:updated': (data: TaskBarUpdatedEvent) => void;
  'game:over': (data: GameOverEvent) => void;
  'impostor:chat': (data: ImpostorChatEvent) => void;
  'you:killed': (data: YouKilledEvent) => void;
  'error': (data: { message: string; code: string }) => void;
}

// ─── Server → Spectator Events ───────────────────────────────

export interface SpectatorKillEvent {
  killerId: string;
  killerColor: PlayerColor;
  victimId: string;
  victimColor: PlayerColor;
  location: Position;
}

export interface PlayerVentedEvent {
  playerId: string;
  color: PlayerColor;
  action: 'enter' | 'move' | 'exit';
  room: string;
}

export interface ServerToSpectatorEvents {
  'game:starting': (data: GameStartingEvent) => void;
  'game:roles_assigned': (data: { roles: Record<string, Role> }) => void;
  'game:phase_changed': (data: PhaseChangedEvent) => void;
  'player:moved': (data: PlayerMovedEvent) => void;
  'player:killed': (data: SpectatorKillEvent) => void;
  'player:vented': (data: PlayerVentedEvent) => void;
  'meeting:called': (data: MeetingCalledEvent) => void;
  'discussion:message': (data: DiscussionMessage) => void;
  'impostor:chat': (data: ImpostorChatEvent) => void;
  'voting:opened': (data: VotingOpenedEvent) => void;
  'voting:player_voted': (data: PlayerVotedEvent) => void;
  'vote:result': (data: VoteResult) => void;
  'taskbar:updated': (data: TaskBarUpdatedEvent) => void;
  'game:over': (data: GameOverEvent) => void;
  'heartbeat:state': (data: SpectatorView) => void;
  'lobby:updated': (data: LobbyInfo) => void;
}

// ─── Agent → Server Events (WebSocket actions) ───────────────

export interface AgentToServerEvents {
  'action:move': (data: { target: Position }, cb: (result: { accepted: boolean; error?: string }) => void) => void;
  'action:kill': (data: { targetPlayerId: string }, cb: (result: { accepted: boolean; error?: string }) => void) => void;
  'action:report': (data: { bodyPlayerId: string }, cb: (result: { accepted: boolean; error?: string }) => void) => void;
  'action:emergency': (data: Record<string, never>, cb: (result: { accepted: boolean; error?: string }) => void) => void;
  'action:task': (data: { taskId: string }, cb: (result: { accepted: boolean; error?: string }) => void) => void;
  'action:discuss': (data: { message: string; channel: 'public' | 'impostor' }, cb: (result: { accepted: boolean; error?: string }) => void) => void;
  'action:vote': (data: { targetPlayerId: string }, cb: (result: { accepted: boolean; error?: string }) => void) => void;
  'action:vent': (data: { action: 'enter' | 'move' | 'exit'; targetRoom?: string }, cb: (result: { accepted: boolean; error?: string }) => void) => void;
}
