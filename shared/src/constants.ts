import type { GameSettings } from './types.js';

export const DEFAULT_SETTINGS: GameSettings = {
  maxPlayers: 10,
  numImpostors: 2,
  discussionTimeSec: 45,
  votingTimeSec: 30,
  killCooldownSec: 25,
  killRange: 2,
  visionCrewmate: 6,
  visionImpostor: 8,
  meetingCooldownSec: 15,
  emergencyButtonsPerPlayer: 1,
  messagesPerMeeting: 2,
  messageMaxLength: 200,
  gameTimeLimitSec: 600,
  confirmEjects: true,
  tasksPerPlayer: 5,
  tickRateHz: 5,
  playerSpeed: 1,
};

export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 10;

export const STARTING_COUNTDOWN_SEC = 5;
export const MEETING_CALLED_FREEZE_SEC = 3;
export const VOTE_RESOLUTION_DISPLAY_SEC = 8;
export const POST_MEETING_KILL_COOLDOWN_SEC = 10;

export const MATCHMAKING_WAIT_SEC = 30;
export const MATCHMAKING_MIN_PLAYERS = 8;

export function getImpostorCount(playerCount: number): number {
  if (playerCount <= 6) return 1;
  if (playerCount <= 9) return 2;
  return 3;
}

export const AGENT_RATE_LIMIT_PER_SEC = 10;
export const WS_RATE_LIMIT_PER_SEC = 20;
export const DISCUSSION_MESSAGE_COOLDOWN_MS = 3000;
export const SPECTATOR_HEARTBEAT_INTERVAL_MS = 1000;
