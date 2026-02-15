import type { Room, VentGroup, GameMap, CellType, Position, TaskDefinition } from './types.js';

// ─── Room Definitions ────────────────────────────────────────

export const ROOMS: Room[] = [
  {
    id: 0, name: 'Cafeteria',
    center: { x: 24, y: 4 },
    bounds: { x: 19, y: 1, w: 10, h: 6 },
    taskStations: [
      { position: { x: 28, y: 3 }, taskName: 'Empty Garbage' },
      { position: { x: 20, y: 5 }, taskName: 'Download Data' },
      { position: { x: 25, y: 6 }, taskName: 'Fix Wiring' },
    ],
    ventPosition: { x: 22, y: 2 },
  },
  {
    id: 1, name: 'Weapons',
    center: { x: 33, y: 4 },
    bounds: { x: 30, y: 1, w: 6, h: 5 },
    taskStations: [
      { position: { x: 34, y: 2 }, taskName: 'Clear Asteroids' },
      { position: { x: 31, y: 4 }, taskName: 'Download Data' },
    ],
    ventPosition: null,
  },
  {
    id: 2, name: 'Navigation',
    center: { x: 38, y: 12 },
    bounds: { x: 35, y: 9, w: 6, h: 6 },
    taskStations: [
      { position: { x: 39, y: 10 }, taskName: 'Chart Course' },
      { position: { x: 37, y: 13 }, taskName: 'Stabilize Steering' },
    ],
    ventPosition: { x: 40, y: 11 },
  },
  {
    id: 3, name: 'O2',
    center: { x: 30, y: 12 },
    bounds: { x: 28, y: 10, w: 5, h: 5 },
    taskStations: [
      { position: { x: 29, y: 11 }, taskName: 'Clean O2 Filter' },
      { position: { x: 31, y: 13 }, taskName: 'Empty Chute' },
    ],
    ventPosition: null,
  },
  {
    id: 4, name: 'Shields',
    center: { x: 33, y: 18 },
    bounds: { x: 31, y: 16, w: 5, h: 5 },
    taskStations: [
      { position: { x: 34, y: 18 }, taskName: 'Prime Shields' },
    ],
    ventPosition: { x: 32, y: 19 },
  },
  {
    id: 5, name: 'Communications',
    center: { x: 27, y: 20 },
    bounds: { x: 25, y: 18, w: 5, h: 5 },
    taskStations: [
      { position: { x: 26, y: 20 }, taskName: 'Download Data' },
    ],
    ventPosition: null,
  },
  {
    id: 6, name: 'Storage',
    center: { x: 20, y: 18 },
    bounds: { x: 17, y: 15, w: 7, h: 7 },
    taskStations: [
      { position: { x: 19, y: 17 }, taskName: 'Fuel Engines' },
      { position: { x: 22, y: 20 }, taskName: 'Empty Garbage' },
    ],
    ventPosition: null,
  },
  {
    id: 7, name: 'Admin',
    center: { x: 27, y: 14 },
    bounds: { x: 24, y: 12, w: 6, h: 5 },
    taskStations: [
      { position: { x: 25, y: 13 }, taskName: 'Swipe Card' },
      { position: { x: 28, y: 15 }, taskName: 'Upload Data' },
    ],
    ventPosition: { x: 26, y: 15 },
  },
  {
    id: 8, name: 'Electrical',
    center: { x: 14, y: 14 },
    bounds: { x: 12, y: 11, w: 5, h: 6 },
    taskStations: [
      { position: { x: 13, y: 12 }, taskName: 'Divert Power' },
      { position: { x: 15, y: 14 }, taskName: 'Calibrate Distributor' },
      { position: { x: 13, y: 16 }, taskName: 'Download Data' },
    ],
    ventPosition: { x: 14, y: 16 },
  },
  {
    id: 9, name: 'Lower Engine',
    center: { x: 8, y: 18 },
    bounds: { x: 5, y: 15, w: 6, h: 6 },
    taskStations: [
      { position: { x: 7, y: 17 }, taskName: 'Align Engine' },
      { position: { x: 9, y: 19 }, taskName: 'Fuel Engines' },
    ],
    ventPosition: { x: 6, y: 19 },
  },
  {
    id: 10, name: 'Security',
    center: { x: 12, y: 10 },
    bounds: { x: 10, y: 8, w: 4, h: 5 },
    taskStations: [],
    ventPosition: { x: 11, y: 11 },
  },
  {
    id: 11, name: 'Reactor',
    center: { x: 4, y: 12 },
    bounds: { x: 1, y: 9, w: 6, h: 6 },
    taskStations: [
      { position: { x: 2, y: 11 }, taskName: 'Start Reactor' },
      { position: { x: 5, y: 13 }, taskName: 'Unlock Manifolds' },
    ],
    ventPosition: { x: 3, y: 13 },
  },
  {
    id: 12, name: 'Upper Engine',
    center: { x: 8, y: 4 },
    bounds: { x: 5, y: 1, w: 6, h: 6 },
    taskStations: [
      { position: { x: 7, y: 3 }, taskName: 'Align Engine' },
      { position: { x: 9, y: 5 }, taskName: 'Fuel Engines' },
    ],
    ventPosition: { x: 6, y: 3 },
  },
  {
    id: 13, name: 'MedBay',
    center: { x: 16, y: 6 },
    bounds: { x: 14, y: 4, w: 5, h: 5 },
    taskStations: [
      { position: { x: 15, y: 5 }, taskName: 'Submit Scan' },
      { position: { x: 17, y: 7 }, taskName: 'Inspect Sample' },
    ],
    ventPosition: { x: 16, y: 8 },
  },
];

