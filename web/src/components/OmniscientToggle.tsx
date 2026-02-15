import { useGameStore } from '../stores/gameStore';

export function OmniscientToggle() {
  const omniscient = useGameStore((s) => s.omniscient);
  const toggleOmniscient = useGameStore((s) => s.toggleOmniscient);

  return (
    <button
      onClick={toggleOmniscient}
      className={`relative px-3 py-1.5 rounded text-xs transition-all duration-300 ${
        omniscient
          ? 'bg-red-500/15 text-red-300 border border-red-500/30 glow-red'
          : 'bg-cyan-500/10 text-cyan-400/50 border border-cyan-500/15 hover:border-cyan-500/30 hover:text-cyan-400/70'
      }`}
    >
      <span className="font-display text-[9px] tracking-wider">
        {omniscient ? 'GOD VIEW' : 'CREW VIEW'}
      </span>
      {/* Active indicator dot */}
      <div
        className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full transition-all duration-300 ${
          omniscient
            ? 'bg-red-400 shadow-[0_0_4px_rgba(255,34,34,0.6)] animate-glow-pulse'
            : 'bg-transparent'
        }`}
      />
    </button>
  );
}
