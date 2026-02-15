import type { Position, Room } from '@susbot/shared';
import { SKELD_MAP, ROOMS, VENT_GROUPS, isWalkable, getRoomAtPosition } from '@susbot/shared';

// ─── A* Pathfinding ──────────────────────────────────────────

interface AStarNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

function heuristic(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

const DIRECTIONS: Position[] = [
  { x: 0, y: -1 },  // up
  { x: 0, y: 1 },   // down
  { x: -1, y: 0 },  // left
  { x: 1, y: 0 },   // right
];

export function findPath(from: Position, to: Position): Position[] | null {
  const grid = SKELD_MAP.grid;

  if (!isWalkable(grid, from) || !isWalkable(grid, to)) return null;
  if (from.x === to.x && from.y === to.y) return [];

  const open: AStarNode[] = [];
  const closed = new Set<string>();

  const startNode: AStarNode = {
    x: from.x,
    y: from.y,
    g: 0,
    h: heuristic(from, to),
    f: heuristic(from, to),
    parent: null,
  };
  open.push(startNode);

  while (open.length > 0) {
    // Find node with lowest f
    let lowestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i]!.f < open[lowestIdx]!.f) lowestIdx = i;
    }
    const current = open.splice(lowestIdx, 1)[0]!;
    const key = `${current.x},${current.y}`;

    if (current.x === to.x && current.y === to.y) {
      // Reconstruct path
      const path: Position[] = [];
      let node: AStarNode | null = current;
      while (node !== null && (node.x !== from.x || node.y !== from.y)) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }

    closed.add(key);

    for (const dir of DIRECTIONS) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;
      const nKey = `${nx},${ny}`;

      if (closed.has(nKey)) continue;
      if (!isWalkable(grid, { x: nx, y: ny })) continue;

      const g = current.g + 1;
      const h = heuristic({ x: nx, y: ny }, to);
      const f = g + h;

      const existing = open.find(n => n.x === nx && n.y === ny);
      if (existing) {
        if (g < existing.g) {
          existing.g = g;
          existing.f = f;
          existing.parent = current;
        }
        continue;
      }

      open.push({ x: nx, y: ny, g, h, f, parent: current });
    }
  }

  return null; // No path found
}

// ─── Get next step toward target ─────────────────────────────

export function getNextStep(from: Position, to: Position): Position | null {
  if (from.x === to.x && from.y === to.y) return null;
  const path = findPath(from, to);
  if (!path || path.length === 0) return null;
  return path[0] ?? null;
}

// ─── Vision ──────────────────────────────────────────────────

export function distance(a: Position, b: Position): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function isInVisionRange(observer: Position, target: Position, visionRadius: number): boolean {
  return distance(observer, target) <= visionRadius;
}

export function getVisiblePositions(origin: Position, visionRadius: number): Position[] {
  const positions: Position[] = [];
  const r = Math.ceil(visionRadius);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const pos = { x: origin.x + dx, y: origin.y + dy };
      if (distance(origin, pos) <= visionRadius && isWalkable(SKELD_MAP.grid, pos)) {
        positions.push(pos);
      }
    }
  }
  return positions;
}

// ─── Room Detection ──────────────────────────────────────────

export function getRoomName(pos: Position): string | null {
  const room = getRoomAtPosition(pos);
  return room ? room.name : null;
}

// ─── Vent Connections ────────────────────────────────────────

export function getVentGroupForRoom(roomId: number): typeof VENT_GROUPS[number] | undefined {
  return VENT_GROUPS.find(vg => vg.rooms.includes(roomId));
}

export function getConnectedVentRooms(roomId: number): Room[] {
  const group = getVentGroupForRoom(roomId);
  if (!group) return [];
  return group.rooms
    .filter(id => id !== roomId)
    .map(id => ROOMS.find(r => r.id === id))
    .filter((r): r is Room => r !== undefined);
}

export function isNearVent(pos: Position): Room | null {
  for (const room of ROOMS) {
    if (!room.ventPosition) continue;
    if (distance(pos, room.ventPosition) <= 1) return room;
  }
  return null;
}

export function isNearButton(pos: Position): boolean {
  return distance(pos, SKELD_MAP.buttonPosition) <= 2;
}

export function isNearTaskStation(pos: Position, taskRoom: string): boolean {
  const room = ROOMS.find(r => r.name === taskRoom);
  if (!room) return false;
  return room.taskStations.some(ts => distance(pos, ts.position) <= 1);
}
