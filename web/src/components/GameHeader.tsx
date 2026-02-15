import { useGameStore } from '../stores/gameStore';

const PHASE_LABELS: Record<string, string> = {
  lobby: 'STANDBY',
  starting: 'INITIALIZING',
  tasks: 'MISSION ACTIVE',
  meeting_called: 'ALERT',
  discussion: 'COMMS OPEN',
  voting: 'VOTING',
  vote_resolution: 'PROCESSING',
  game_over: 'MISSION END',
};

const PHASE_COLORS: Record<string, string> = {
  lobby: 'text-cyan-400/60',
  starting: 'text-amber-400',
  tasks: 'text-green-400',
  meeting_called: 'text-red-400',
  discussion: 'text-amber-400',
  voting: 'text-red-400',
  vote_resolution: 'text-amber-400',
  game_over: 'text-white',
};

export function GameHeader() {
  const phase = useGameStore((s) => s.phase);
  const phaseTimer = useGameStore((s) => s.phaseTimerRemaining);
  const gameTimer = useGameStore((s) => s.gameTimerRemaining);
  const aliveCount = useGameStore((s) => s.aliveCount);
  const taskBarProgress = useGameStore((s) => s.taskBarProgress);
  const round = useGameStore((s) => s.round);
  const winner = useGameStore((s) => s.winner);
  const connected = useGameStore((s) => s.connected);

  const taskPct = Math.round(taskBarProgress * 100);

  return (
    <div className="hud-panel border-t-0 border-l-0 border-r-0 px-4 py-2 flex items-center gap-5">
      {/* Logo + connection */}
      <div className="flex items-center gap-2.5">
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 shadow-[0_0_6px_rgba(0,255,136,0.6)]' : 'bg-red-400 shadow-[0_0_6px_rgba(255,0,0,0.6)]'} animate-glow-pulse`} />
        <span className="font-display text-[11px] font-bold text-cyan-400/70 tracking-widest">
          SUSBOT
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-cyan-500/15" />

      {/* Phase indicator */}
      <div className="flex items-center gap-2">
        <span className={`font-display text-xs font-bold tracking-wider ${PHASE_COLORS[phase] ?? 'text-white'}`}>
          {PHASE_LABELS[phase] ?? phase}
        </span>
        {phaseTimer !== null && phaseTimer > 0 && (
          <span className="hud-data text-sm text-amber-400/90 tabular-nums animate-flicker">
            {phaseTimer}s
          </span>
        )}
      </div>

      {/* Game clock */}
      {gameTimer !== null && phase === 'tasks' && (
        <>
          <div className="w-px h-5 bg-cyan-500/15" />
          <div className="flex items-center gap-1.5">
            <span className="hud-label">Clock</span>
            <span className="hud-data text-xs text-white/50 tabular-nums">
              {Math.floor(gameTimer / 60)}:{String(gameTimer % 60).padStart(2, '0')}
            </span>
          </div>
        </>
      )}

      {/* Task progress bar */}
      <div className="flex items-center gap-2 flex-1">
        <span className="hud-label">Tasks</span>
        <div className="flex-1 max-w-[140px] h-2 rounded-full overflow-hidden relative"
          style={{
            background: 'linear-gradient(90deg, rgba(0,255,136,0.08) 0%, rgba(0,255,136,0.03) 100%)',
            border: '1px solid rgba(0,255,136,0.15)',
          }}
        >
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${taskPct}%`,
              background: 'linear-gradient(90deg, #00ff88 0%, #00cc66 100%)',
              boxShadow: '0 0 8px rgba(0,255,136,0.4)',
            }}
          />
        </div>
        <span className="hud-data text-[10px] text-green-400/60 tabular-nums w-7 text-right">
          {taskPct}%
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="hud-label">Alive</span>
          <span className="hud-data text-xs text-white/70 tabular-nums">{aliveCount}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="hud-label">RND</span>
          <span className="hud-data text-xs text-white/70 tabular-nums">{round}</span>
        </div>
      </div>

      {/* Winner announcement */}
      {winner && (
        <>
          <div className="w-px h-5 bg-cyan-500/15" />
          <span className={`font-display text-sm font-bold tracking-wide ${
            winner === 'crewmates' ? 'text-cyan-400 text-glow-cyan' : 'text-red-400 text-glow-red'
          }`}>
            {winner === 'crewmates' ? 'CREWMATES WIN' : 'IMPOSTORS WIN'}
          </span>
        </>
      )}
    </div>
  );
}
