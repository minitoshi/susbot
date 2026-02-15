import { useRef, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import { render, getCanvasSize } from '../canvas/renderer';

export function GameBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const players = useGameStore((s) => s.players);
  const bodies = useGameStore((s) => s.bodies);
  const impostorIds = useGameStore((s) => s.impostorIds);
  const omniscient = useGameStore((s) => s.omniscient);

  // Store latest values in refs for the animation loop
  const stateRef = useRef({ players, bodies, impostorIds, omniscient });
  stateRef.current = { players, bodies, impostorIds, omniscient };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = getCanvasSize();
    canvas.width = width;
    canvas.height = height;

    function frame() {
      const { players, bodies, impostorIds, omniscient } = stateRef.current;
      render(ctx!, width, height, players, bodies, impostorIds, omniscient);
      animRef.current = requestAnimationFrame(frame);
    }

    animRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div className="flex-1 overflow-auto bg-space-900 flex items-center justify-center p-2">
      <canvas
        ref={canvasRef}
        className="rounded-lg"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}
