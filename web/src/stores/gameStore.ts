import { create } from 'zustand';
import type {
  SpectatorView,
  SpectatorPlayer,
  SpectatorBody,
  DiscussionMessage,
  MeetingInfo,
  VoteTarget,
  VoteResult,
  GamePhase,
  WinReason,
  Role,
  LobbyInfo,
} from '@susbot/shared';

interface GameStore {
  // Connection
  connected: boolean;
  setConnected: (v: boolean) => void;

  // Game list
  lobbies: LobbyInfo[];
  setLobbies: (v: LobbyInfo[]) => void;

  // Active game state
  gameId: string | null;
  setGameId: (v: string | null) => void;

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

  // Spectator mode
  omniscient: boolean;
  toggleOmniscient: () => void;

  // State updates
  updateFromHeartbeat: (view: SpectatorView) => void;
  updatePlayerPosition: (playerId: string, position: { x: number; y: number }) => void;
  addMessage: (msg: DiscussionMessage) => void;
  updateVotes: (votes: Record<string, VoteTarget>) => void;
  setVoteResult: (result: VoteResult) => void;
  reset: () => void;
}

const initialState = {
  connected: false,
  lobbies: [],
  gameId: null,
  phase: 'lobby' as GamePhase,
  phaseTimerRemaining: null,
  gameTimerRemaining: null,
  players: [],
  bodies: [],
  taskBarProgress: 0,
  aliveCount: 0,
  impostorIds: [],
  messages: [],
  meetingInfo: null,
  votes: {},
  round: 0,
  winner: null,
  winReason: null,
  omniscient: true,
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setConnected: (connected) => set({ connected }),
  setLobbies: (lobbies) => set({ lobbies }),
  setGameId: (gameId) => set({ gameId }),
  toggleOmniscient: () => set((s) => ({ omniscient: !s.omniscient })),

  updateFromHeartbeat: (view) => set({
    gameId: view.gameId,
    phase: view.phase,
    phaseTimerRemaining: view.phaseTimerRemaining,
    gameTimerRemaining: view.gameTimerRemaining,
    players: view.players,
    bodies: view.bodies,
    taskBarProgress: view.taskBarProgress,
    aliveCount: view.aliveCount,
    impostorIds: view.impostorIds,
    messages: view.messages,
    meetingInfo: view.meetingInfo,
    votes: view.votes,
    round: view.round,
    winner: view.winner,
    winReason: view.winReason,
  }),

  updatePlayerPosition: (playerId, position) => set((s) => ({
    players: s.players.map(p =>
      p.playerId === playerId ? { ...p, position } : p
    ),
  })),

  addMessage: (msg) => set((s) => ({
    messages: [...s.messages, msg],
  })),

  updateVotes: (votes) => set({ votes }),

  setVoteResult: (result) => set({
    votes: result.votes,
  }),

  reset: () => set(initialState),
}));
