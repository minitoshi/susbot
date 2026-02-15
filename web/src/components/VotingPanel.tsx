import { useGameStore } from '../stores/gameStore';
import { COLOR_MAP } from '../canvas/colors';

export function VotingPanel() {
  const phase = useGameStore((s) => s.phase);
  const votes = useGameStore((s) => s.votes);
  const players = useGameStore((s) => s.players);

  if (phase !== 'voting' && phase !== 'vote_resolution') return null;

  const alivePlayers = players.filter((p) => p.alive);
  const voteCounts = new Map<string, number>();
  let skipCount = 0;

  for (const target of Object.values(votes)) {
    if (target === 'skip') {
      skipCount++;
    } else {
      voteCounts.set(target, (voteCounts.get(target) ?? 0) + 1);
    }
  }

  const maxVotes = Math.max(skipCount, ...voteCounts.values(), 1);

  return (
    <div className="px-3 py-2.5 border-t border-cyan-500/10">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-1.5 h-1.5 rounded-full ${phase === 'voting' ? 'bg-red-400 shadow-[0_0_4px_rgba(255,0,0,0.5)] animate-glow-pulse' : 'bg-amber-400'}`} />
        <span className="hud-label">
          {phase === 'voting' ? 'Voting Active' : 'Results'}
        </span>
      </div>

      {/* Vote bars */}
      <div className="space-y-1.5">
        {alivePlayers.map((p) => {
          const voteCount = voteCounts.get(p.playerId) ?? 0;
          const hasVoted = Object.keys(votes).includes(p.playerId);
          const barWidth = maxVotes > 0 ? (voteCount / maxVotes) * 100 : 0;
          const playerColor = COLOR_MAP[p.color] ?? '#888';

          return (
            <div key={p.playerId} className="flex items-center gap-2 text-xs group">
              {/* Color dot */}
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor: playerColor,
                  boxShadow: voteCount > 0 ? `0 0 4px ${playerColor}66` : 'none',
                }}
              />

              {/* Name + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-white/60 truncate text-[11px]">{p.name}</span>
                  <div className="flex items-center gap-1.5">
                    {hasVoted && (
                      <span className="hud-data text-[9px] text-green-400/40">CAST</span>
                    )}
                    {voteCount > 0 && (
                      <span className="hud-data text-[11px] text-white/80 tabular-nums w-3 text-right">
                        {voteCount}
                      </span>
                    )}
                  </div>
                </div>
                {/* Vote bar */}
                <div className="h-1 rounded-full overflow-hidden bg-white/5">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: playerColor,
                      boxShadow: voteCount > 0 ? `0 0 6px ${playerColor}66` : 'none',
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {/* Skip votes */}
        <div className="flex items-center gap-2 text-xs pt-1.5 border-t border-cyan-500/5">
          <div className="w-2.5 h-2.5 rounded-full bg-white/15 shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-white/30 text-[11px] font-mono">SKIP</span>
              <span className="hud-data text-[11px] text-white/50 tabular-nums w-3 text-right">
                {skipCount}
              </span>
            </div>
            <div className="h-1 rounded-full overflow-hidden bg-white/5">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out bg-white/20"
                style={{ width: `${maxVotes > 0 ? (skipCount / maxVotes) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