// ─── Vent Connections ────────────────────────────────────────

export const VENT_GROUPS: VentGroup[] = [
  { id: 'A', rooms: [0, 7] },          // Cafeteria ↔ Admin
  { id: 'B', rooms: [13, 8, 10] },     // MedBay ↔ Electrical ↔ Security
  { id: 'C', rooms: [1, 2] },          // Weapons ↔ Navigation (not listed in rooms but we only use rooms with vents)
  { id: 'D', rooms: [4, 2] },          // Shields ↔ Navigation
  { id: 'E', rooms: [12, 11] },        // Upper Engine ↔ Reactor
  { id: 'F', rooms: [9, 11] },         // Lower Engine ↔ Reactor
];

// ─── Room Adjacency ──────────────────────────────────────────

export const ROOM_ADJACENCY: Record<string, string[]> = {
  'Cafeteria': ['Weapons', 'Upper Engine', 'MedBay', 'Admin', 'Storage'],
  'Weapons': ['Cafeteria', 'Navigation', 'O2'],
  'Navigation': ['Weapons', 'Shields', 'O2'],
  'O2': ['Weapons', 'Navigation', 'Shields', 'Admin'],
  'Shields': ['Navigation', 'O2', 'Communications', 'Storage'],
  'Communications': ['Shields', 'Storage'],
  'Storage': ['Cafeteria', 'Communications', 'Shields', 'Electrical', 'Admin'],
  'Admin': ['Cafeteria', 'O2', 'Storage'],
  'Electrical': ['Storage', 'Lower Engine', 'Security'],
  'Lower Engine': ['Electrical', 'Reactor', 'Security', 'Storage'],
  'Security': ['Upper Engine', 'Electrical', 'Lower Engine', 'MedBay'],
  'Reactor': ['Lower Engine', 'Upper Engine'],
  'Upper Engine': ['Cafeteria', 'Reactor', 'Security', 'MedBay'],
  'MedBay': ['Cafeteria', 'Upper Engine', 'Security'],
};

// ─── Task Pool ───────────────────────────────────────────────

