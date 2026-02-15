import type { PlayerColor } from '@susbot/shared';

export const COLOR_MAP: Record<PlayerColor, string> = {
  red: '#c51111',
  blue: '#132ed1',
  green: '#117f2d',
  pink: '#ed54ba',
  orange: '#ef7d0e',
  yellow: '#f5f557',
  black: '#3f474e',
  white: '#d6e0f0',
  purple: '#6b2fbb',
  brown: '#71491e',
  cyan: '#38fedc',
  lime: '#50ef39',
};

// ─── Map Colors ─────────────────────────────────────────────

export const BG_COLOR = '#0d1117';
export const STAR_COLOR = 'rgba(255, 255, 255, 0.6)';

export const WALL_COLOR = '#2a2d35';
export const WALL_OUTLINE = '#1a1d24';
export const CORRIDOR_FLOOR = '#7a8090';

export const VENT_COLOR = '#8b2020';
export const VENT_GRATE = '#5a1515';
export const TASK_STATION_COLOR = '#c4a83c';
export const BUTTON_COLOR_OUTER = '#555e6e';
export const BUTTON_COLOR_INNER = '#44cc55';

export const ROOM_LABEL_COLOR = 'rgba(255, 255, 255, 0.55)';
export const ROOM_LABEL_SHADOW = 'rgba(0, 0, 0, 0.7)';

// ─── Room Floor Tints (matched to the reference image) ──────

export const ROOM_FLOOR_COLORS: Record<string, string> = {
  'Cafeteria':      '#b0bec5',  // Light gray-blue
  'Weapons':        '#9ea7b0',  // Steel gray
  'Navigation':     '#c9a0b5',  // Pink/mauve
  'O2':             '#8fb5a0',  // Teal/green
  'Shields':        '#7faec8',  // Blue
  'Communications': '#c49a8a',  // Salmon/coral
  'Storage':        '#a89070',  // Brown/tan
  'Admin':          '#a0a8b5',  // Neutral gray
  'Electrical':     '#c4b888',  // Tan/yellow
  'Lower Engine':   '#cda07a',  // Orange/peach
  'Upper Engine':   '#cda07a',  // Orange/peach
  'Reactor':        '#bfa0c0',  // Pink/mauve
  'MedBay':         '#a5b0b8',  // Cool gray
  'Security':       '#a5b0b8',  // Cool gray
};

// ─── Glow Colors ────────────────────────────────────────────

export const REACTOR_GLOW = '#44ddff';
export const ENGINE_GLOW = '#44ddff';
export const SHIELD_GLOW = '#55ccee';
export const IMPOSTOR_GLOW = '#ff2222';
export const BODY_COLOR = '#cc1111';
