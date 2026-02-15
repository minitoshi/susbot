import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { SpectatorView, DiscussionMessage, VoteResult } from '@susbot/shared';
import { useGameStore } from '../stores/gameStore';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? '';

export function useGameSocket(gameId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const {
    setConnected,
    updateFromHeartbeat,
    updatePlayerPosition,
    addMessage,
    setVoteResult,
  } = useGameStore();

  useEffect(() => {
    if (!gameId) return;

    const socket = io(`${SERVER_URL}/spectate`, {
      query: { gameId },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // Full state sync (1Hz)
    socket.on('heartbeat:state', (data: SpectatorView) => {
      updateFromHeartbeat(data);
    });

    // Per-tick position updates (5Hz per player)
    socket.on('player:moved', (data: { playerId: string; position: { x: number; y: number } }) => {
      updatePlayerPosition(data.playerId, data.position);
    });

    socket.on('discussion:message', (msg: DiscussionMessage) => {
      addMessage(msg);
    });

    socket.on('vote:result', (result: VoteResult) => {
      setVoteResult(result);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [gameId]);

  return socketRef;
}