export const TASK_POOL: TaskDefinition[] = [
  // Common tasks (all crewmates get the same ones)
  { id: 'fix_wiring', name: 'Fix Wiring', room: 'Cafeteria', type: 'common', durationMs: 3000 },
  { id: 'swipe_card', name: 'Swipe Card', room: 'Admin', type: 'common', durationMs: 3000 },

  // Short tasks
  { id: 'clear_asteroids', name: 'Clear Asteroids', room: 'Weapons', type: 'short', durationMs: 2000 },
  { id: 'chart_course', name: 'Chart Course', room: 'Navigation', type: 'short', durationMs: 2000 },
  { id: 'clean_o2', name: 'Clean O2 Filter', room: 'O2', type: 'short', durationMs: 2000 },
  { id: 'prime_shields', name: 'Prime Shields', room: 'Shields', type: 'short', durationMs: 2000 },
  { id: 'stabilize_steering', name: 'Stabilize Steering', room: 'Navigation', type: 'short', durationMs: 2000 },
  { id: 'empty_chute', name: 'Empty Chute', room: 'O2', type: 'short', durationMs: 2000 },
  { id: 'calibrate_distributor', name: 'Calibrate Distributor', room: 'Electrical', type: 'short', durationMs: 2000 },
  { id: 'divert_power', name: 'Divert Power', room: 'Electrical', type: 'short', durationMs: 2500 },
  { id: 'upload_data', name: 'Upload Data', room: 'Admin', type: 'short', durationMs: 2500 },

  // Long tasks
  { id: 'download_data_cafeteria', name: 'Download Data', room: 'Cafeteria', type: 'long', durationMs: 8000 },
  { id: 'download_data_weapons', name: 'Download Data', room: 'Weapons', type: 'long', durationMs: 8000 },
  { id: 'download_data_comms', name: 'Download Data', room: 'Communications', type: 'long', durationMs: 8000 },
  { id: 'download_data_electrical', name: 'Download Data', room: 'Electrical', type: 'long', durationMs: 8000 },
  { id: 'empty_garbage', name: 'Empty Garbage', room: 'Cafeteria', type: 'long', durationMs: 6000 },
  { id: 'empty_garbage_storage', name: 'Empty Garbage', room: 'Storage', type: 'long', durationMs: 6000 },
  { id: 'fuel_upper', name: 'Fuel Engines', room: 'Upper Engine', type: 'long', durationMs: 6000 },
  { id: 'fuel_lower', name: 'Fuel Engines', room: 'Lower Engine', type: 'long', durationMs: 6000 },
  { id: 'start_reactor', name: 'Start Reactor', room: 'Reactor', type: 'long', durationMs: 8000 },
  { id: 'submit_scan', name: 'Submit Scan', room: 'MedBay', type: 'long', durationMs: 10000 },
  { id: 'inspect_sample', name: 'Inspect Sample', room: 'MedBay', type: 'long', durationMs: 10000 },
  { id: 'align_upper', name: 'Align Engine', room: 'Upper Engine', type: 'long', durationMs: 5000 },
  { id: 'align_lower', name: 'Align Engine', room: 'Lower Engine', type: 'long', durationMs: 5000 },
  { id: 'unlock_manifolds', name: 'Unlock Manifolds', room: 'Reactor', type: 'long', durationMs: 7000 },
];

// ─── Grid Generation ─────────────────────────────────────────

const MAP_WIDTH = 44;
const MAP_HEIGHT = 26;

