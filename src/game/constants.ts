/** Canvas size */
export const W = 960;
export const H = 720;

/** Playfield rect (bullets/enemies live here) */
export const PF = { x: 30, y: 30, w: 540, h: 660 };
export const PF_RIGHT = PF.x + PF.w;
export const PF_BOTTOM = PF.y + PF.h;
export const PF_CX = PF.x + PF.w / 2;
export const PF_CY = PF.y + PF.h / 2;

/** HUD panel left edge */
export const HUD_X = 600;

/** Render depth layers */
export const DEPTH = {
  BG: 0,
  SIGIL: 4,
  PICKUP: 6,
  PBULLET: 8,
  ENEMY: 10,
  BOSS: 12,
  FX: 16,
  PLAYER: 20,
  EBULLET: 30,
  HITDOT: 35,
  FXTOP: 38,
  FRAME: 50,
  UI: 55,
  CARD: 60,
  OVERLAY: 100,
};

export const DEBUG_ENABLED = import.meta.env.DEV;

/** Player tuning */
export const PLAYER_CFG = {
  speed: 330,
  focusSpeed: 152,
  hitRadius: 4,
  grazeRadius: 18,
  fireInterval: 0.085,
  startLives: 3,
  startBombs: 2,
  maxLives: 8,
  maxPower: 4,
  respawnInvuln: 3.0,
  respawnDelay: 1.1,
  bombInvuln: 4.2,
};

/** Score thresholds that award an extra life */
export const EXTEND_SCORES = [2_000_000, 5_000_000, 9_000_000];

/** Difficulty ranks. Normal is the tuned baseline. */
export const DIFFS = [
  { name: 'Normal', cnt: 1.0, spd: 1.0, hp: 1.0 },
  { name: 'Hard', cnt: 1.25, spd: 1.1, hp: 1.15 },
  { name: 'Lunatic', cnt: 1.55, spd: 1.22, hp: 1.3 },
] as const;

export const DiffState = { idx: 0 };

export function diff() {
  return DIFFS[DiffState.idx];
}

/** Difficulty-scaled bullet count */
export function dC(n: number): number {
  return Math.max(1, Math.round(n * diff().cnt));
}

/** Difficulty-scaled bullet speed */
export function dS(s: number): number {
  return s * diff().spd;
}

/** Bullet visual styles — texture, collision radius, whether sprite aligns to velocity */
export interface BulletStyleDef {
  tex: string;
  radius: number;
  align?: boolean;
  spin?: number;
}

export type BulletStyleKey =
  | 'red'
  | 'pink'
  | 'blue'
  | 'cyan'
  | 'yellow'
  | 'orange'
  | 'purple'
  | 'white'
  | 'redBig'
  | 'whiteBig'
  | 'star'
  | 'knifeY'
  | 'knifeO'
  | 'knifeR';

export const BULLET_STYLES: Record<BulletStyleKey, BulletStyleDef> = {
  red: { tex: 'b-red', radius: 4.5 },
  pink: { tex: 'b-pink', radius: 4.5 },
  blue: { tex: 'b-blue', radius: 5 },
  cyan: { tex: 'b-cyan', radius: 4.5 },
  yellow: { tex: 'b-yellow', radius: 4.5 },
  orange: { tex: 'b-orange', radius: 4.5 },
  purple: { tex: 'b-purple', radius: 5 },
  white: { tex: 'b-white', radius: 5 },
  redBig: { tex: 'b-redbig', radius: 8.5 },
  whiteBig: { tex: 'b-whitebig', radius: 8.5 },
  star: { tex: 'b-star', radius: 4.5, spin: 220 },
  knifeY: { tex: 'knife-y', radius: 4, align: true },
  knifeO: { tex: 'knife-o', radius: 4, align: true },
  knifeR: { tex: 'knife-r', radius: 4, align: true },
};

export const HISCORE_KEY = 'starfall-eclipse-hiscore';
