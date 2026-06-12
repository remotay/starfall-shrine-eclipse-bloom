import type Phaser from 'phaser';
import type { BulletStyleKey } from './game/constants';
import type { RunState } from './game/state';
import type { Player } from './entities/Player';
import type { Boss } from './entities/Boss';
import type { Enemy } from './entities/Enemy';
import type { BulletManager } from './systems/BulletManager';
import type { EnemyManager } from './systems/EnemyManager';
import type { PickupManager } from './entities/Pickup';
import type { Effects } from './systems/Effects';
import type { ProceduralAudio } from './systems/ProceduralAudio';

/** Spec for spawning one enemy bullet. Angles in degrees: 0=right, 90=down. */
export interface BulletSpec {
  x: number;
  y: number;
  angle: number;
  speed: number;
  style: BulletStyleKey;
  /** acceleration along travel direction, px/s^2 */
  accel?: number;
  /** min speed clamp when decelerating */
  minSpeed?: number;
  /** max speed clamp when accelerating */
  maxSpeed?: number;
  /** turn rate, deg/s (curving bullets) */
  turn?: number;
  /** seconds before turn kicks in */
  turnDelay?: number;
  /** sine-wave lateral wiggle */
  waveAmp?: number;
  waveFreq?: number;
  wavePhase?: number;
  /** lifetime seconds (default 14) */
  life?: number;
  scale?: number;
}

/** Shared references that every system gets. Implemented by GameScene. */
export interface GameRefs {
  scene: Phaser.Scene;
  state: RunState;
  player: Player;
  bm: BulletManager;
  em: EnemyManager;
  pickups: PickupManager;
  fx: Effects;
  audio: ProceduralAudio;
  getBoss(): Boss | null;
  /** Player was struck by a bullet/enemy. */
  hitPlayer(): void;
  /** A bullet grazed the player at (x, y). */
  onGraze(x: number, y: number): void;
}

/** Per-phase context handed to boss pattern functions. */
export interface PhaseCtx {
  refs: GameRefs;
  boss: Boss;
  /** seconds since this phase started */
  t: number;
  dt: number;
  /** scratch memory, fresh each phase */
  mem: Record<string, number>;
  /** player position */
  px: number;
  py: number;
  /** fires true every `interval` seconds (per key). first=true fires on first call too */
  every(key: string, interval: number, first?: boolean): boolean;
  /** difficulty-scaled count */
  cnt(n: number): number;
  /** difficulty-scaled speed */
  spd(s: number): number;
}

export interface BossPhaseDef {
  /** spell card name, or '' for a non-spell phase */
  name: string;
  hp: number;
  /** timeout seconds */
  dur: number;
  update(c: PhaseCtx): void;
  onStart?(c: PhaseCtx): void;
  /** loot dropped when phase is broken */
  loot?: { power?: number; point?: number; bomb?: number; life?: number };
}

export interface BossDef {
  key: string;
  name: string;
  title: string;
  tex: string;
  sigilTint: number;
  auraTint: number;
  radius: number;
  mid: boolean;
  phases: BossPhaseDef[];
}

/** Enemy movement behaviors */
export type MovementSpec =
  | { kind: 'drift'; vy: number; swayAmp: number; swayFreq: number }
  | { kind: 'line'; vx: number; vy: number; swayAmp?: number; swayFreq?: number }
  | { kind: 'bezier'; x1: number; y1: number; x2: number; y2: number; dur: number }
  | {
      kind: 'hover';
      tx: number;
      ty: number;
      inDur: number;
      holdDur: number;
      exitVx: number;
      exitVy: number;
    }
  | { kind: 'spiral'; cx: number; cvy: number; r0: number; rShrink: number; angVel: number; holdDur: number };

export interface EnemyKindDef {
  tex: string;
  hp: number;
  radius: number;
  score: number;
  /** drop probabilities 0..1 (values > 1 = guaranteed count) */
  drops: { power?: number; point?: number };
  fireInterval: number;
  fireDelay: number;
  fire(e: Enemy, refs: GameRefs): void;
  onDeath?(e: Enemy, refs: GameRefs): void;
}

export type UpgradeId =
  | 'familiar'
  | 'laser'
  | 'wide'
  | 'grazeEngine'
  | 'magnet'
  | 'barrier'
  | 'bombStock'
  | 'surge'
  | 'slowTime'
  | 'mercy'
  | 'tithe';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  desc: string;
  /** max stacks; 1 = unique */
  max: number;
  apply(refs: GameRefs): void;
}

/** Stage script events, consumed by StageDirector in order. */
export type StageEvent =
  | { type: 'wait'; s: number }
  | { type: 'waitClear'; timeout?: number }
  | { type: 'spawn'; fn: (em: EnemyManager, refs: GameRefs) => void }
  | { type: 'midboss'; def: BossDef }
  | { type: 'boss'; def: BossDef }
  | { type: 'upgrade' };

export interface StageScript {
  name: string;
  subtitle: string;
  /** background index */
  bg: number;
  events: StageEvent[];
}
