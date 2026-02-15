import type { Player, VoteTarget, VoteResult, GameSettings } from '@susbot/shared';
import { distance } from './map.js';

// ─── Kill Validation ─────────────────────────────────────────

export interface KillValidation {
  valid: boolean;
  error?: string;
}

export function validateKill(
  killer: Player,
  target: Player,
  settings: GameSettings,
  now: number,
): KillValidation {
  if (killer.role !== 'impostor') {
    return { valid: false, error: 'NOT_IMPOSTOR' };
  }
  if (!killer.alive) {
    return { valid: false, error: 'KILLER_DEAD' };
  }
  if (!target.alive) {
    return { valid: false, error: 'TARGET_DEAD' };
  }
  if (target.role === 'impostor') {
    return { valid: false, error: 'CANNOT_KILL_IMPOSTOR' };
  }
  if (killer.inVent) {
    return { valid: false, error: 'IN_VENT' };
  }
  if (target.inVent) {
    return { valid: false, error: 'TARGET_IN_VENT' };
  }

  const dist = distance(killer.position, target.position);
  if (dist > settings.killRange) {
    return { valid: false, error: 'TARGET_NOT_IN_RANGE' };
  }

  if (killer.lastKillAt !== null) {
    const cooldownEnd = killer.lastKillAt + settings.killCooldownSec * 1000;
    if (now < cooldownEnd) {
      return { valid: false, error: 'KILL_ON_COOLDOWN' };
    }
  }

  return { valid: true };
}

// ─── Vote Tallying ───────────────────────────────────────────

export function tallyVotes(
  votes: Map<string, VoteTarget>,
  players: Map<string, Player>,
  confirmEjects: boolean,
): VoteResult {
  const counts = new Map<string, number>();
  let skipCount = 0;

  for (const [_voterId, target] of votes) {
    if (target === 'skip') {
      skipCount++;
    } else {
      counts.set(target, (counts.get(target) ?? 0) + 1);
    }
  }

  // Find the player with the most votes
  let maxVotes = 0;
  let maxPlayerId: string | null = null;
  let isTied = false;

  for (const [playerId, count] of counts) {
    if (count > maxVotes) {
      maxVotes = count;
      maxPlayerId = playerId;
      isTied = false;
    } else if (count === maxVotes) {
      isTied = true;
    }
  }

  // Convert votes map to record for the result
  const voteRecord: Record<string, VoteTarget> = {};
  for (const [voterId, target] of votes) {
    voteRecord[voterId] = target;
  }

  // Tie = skip
  if (isTied || maxPlayerId === null || skipCount >= maxVotes) {
    return {
      outcome: skipCount > maxVotes ? 'skipped' : isTied ? 'tie' : 'skipped',
      ejectedPlayerId: null,
      ejectedColor: null,
      wasImpostor: null,
      votes: voteRecord,
    };
  }

  // Eject the player
  const ejectedPlayer = players.get(maxPlayerId);
  return {
    outcome: 'ejected',
    ejectedPlayerId: maxPlayerId,
    ejectedColor: ejectedPlayer?.color ?? null,
    wasImpostor: confirmEjects ? (ejectedPlayer ? (ejectedPlayer.role === 'impostor') : null) : null,
    votes: voteRecord,
  };
}

// ─── Win Conditions ──────────────────────────────────────────

export type WinCheck =
  | { winner: null }
  | { winner: 'crewmates'; reason: 'all_tasks' | 'all_impostors_ejected' }
  | { winner: 'impostors'; reason: 'impostors_majority' | 'timeout' };

export function checkWinCondition(
  players: Map<string, Player>,
  _impostorIds: string[],
  completedTasks: number,
  totalTasks: number,
): WinCheck {
  const aliveCrewmates = [...players.values()].filter(p => p.alive && p.role === 'crewmate').length;
  const aliveImpostors = [...players.values()].filter(p => p.alive && p.role === 'impostor').length;

  // All impostors ejected/killed
  if (aliveImpostors === 0) {
    return { winner: 'crewmates', reason: 'all_impostors_ejected' };
  }

  // Impostors outnumber or equal crewmates
  if (aliveImpostors >= aliveCrewmates) {
    return { winner: 'impostors', reason: 'impostors_majority' };
  }

  // All tasks completed
  if (totalTasks > 0 && completedTasks >= totalTasks) {
    return { winner: 'crewmates', reason: 'all_tasks' };
  }

  return { winner: null };
}

// ─── Report Validation ───────────────────────────────────────

export function validateReport(
  reporter: Player,
  bodies: Array<{ playerId: string; position: Position }>,
  bodyPlayerId: string,
  visionRadius: number,
): { valid: boolean; error?: string } {
  if (!reporter.alive) {
    return { valid: false, error: 'REPORTER_DEAD' };
  }

  const body = bodies.find(b => b.playerId === bodyPlayerId);
  if (!body) {
    return { valid: false, error: 'BODY_NOT_FOUND' };
  }

  if (distance(reporter.position, body.position) > visionRadius) {
    return { valid: false, error: 'BODY_NOT_VISIBLE' };
  }

  return { valid: true };
}

interface Position {
  x: number;
  y: number;
}
