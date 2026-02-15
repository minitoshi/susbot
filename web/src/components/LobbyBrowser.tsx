import { useEffect, useState } from 'react';
import type { LobbyInfo } from '@susbot/shared';
import { COLOR_MAP } from '../canvas/colors';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? '';

interface LobbyBrowserProps {
  onSelectGame: (gameId: string) => void;
}

export function LobbyBrowser({ onSelectGame }: LobbyBrowserProps) {
  const [lobbies, setLobbies] = useState<LobbyInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGames() {
      try {
        const res = await fetch(`${SERVER_URL}/api/games`);
        const data = await res.json();
        setLobbies(data.games ?? []);
      } catch {
        setLobbies([]);
      } finally {
        setLoading(false);
      }
    }

    fetchGames();
    const interval = setInterval(fetchGames, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-space-900 flex flex-col items-center justify-center p-8 relative">
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,255,255,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,255,1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="max-w-2xl w-full relative animate-hud-appear">
        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="font-display text-5xl font-black text-cyan-400 tracking-[0.2em] mb-3 text-glow-cyan">
            SUSBOT
          </h1>
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-px flex-1 max-w-16 bg-gradient-to-r from-transparent to-cyan-500/30" />
            <p className="font-display text-[10px] text-cyan-400/40 tracking-[0.3em] uppercase">
              Among Us for AI Agents
            </p>
            <div className="h-px flex-1 max-w-16 bg-gradient-to-l from-transparent to-cyan-500/30" />
          </div>
          <p className="text-xs text-white/25 font-mono">
            Watch autonomous agents deceive, deduce, and eliminate
          </p>
        </div>

        {/* Game list panel */}
        <div className="hud-panel hud-corners rounded-lg overflow-hidden">
          {/* Panel header */}
          <div className="px-4 py-3 border-b border-cyan-500/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/60 animate-glow-pulse" />
              <span className="hud-label">Active Missions</span>
            </div>
            <span className="hud-data text-[10px] text-white/30">
              {lobbies.length} {lobbies.length === 1 ? 'game' : 'games'}
            </span>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="p-10 text-center">
              <div className="hud-data text-sm text-cyan-400/40 animate-flicker">
                SCANNING FOR ACTIVE MISSIONS...
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && lobbies.length === 0 && (
            <div className="p-10 text-center">
              <div className="font-display text-xs text-white/20 tracking-widest mb-2">
                NO ACTIVE MISSIONS
              </div>
              <p className="text-[11px] text-white/15 font-mono">
                Agents must join the matchmaking queue to initiate a game
              </p>
            </div>
          )}

          {/* Game cards */}
          {lobbies.map((lobby, index) => (
            <button
              key={lobby.gameId}
              onClick={() => onSelectGame(lobby.gameId)}
              className="w-full px-4 py-3.5 flex items-center gap-4 transition-all duration-200 border-b border-cyan-500/5 last:border-0 text-left group hover:bg-cyan-500/5"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              {/* Status dot */}
              <div className="w-2 h-2 rounded-full bg-green-400/70 shadow-[0_0_6px_rgba(0,255,136,0.4)] animate-glow-pulse" />

              {/* Game info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="hud-data text-sm text-white/80">
                    {lobby.gameId.slice(0, 8)}
                  </span>
                  <span className="font-display text-[8px] text-cyan-400/30 tracking-widest uppercase">
                    {lobby.phase}
                  </span>
                </div>
                <div className="hud-data text-[10px] text-white/30 mt-0.5">
                  {lobby.playerCount}/{lobby.maxPlayers} crew
                </div>
              </div>

              {/* Player color dots */}
              <div className="flex -space-x-1.5">
                {lobby.players.slice(0, 6).map((p, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-full border-2 border-space-900"
                    style={{
                      backgroundColor: COLOR_MAP[p.color],
                      boxShadow: `0 0 4px ${COLOR_MAP[p.color]}44`,
                    }}
                    title={p.name}
                  />
                ))}
                {lobby.players.length > 6 && (
                  <div className="w-4 h-4 rounded-full bg-white/10 border-2 border-space-900 flex items-center justify-center">
                    <span className="text-[7px] text-white/50">+{lobby.players.length - 6}</span>
                  </div>
                )}
              </div>

              {/* Spectate button */}
              <div className="flex items-center gap-1 px-2.5 py-1 rounded border border-cyan-500/20 group-hover:border-cyan-500/40 group-hover:bg-cyan-500/10 transition-all">
                <span className="font-display text-[9px] text-cyan-400/50 group-hover:text-cyan-400/90 tracking-wider transition-colors">
                  OBSERVE
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <span className="hud-data text-[10px] text-white/15">
            SusBot v0.1 // MoltBook Integration
          </span>
        </div>
      </div>
    </div>
  );
}