// Walkable area defined as a union of rectangles { x, y, w, h }.
// This matches the actual Skeld ship interior — rooms + wide corridors.
const WALKABLE_REGIONS: { x: number; y: number; w: number; h: number }[] = [
  // ═══ ROOMS ═══
  { x: 5, y: 1, w: 6, h: 6 },     // Upper Engine (5-10, 1-6)
  { x: 19, y: 1, w: 10, h: 6 },    // Cafeteria (19-28, 1-6)
  { x: 30, y: 1, w: 6, h: 5 },     // Weapons (30-35, 1-5)
  { x: 14, y: 4, w: 5, h: 5 },     // MedBay (14-18, 4-8)
  { x: 1, y: 9, w: 6, h: 6 },      // Reactor (1-6, 9-14)
  { x: 10, y: 8, w: 4, h: 5 },     // Security (10-13, 8-12)
  { x: 12, y: 11, w: 5, h: 6 },    // Electrical (12-16, 11-16)
  { x: 5, y: 15, w: 6, h: 6 },     // Lower Engine (5-10, 15-20)
  { x: 17, y: 15, w: 7, h: 7 },    // Storage (17-23, 15-21)
  { x: 24, y: 12, w: 6, h: 5 },    // Admin (24-29, 12-16)
  { x: 28, y: 10, w: 5, h: 5 },    // O2 (28-32, 10-14)
  { x: 35, y: 9, w: 6, h: 6 },     // Navigation (35-40, 9-14)
  { x: 31, y: 16, w: 5, h: 5 },    // Shields (31-35, 16-20)
  { x: 25, y: 18, w: 5, h: 5 },    // Communications (25-29, 18-22)

  // ═══ TOP CONNECTIONS ═══
  { x: 11, y: 4, w: 3, h: 3 },     // UE→MedBay (11-13, 4-6)
  { x: 29, y: 1, w: 1, h: 5 },     // Caf→Weapons bridge (29, 1-5)

  // ═══ LEFT VERTICAL (3 wide: UE↔Reactor↔LE) ═══
  { x: 7, y: 7, w: 3, h: 9 },      // (7-9, 7-15)

  // ═══ WIDE CENTRAL HALLWAY ═══
  // The big open area in the center of the ship
  { x: 14, y: 7, w: 14, h: 5 },    // Main hall (14-27, 7-11)
  { x: 20, y: 12, w: 4, h: 4 },    // South corridor to Storage/Admin (20-23, 12-15)

  // ═══ RIGHT CONNECTIONS ═══
  { x: 32, y: 6, w: 3, h: 4 },     // Weapons→O2 area (32-34, 6-9)
  { x: 33, y: 10, w: 2, h: 5 },    // O2→Nav bridge (33-34, 10-14)

  // ═══ SOUTH CONNECTIONS ═══
  { x: 10, y: 13, w: 3, h: 4 },    // Sec/Elec→LE link (10-12, 13-16)
  { x: 16, y: 13, w: 2, h: 3 },    // Elec→Storage (16-17, 13-15)
  { x: 23, y: 13, w: 2, h: 3 },    // Admin→Storage (23-24, 13-15)
  { x: 31, y: 15, w: 3, h: 2 },    // O2→Shields (31-33, 15-16)
  { x: 24, y: 18, w: 1, h: 4 },    // Storage→Comms (24, 18-21)
  { x: 30, y: 17, w: 1, h: 4 },    // Comms→Shields (30, 17-20)
];

function createGrid(): CellType[][] {
  const grid: CellType[][] = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row: CellType[] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      row.push('wall');
    }
    grid.push(row);
  }

  // Paint walkable regions
  for (const r of WALKABLE_REGIONS) {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
          grid[y]![x] = 'floor';
        }
      }
    }
  }

  // Overlay task stations
  for (const room of ROOMS) {
    for (const ts of room.taskStations) {
      const { x, y } = ts.position;
      if (y < MAP_HEIGHT && x < MAP_WIDTH && grid[y]![x] !== 'wall') {
        grid[y]![x] = 'task_station';
      }
    }
    if (room.ventPosition) {
      const { x, y } = room.ventPosition;
      if (y < MAP_HEIGHT && x < MAP_WIDTH && grid[y]![x] !== 'wall') {
        grid[y]![x] = 'vent';
      }
    }
  }

  // Emergency button in Cafeteria center
  grid[4]![24] = 'button';

  return grid;
}


// ─── Exported Map ────────────────────────────────────────────

export const SKELD_MAP: GameMap = {
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  grid: createGrid(),
  rooms: ROOMS,
  ventGroups: VENT_GROUPS,
  buttonPosition: { x: 24, y: 4 },
  spawnPosition: { x: 24, y: 4 }, // Cafeteria center
};

export function getRoomAtPosition(pos: Position): Room | undefined {
  return ROOMS.find(r => {
    const b = r.bounds;
    return pos.x >= b.x && pos.x < b.x + b.w && pos.y >= b.y && pos.y < b.y + b.h;
  });
}

export function isWalkable(grid: CellType[][], pos: Position): boolean {
  if (pos.x < 0 || pos.x >= MAP_WIDTH || pos.y < 0 || pos.y >= MAP_HEIGHT) return false;
  const cell = grid[pos.y]?.[pos.x];
  return cell !== undefined && cell !== 'wall';
}
