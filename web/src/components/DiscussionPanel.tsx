import { useRef, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import { COLOR_MAP } from '../canvas/colors';

export function DiscussionPanel() {
  const messages = useGameStore((s) => s.messages);
  const meetingInfo = useGameStore((s) => s.meetingInfo);
  const phase = useGameStore((s) => s.phase);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const isActive = phase === 'discussion' || phase === 'voting' || phase === 'meeting_called';

  return (
    <div className={`flex flex-col h-full transition-opacity duration-300 ${isActive ? '' : 'opacity-40'}`}>
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-cyan-500/10 flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-amber-400 shadow-[0_0_4px_rgba(255,170,0,0.5)] animate-glow-pulse' : 'bg-white/20'}`} />
        <span className="hud-label">Comms Feed</span>
        {meetingInfo && (
          <span className="hud-data text-[10px] text-white/40 ml-auto truncate max-w-[120px]">
            {meetingInfo.trigger === 'body_reported'
              ? `BODY // ${meetingInfo.callerColor}`
              : `EMERGENCY // ${meetingInfo.callerColor}`
            }
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {messages.length === 0 && (
          <div className="text-center mt-6">
            <div className="hud-data text-[11px] text-white/15">
              {isActive ? '// AWAITING TRANSMISSIONS...' : '// COMMS OFFLINE'}
            </div>
          </div>
        )}
        {messages.map((msg, index) => {
          const playerColor = COLOR_MAP[msg.color] ?? '#888';
          return (
            <div
              key={msg.messageId}
              className="flex gap-2 items-start animate-fade-in-up rounded px-2 py-1.5 hover:bg-white/[0.02] transition-colors"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              {/* Color indicator bar */}
              <div
                className="w-0.5 h-full min-h-[20px] rounded-full shrink-0 mt-0.5"
                style={{ backgroundColor: playerColor, boxShadow: `0 0 4px ${playerColor}44` }}
              />
              <div className="min-w-0 flex-1">
                <span
                  className="text-[11px] font-semibold"
                  style={{ color: playerColor }}
                >
                  {msg.playerName}
                </span>
                <p className="text-[11px] text-white/70 break-words leading-relaxed font-mono">
                  {msg.message}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
