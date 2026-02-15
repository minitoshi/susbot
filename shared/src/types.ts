// ─── Game Phases ──────────────────────────────────────────────
export type GamePhase =
  | 'lobby'
  | 'starting'
  | 'tasks'
  | 'meeting_called'
  | 'discussion'
  | 'voting'
  | 'vote_resolution'
  | 'game_over';

// ─── Roles ────────────────────────────────────────────────────
export type Role = 'crewmate' | 'impostor';

// ─── Colors (Among Us palette) ────────────────────────────────
export const PLAYER_COLORS = [
  'red', 'blue', 'green', 'pink', 'orange',
  'yellow', 'black', 'white', 'purple', 'brown',
  'cyan', 'lime',
] as const;
export type PlayerColor = typeof PLAYER_COLORS[number];

// ─── Map Types ────────────────────────────────────────────────
export type CellType = 'floor' | 'wall' | 'door' | 'task_station' | 'vent' | 'button' | 'camera';

export interface Position {
  x: number;
  y: number;
}

export interface Room {
  id: number;
  name: string;
  center: Position;
  bounds: { x: number; y: number; w: number; h: number };
  taskStations: TaskStation[];
  ventPosition: Position | null;
}

export interface TaskStation {
  position: Position;
  taskName: string;
}

export interface VentGroup {
  id: string;
  rooms: number[];
}

export interface GameMap {
  width: number;
  height: number;
  grid: CellType[][];
  rooms: Room[];
  ventGroups: VentGroup[];
  buttonPosition: Position;
  spawnPosition: Position;
}

// ─── Tasks ────────────────────────────────────────────────────
export type TaskType = 'common' | 'short' | 'long';

export interface TaskDefinition {
  id: string;
  name: string;
  room: string;
  type: TaskType;
  durationMs: number;
}

export interface PlayerTask {
  taskId: string;
  name: string;
  room: string;
  type: TaskType;
  completed: boolean;
  startedAt: number | null;
  durationMs: number;
}

// ─── Players ──────────────────────────────────────────────────
export interface MoltBookProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
  karma: number;
  isClaimed: boolean;
}

export interface Player {
  id: string;
  moltbook: MoltBookProfile;
  color: PlayerColor;
  role: Role;
  alive: boolean;
  position: Position;
  targetPosition: Position | null;
  currentRoom: string | null;
  tasks: PlayerTask[];
  emergencyButtonsLeft: number;
  lastKillAt: number | null;
  inVent: boolean;
}

// ─── Voting ───────────────────────────────────────────────────
export type VoteTarget = string | 'skip';

export interface VoteResult {
  outcome: 'ejected' | 'skipped' | 'tie';
  ejectedPlayerId: string | null;
  ejectedColor: PlayerColor | null;
  wasImpostor: boolean | null;
  votes: Record<string, VoteTarget>;
}

// ─── Meeting ──────────────────────────────────────────────────
export type MeetingTrigger = 'body_reported' | 'emergency';

export interface MeetingInfo {
  trigger: MeetingTrigger;
  callerId: string;
  callerColor: PlayerColor;
  bodyPlayerId: string | null;
  bodyColor: PlayerColor | null;
  bodyRoom: string | null;
}

export interface DiscussionMessage {
  messageId: string;
  playerId: string;
  color: PlayerColor;
  playerName: string;
  message: string;
  timestamp: number;
}

// ─── Game State ───────────────────────────────────────────────
export type WinReason =
  | 'all_tasks'
  | 'all_impostors_ejected'
  | 'impostors_majority'
  | 'timeout';

export interface GameState {
  gameId: string;
  phase: GamePhase;
  phaseTimerEnd: number | null;
  gameTimerEnd: number | null;
  players: Map<string, Player>;
  impostorIds: string[];
  taskProgress: number;
  totalTasks: number;
  completedTasks: number;
  votes: Map<string, VoteTarget>;
  messages: DiscussionMessage[];
  meetingInfo: MeetingInfo | null;
  meetingCooldownEnd: number | null;
  round: number;
  winner: 'crewmates' | 'impostors' | null;
  winReason: WinReason | null;
  createdAt: number;
}

// ─── Agent View (filtered by vision) ─────────────────────────
export interface AgentView {
  gameId: string;
  phase: GamePhase;
  phaseTimerRemaining: number | null;
  gameTimerRemaining: number | null;
  you: {
    playerId: string;
    color: PlayerColor;
    role: Role;
    alive: boolean;
    position: Position;
    currentRoom: string | null;
    tasks: PlayerTask[];
    emergencyButtonsLeft: number;
    killCooldownRemaining: number | null;
    inVent: boolean;
  };
  visiblePlayers: Array<{
    playerId: string;
    color: PlayerColor;
    name: string;
    position: Position;
    alive: boolean;
  }>;
  visibleBodies: Array<{
    playerId: string;
    color: PlayerColor;
    position: Position;
  }>;
  taskBarProgress: number;
  aliveCount: number;
  meetingCooldownRemaining: number | null;
}

// ─── Spectator View (omniscient) ──────────────────────────────
export interface SpectatorPlayer {
  playerId: string;
  name: string;
  color: PlayerColor;
  role: Role;
  alive: boolean;
  position: Position;
  currentRoom: string | null;
  inVent: boolean;
}

export interface SpectatorBody {
  playerId: string;
  color: PlayerColor;
  position: Position;
  room: string | null;
}

export interface SpectatorView {
  gameId: string;
  phase: GamePhase;
  phaseTimerRemaining: number | null;
  gameTimerRemaining: number | null;
  players: SpectatorPlayer[];
  bodies: SpectatorBody[];
  taskBarProgress: number;
  aliveCount: number;
  impostorIds: string[];
  messages: DiscussionMessage[];
  meetingInfo: MeetingInfo | null;
  votes: Record<string, VoteTarget>;
  round: number;
  winner: 'crewmates' | 'impostors' | null;
  winReason: WinReason | null;
}

// ─── Game Actions (agent → server) ───────────────────────────
export type GameAction =
  | { type: 'move'; target: Position }
  | { type: 'kill'; targetPlayerId: string }
  | { type: 'report'; bodyPlayerId: string }
  | { type: 'emergency' }
  | { type: 'task'; taskId: string }
  | { type: 'discuss'; message: string; channel: 'public' | 'impostor' }
  | { type: 'vote'; targetPlayerId: VoteTarget }
  | { type: 'vent'; action: 'enter' | 'move' | 'exit'; targetRoom?: string };

// ─── Action Results ──────────────────────────────────────────
export interface ActionResult {
  accepted: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

// ─── Lobby Info (for browser) ────────────────────────────────
export interface LobbyInfo {
  gameId: string;
  phase: GamePhase;
  playerCount: number;
  maxPlayers: number;
  createdAt: number;
  players: Array<{
    name: string;
    color: PlayerColor;
  }>;
}

// ─── Game Settings ───────────────────────────────────────────
export interface GameSettings {
  maxPlayers: number;
  numImpostors: number;
  discussionTimeSec: number;
  votingTimeSec: number;
  killCooldownSec: number;
  killRange: number;
  visionCrewmate: number;
  visionImpostor: number;
  meetingCooldownSec: number;
  emergencyButtonsPerPlayer: number;
  messagesPerMeeting: number;
  messageMaxLength: number;
  gameTimeLimitSec: number;
  confirmEjects: boolean;
  tasksPerPlayer: number;
  tickRateHz: number;
  playerSpeed: number;
}
