import type { SpectatorPlayer, SpectatorBody } from '@susbot/shared';
import { SKELD_MAP, ROOMS } from '@susbot/shared';
import { COLOR_MAP, BG_COLOR, STAR_COLOR, IMPOSTOR_GLOW, BODY_COLOR } from './colors';

const CELL_SIZE = 22;
const PADDING = 80;

// ─── Map Image ──────────────────────────────────────────────

let mapImage: HTMLImageElement | null = null;
let mapImageLoaded = false;

function loadMapImage(): void {
  if (mapImage) return;
  mapImage = new Image();
  mapImage.onload = () => { mapImageLoaded = true; };
  mapImage.src = '/skeld-map.png';
}

// ─── Star Field ─────────────────────────────────────────────

interface Star { x: number; y: number; size: number; brightness: number }
let stars: Star[] | null = null;

function generateStars(w: number, h: number): Star[] {
  const result: Star[] = [];
  const count = Math.floor((w * h) / 2000);
  for (let i = 0; i < count; i++) {
    result.push({
      x: Math.random() * w,
      y: Math.random() * h,
      size: 0.4 + Math.random() * 1.8,
      brightness: 0.2 + Math.random() * 0.8,
    });
  }
  return result;
}

// ─── Interpolation (Path Queue) ─────────────────────────────
//
// Instead of LERPing in a straight line (which cuts through walls),
// we queue each position update and advance through the queue
// one step at a time. This makes the visual path follow the
// actual A* path along corridors.

interface InterpolatedPlayer {
  playerId: string;
  displayX: number;
  displayY: number;
  // Queue of positions to move through
  queue: { x: number; y: number }[];
  // Last known server position (to detect new targets)
  lastServerX: number;
  lastServerY: number;
}

const interpolated = new Map<string, InterpolatedPlayer>();
// Speed: cells per frame at 60fps. At 2.5 cells/sec server speed,
// we want to move ~2.5/60 = 0.042 cells/frame, but a bit faster
// so the display catches up between ticks.
const MOVE_SPEED = 0.07;
const SNAP_THRESHOLD = 0.05;

function updateInterpolation(players: SpectatorPlayer[]): void {
  for (const p of players) {
    const existing = interpolated.get(p.playerId);
    if (existing) {
      // If server position changed, enqueue the new position
      if (p.position.x !== existing.lastServerX || p.position.y !== existing.lastServerY) {
        existing.lastServerX = p.position.x;
        existing.lastServerY = p.position.y;
        // Only enqueue if different from the last queued position
        const last = existing.queue.length > 0
          ? existing.queue[existing.queue.length - 1]!
          : { x: existing.displayX, y: existing.displayY };
        if (p.position.x !== Math.round(last.x) || p.position.y !== Math.round(last.y)) {
          existing.queue.push({ x: p.position.x, y: p.position.y });
        }
        // Prevent queue from growing too large (teleport if way behind)
        if (existing.queue.length > 8) {
          const teleportTo = existing.queue[existing.queue.length - 1]!;
          existing.displayX = teleportTo.x;
          existing.displayY = teleportTo.y;
          existing.queue = [];
        }
      }

      // Advance display position through the queue
      if (existing.queue.length > 0) {
        const next = existing.queue[0]!;
        const dx = next.x - existing.displayX;
        const dy = next.y - existing.displayY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < SNAP_THRESHOLD) {
          // Close enough — snap and move to next in queue
          existing.displayX = next.x;
          existing.displayY = next.y;
          existing.queue.shift();
        } else {
          // Move toward the current queue target at fixed speed
          // Move faster if queue is backing up
          const speed = MOVE_SPEED * (1 + existing.queue.length * 0.3);
          const step = Math.min(speed, dist);
          existing.displayX += (dx / dist) * step;
          existing.displayY += (dy / dist) * step;
        }
      }
    } else {
      interpolated.set(p.playerId, {
        playerId: p.playerId,
        displayX: p.position.x,
        displayY: p.position.y,
        queue: [],
        lastServerX: p.position.x,
        lastServerY: p.position.y,
      });
    }
  }
  // Remove players no longer in the game
  for (const [id] of interpolated) {
    if (!players.find(pp => pp.playerId === id)) {
      interpolated.delete(id);
    }
  }
}

// ─── Main Render ────────────────────────────────────────────

