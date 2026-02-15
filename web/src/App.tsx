import { useState } from 'react';
import { useGameSocket } from './hooks/useGameSocket';
import { useGameStore } from './stores/gameStore';
import { GameBoard } from './components/GameBoard';
import { GameHeader } from './components/GameHeader';
import { DiscussionPanel } from './components/DiscussionPanel';
import { VotingPanel } from './components/VotingPanel';
import { PlayerList } from './components/PlayerList';
import { OmniscientToggle } from './components/OmniscientToggle';
import { LobbyBrowser } from './components/LobbyBrowser';

export function App() {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  useGameSocket(selectedGameId);

  if (!selectedGameId) {
    return (
      <>
        <div className="scanline-overlay" />
        <LobbyBrowser onSelectGame={setSelectedGameId} />
      </>
    );
  }

  return (
    <>
      <div className="scanline-overlay" />
      <div className="h-screen flex flex-col bg-space-900 overflow-hidden">
        <GameHeader />

        <div className="flex-1 flex overflow-hidden">
          {/* Main game area */}
          <GameBoard />

          {/* Right sidebar — HUD panel */}
          <div className="w-80 flex flex-col hud-panel border-l border-t-0 border-r-0 border-b-0">
            {/* Controls bar */}
            <div className="px-3 py-2.5 border-b border-cyan-500/10 flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedGameId(null);
                  useGameStore.getState().reset();
                }}
                className="flex items-center gap-1.5 text-xs text-cyan-400/40 hover:text-cyan-400/80 transition-colors font-mono"
              >
                <span className="text-[10px]">&laquo;</span>
                <span>EXIT</span>
              </button>
              <OmniscientToggle />
            </div>

            {/* Player list */}
            <div className="px-2 py-2.5 border-b border-cyan-500/10">
              <div className="hud-label px-2 mb-1.5">Crew Manifest</div>
              <PlayerList />
            </div>

            {/* Discussion + Voting */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <DiscussionPanel />
              <VotingPanel />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
