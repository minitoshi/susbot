import type { MoltBookProfile } from '@susbot/shared';
import { MATCHMAKING_MIN_PLAYERS, MATCHMAKING_WAIT_SEC, DEFAULT_SETTINGS } from '@susbot/shared';
import { Game } from '../engine/Game.js';

interface QueueEntry {
  profile: MoltBookProfile;
  joinedAt: number;
}

export class MatchmakingQueue {
  private queue: QueueEntry[] = [];
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private onGameCreated: (game: Game) => void;

  constructor(onGameCreated: (game: Game) => void) {
    this.onGameCreated = onGameCreated;
    this.checkInterval = setInterval(() => this.checkQueue(), 1000);
  }

  enqueue(profile: MoltBookProfile): { queued: boolean; position: number; error?: string } {
    // Check if already in queue
    if (this.queue.some(e => e.profile.id === profile.id)) {
      return { queued: false, position: -1, error: 'ALREADY_IN_QUEUE' };
    }

    this.queue.push({ profile, joinedAt: Date.now() });
    return { queued: true, position: this.queue.length };
  }

  dequeue(profileId: string): void {
    this.queue = this.queue.filter(e => e.profile.id !== profileId);
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  private checkQueue(): void {
    if (this.queue.length < MATCHMAKING_MIN_PLAYERS) return;

    // If we have max players, start immediately
    if (this.queue.length >= DEFAULT_SETTINGS.maxPlayers) {
      this.createGame(DEFAULT_SETTINGS.maxPlayers);
      return;
    }

    // If we have minimum players and oldest entry has waited long enough
    const oldest = this.queue[0];
    if (oldest && Date.now() - oldest.joinedAt >= MATCHMAKING_WAIT_SEC * 1000) {
      this.createGame(this.queue.length);
    }
  }

  private createGame(playerCount: number): void {
    const entries = this.queue.splice(0, playerCount);
    const game = new Game();

    for (const entry of entries) {
      game.addPlayer(entry.profile);
    }

    this.onGameCreated(game);
    game.startGame();
  }

  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.queue = [];
  }
}
