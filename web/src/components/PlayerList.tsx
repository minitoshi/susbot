import { useGameStore } from '../stores/gameStore';
import { COLOR_MAP, IMPOSTOR_GLOW } from '../canvas/colors';

export function PlayerList() {
  const players = useGameStore((s) => s.players);
  const impostorIds = useGameStore((s) => s.impostorIds);
  const omniscient = useGameStore((s) => s.omniscient);

  const sorted = [...players].sort((a, b) => {
    if (a.alive !== b.alive) return a.alive ? -1 : 1;
    return 0;
  });

  return (
    <div className="space-y-0.5">
      {sorted.map((p) => {
        const isImpostor = impostorIds.includes(p.playerId);
        const playerColor = COLOR_MAP[p.color] ?? '#888';

        return (
          <div
            key={p.playerId}
            className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-all duration-200 ${
              p.alive
                ? 'bg-white/[0.03] hover:bg-white/[0.06]'
                : 'opacity-30'
            } ${omniscient && isImpostor && p.alive ? 'border border-red-500/15' : ''}`}
            style={{
              boxShadow: omniscient && isImpostor && p.alive
                ? `inset 0 0 12px rgba(255,34,34,0.05)`
                : 'none',
            }}
          >
            {/* Player color dot with glow */}
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{
                backgroundColor: playerColor,
                boxShadow: p.alive
                  ? `0 0 6px ${playerColor}44${omniscient && isImpostor ? `, 0 0 8px ${IMPOSTOR_GLOW}55` : ''}`
                  : 'none',
              }}
            />

            {/* Name */}
            <span className={`flex-1 truncate ${p.alive ? 'text-white/80' : 'text-white/40 line-through'}`}>
              {p.name}
            </span>

            {/* Status badges */}
            <div className="flex items-center gap-1">
              {!p.alive && (
                <span className="hud-data text-[9px] text-red-400/60 tracking-wider">DEAD</span>
              )}
              {omniscient && isImpostor && p.alive && (
                <span className="hud-data text-[9px] text-red-400 font-bold tracking-wider text-glow-red">
                  IMP
                </span>
              )}
              {p.inVent && omniscient && (
                <span className="hud-data text-[9px] text-green-400/60 tracking-wider">VENT</span>
              )}
              {p.currentRoom && p.alive && (
                <span className="hud-data text-[9px] text-cyan-400/25 truncate max-w-[55px]">
                  {p.currentRoom}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