export function render(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  players: SpectatorPlayer[],
  bodies: SpectatorBody[],
  impostorIds: string[],
  omniscient: boolean,
): void {
  loadMapImage();
  updateInterpolation(players);

  if (!stars) stars = generateStars(width, height);

  // Dark space background
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, width, height);

  // Twinkling stars
  drawStars(ctx, width, height);

  // Center the map
  const mapPixelW = SKELD_MAP.width * CELL_SIZE;
  const mapPixelH = SKELD_MAP.height * CELL_SIZE;
  const offsetX = Math.max(0, (width - mapPixelW) / 2);
  const offsetY = Math.max(0, (height - mapPixelH) / 2);

  ctx.save();
  ctx.translate(offsetX, offsetY);

  // Draw the map background image
  drawMapBackground(ctx, mapPixelW, mapPixelH);

  // Game overlays
  drawBodies(ctx, bodies);
  drawPlayers(ctx, players, impostorIds, omniscient);
  drawRoomLabels(ctx);

  ctx.restore();
}

// ─── Stars ──────────────────────────────────────────────────

function drawStars(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  if (!stars) return;
  const time = Date.now() / 4000;
  for (const star of stars) {
    const twinkle = star.brightness * (0.6 + 0.4 * Math.sin(time * 2 + star.x * 0.05 + star.y * 0.03));
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = STAR_COLOR;
    ctx.beginPath();
    ctx.arc(star.x % w, star.y % h, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ─── Map Background Image ────────────────────────────────────

function drawMapBackground(ctx: CanvasRenderingContext2D, mapW: number, mapH: number): void {
  if (!mapImage || !mapImageLoaded) {
    // Dark placeholder while image loads
    const grid = SKELD_MAP.grid;
    for (let y = 0; y < SKELD_MAP.height; y++) {
      for (let x = 0; x < SKELD_MAP.width; x++) {
        if (grid[y]?.[x] === 'wall') continue;
        ctx.fillStyle = '#2a2d40';
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }
    return;
  }

  // Draw the map image stretched to fill the grid area exactly
  ctx.drawImage(mapImage, 0, 0, mapW, mapH);
}

// ─── Room Labels ────────────────────────────────────────────

function drawRoomLabels(ctx: CanvasRenderingContext2D): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const room of ROOMS) {
    const px = room.center.x * CELL_SIZE + CELL_SIZE / 2;
    const py = room.center.y * CELL_SIZE - CELL_SIZE * 0.2;

    // Background pill
    ctx.font = 'bold 10px "Segoe UI", system-ui, sans-serif';
    const textW = ctx.measureText(room.name).width;
    const pillW = textW + 12;
    const pillH = 16;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(px - pillW / 2, py - pillH / 2, pillW, pillH, 4);
    ctx.fill();

    // Label text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText(room.name, px, py);
  }
}

// ─── Among Us Crewmate Drawing ──────────────────────────────

function drawCrewmate(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  color: string,
  scale: number = 1,
  facingRight: boolean = true,
): void {
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(scale, scale);
  if (!facingRight) ctx.scale(-1, 1);

  const w = 14;  // body width
  const h = 18;  // body height

  // Backpack (left side)
  ctx.fillStyle = darkenColor(color, 0.25);
  ctx.beginPath();
  ctx.roundRect(-w / 2 - 4, -h * 0.15, 5, h * 0.5, 2);
  ctx.fill();

  // Body (rounded rectangle)
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h * 0.78, [5, 5, 2, 2]);
  ctx.fill();

  // Legs
  const legW = 5;
  const legH = 6;
  const legGap = 1;
  const legTop = h * 0.28 - 2;

  // Left leg
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 1, legTop, legW, legH, [0, 0, 2, 2]);
  ctx.fill();

  // Right leg
  ctx.beginPath();
  ctx.roundRect(w / 2 - legW - 1, legTop, legW, legH, [0, 0, 2, 2]);
  ctx.fill();

  // Leg gap (dark line between legs)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(-legGap / 2, legTop, legGap, legH - 2);

  // Visor (light blue)
  ctx.fillStyle = '#a8dcea';
  ctx.beginPath();
  ctx.roundRect(0, -h * 0.35, w * 0.48, h * 0.28, [2, 4, 4, 2]);
  ctx.fill();

  // Visor shine
  ctx.fillStyle = 'rgba(200, 240, 255, 0.5)';
  ctx.beginPath();
  ctx.roundRect(w * 0.12, -h * 0.3, w * 0.15, h * 0.08, 1);
  ctx.fill();

  // Body highlight (subtle)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 2, -h / 2 + 2, w * 0.4, h * 0.5, 3);
  ctx.fill();

  ctx.restore();
}

function darkenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.floor(r * (1 - amount))}, ${Math.floor(g * (1 - amount))}, ${Math.floor(b * (1 - amount))})`;
}

// Walking bob animation
function getWalkBob(playerId: string): number {
  const interp = interpolated.get(playerId);
  if (!interp) return 0;
  const isMoving = interp.queue.length > 0;
  if (!isMoving) return 0;
  return Math.sin(Date.now() / 120) * 1.5;
}

// Direction detection
function isFacingRight(playerId: string): boolean {
  const interp = interpolated.get(playerId);
  if (!interp) return true;
  if (interp.queue.length === 0) return true;
  const next = interp.queue[0]!;
  const dx = next.x - interp.displayX;
  if (Math.abs(dx) < 0.01) return true;
  return dx > 0;
}

// ─── Body Drawing ───────────────────────────────────────────

function drawBodies(ctx: CanvasRenderingContext2D, bodies: SpectatorBody[]): void {
  for (const body of bodies) {
    const px = body.position.x * CELL_SIZE + CELL_SIZE / 2;
    const py = body.position.y * CELL_SIZE + CELL_SIZE / 2;
    const color = COLOR_MAP[body.color] ?? '#888';

    // Blood pool
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = BODY_COLOR;
    ctx.beginPath();
    ctx.ellipse(px, py + 4, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw a "dead crewmate" — half body lying down
    ctx.globalAlpha = 0.85;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.PI / 2); // Lying on side

    // Half body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-7, -5, 10, 12, [3, 3, 1, 1]);
    ctx.fill();

    // Visor
    ctx.fillStyle = '#a8dcea';
    ctx.beginPath();
    ctx.roundRect(-1, -4, 5, 4, 2);
    ctx.fill();

    // Bone stump
    ctx.fillStyle = '#e8e0d0';
    ctx.beginPath();
    ctx.arc(-7, 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#cc2222';
    ctx.beginPath();
    ctx.arc(-7, 2, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

// ─── Player Drawing ─────────────────────────────────────────

function drawPlayers(
  ctx: CanvasRenderingContext2D,
  players: SpectatorPlayer[],
  impostorIds: string[],
  omniscient: boolean,
): void {
  for (const player of players) {
    if (!player.alive) continue;

    const interp = interpolated.get(player.playerId);
    const dx = interp ? interp.displayX : player.position.x;
    const dy = interp ? interp.displayY : player.position.y;

    const px = dx * CELL_SIZE + CELL_SIZE / 2;
    const py = dy * CELL_SIZE + CELL_SIZE / 2;
    const bob = getWalkBob(player.playerId);
    const facingRight = isFacingRight(player.playerId);

    // In vent — semi-transparent or invisible
    if (player.inVent) {
      if (!omniscient) continue;
      ctx.globalAlpha = 0.3;
    }

    const isImpostor = impostorIds.includes(player.playerId);

    // Impostor glow (omniscient only)
    if (omniscient && isImpostor) {
      const pulse = 0.4 + 0.4 * Math.sin(Date.now() / 300);

      // Outer red glow
      ctx.globalAlpha = 0.15 * pulse;
      ctx.fillStyle = IMPOSTOR_GLOW;
      ctx.beginPath();
      ctx.arc(px, py + bob, 18, 0, Math.PI * 2);
      ctx.fill();

      // Pulsing ring
      ctx.globalAlpha = 0.4 * pulse;
      ctx.strokeStyle = IMPOSTOR_GLOW;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py + bob, 14, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = player.inVent ? 0.3 : 1;
    }

    // Drop shadow
    ctx.globalAlpha = ctx.globalAlpha * 0.3;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(px + 1, py + 12, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = player.inVent ? 0.3 : 1;

    // Draw crewmate sprite
    const color = COLOR_MAP[player.color] ?? '#888';
    drawCrewmate(ctx, px, py + bob, color, 1, facingRight);

    ctx.globalAlpha = 1;

    // Player name tag
    const nameY = py + bob - 14;
    ctx.font = 'bold 9px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    const name = player.name.slice(0, 12);
    const nameW = ctx.measureText(name).width;

    // Name background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.roundRect(px - nameW / 2 - 4, nameY - 11, nameW + 8, 13, 3);
    ctx.fill();

    // Name text
    ctx.fillStyle = '#fff';
    ctx.fillText(name, px, nameY);

    // Impostor indicator (omniscient)
    if (omniscient && isImpostor) {
      const knifePx = px + nameW / 2 + 7;
      ctx.font = '8px sans-serif';
      ctx.fillStyle = IMPOSTOR_GLOW;
      ctx.fillText('\u2620', knifePx, nameY); // skull
    }
  }
}


// ─── Canvas Size ────────────────────────────────────────────

export function getCanvasSize(): { width: number; height: number } {
  return {
    width: SKELD_MAP.width * CELL_SIZE + PADDING * 2,
    height: SKELD_MAP.height * CELL_SIZE + PADDING * 2,
  };
}
