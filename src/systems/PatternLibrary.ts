import { PF } from '../game/constants';
import { angleTo } from '../utils/math';
import type { BulletStyleKey } from '../game/constants';
import type { BulletManager } from './BulletManager';
import type { BulletSpec } from '../types';

type Opts = Partial<Omit<BulletSpec, 'x' | 'y' | 'angle' | 'speed' | 'style'>>;

/**
 * Reusable danmaku emission functions. All angles in degrees (0=right, 90=down).
 * These are one-shot emitters; rhythm/state lives in the caller (boss phases,
 * enemy fire functions) via their tick timers.
 */

export function aimedShot(
  bm: BulletManager,
  x: number,
  y: number,
  tx: number,
  ty: number,
  speed: number,
  style: BulletStyleKey,
  opts: Opts = {}
): void {
  bm.spawn({ x, y, angle: angleTo(x, y, tx, ty), speed, style, ...opts });
}

export function aimedSpread(
  bm: BulletManager,
  x: number,
  y: number,
  tx: number,
  ty: number,
  count: number,
  spreadDeg: number,
  speed: number,
  style: BulletStyleKey,
  opts: Opts = {}
): void {
  const aim = angleTo(x, y, tx, ty);
  arcFan(bm, x, y, aim, count, spreadDeg, speed, style, opts);
}

export function arcFan(
  bm: BulletManager,
  x: number,
  y: number,
  centerDeg: number,
  count: number,
  spreadDeg: number,
  speed: number,
  style: BulletStyleKey,
  opts: Opts = {}
): void {
  if (count <= 1) {
    bm.spawn({ x, y, angle: centerDeg, speed, style, ...opts });
    return;
  }
  const step = spreadDeg / (count - 1);
  const start = centerDeg - spreadDeg / 2;
  for (let i = 0; i < count; i++) {
    bm.spawn({ x, y, angle: start + step * i, speed, style, ...opts });
  }
}

export function radialBurst(
  bm: BulletManager,
  x: number,
  y: number,
  count: number,
  speed: number,
  style: BulletStyleKey,
  startDeg = 0,
  opts: Opts = {}
): void {
  for (let i = 0; i < count; i++) {
    bm.spawn({ x, y, angle: startDeg + (360 / count) * i, speed, style, ...opts });
  }
}

/** Full ring except a gap of ±gapHalfDeg around gapCenterDeg — the safe lane. */
export function ringWithGap(
  bm: BulletManager,
  x: number,
  y: number,
  count: number,
  speed: number,
  style: BulletStyleKey,
  gapCenterDeg: number,
  gapHalfDeg: number,
  opts: Opts = {}
): void {
  for (let i = 0; i < count; i++) {
    const a = (360 / count) * i;
    let d = ((a - gapCenterDeg) % 360 + 360) % 360;
    if (d > 180) d = 360 - d;
    if (d < gapHalfDeg) continue;
    bm.spawn({ x, y, angle: a, speed, style, ...opts });
  }
}

/** Flower: `petals` clusters, each a tight mini-fan of `perPetal` bullets at stepped speeds. */
export function flowerBurst(
  bm: BulletManager,
  x: number,
  y: number,
  petals: number,
  perPetal: number,
  baseSpeed: number,
  speedStep: number,
  style: BulletStyleKey,
  rotDeg = 0,
  opts: Opts = {}
): void {
  for (let p = 0; p < petals; p++) {
    const a = rotDeg + (360 / petals) * p;
    for (let j = 0; j < perPetal; j++) {
      bm.spawn({ x, y, angle: a, speed: baseSpeed + speedStep * j, style, ...opts });
    }
  }
}

/** Falling curtain across the playfield top; lanes in gapLanes are left open. */
export function bulletCurtain(
  bm: BulletManager,
  lanes: number,
  gapLanes: number[],
  speed: number,
  style: BulletStyleKey,
  opts: Opts = {}
): void {
  const laneW = PF.w / lanes;
  for (let i = 0; i < lanes; i++) {
    if (gapLanes.includes(i)) continue;
    bm.spawn({
      x: PF.x + laneW * (i + 0.5),
      y: PF.y - 16,
      angle: 90,
      speed,
      style,
      ...opts,
    });
  }
}

/** Radial spokes (clock hands). skipSpokes indices are omitted (rotating gap). */
export function clockSpokes(
  bm: BulletManager,
  x: number,
  y: number,
  spokes: number,
  rotDeg: number,
  speed: number,
  style: BulletStyleKey,
  skipSpokes: number[] = [],
  opts: Opts = {}
): void {
  for (let i = 0; i < spokes; i++) {
    if (skipSpokes.includes(i)) continue;
    bm.spawn({ x, y, angle: rotDeg + (360 / spokes) * i, speed, style, ...opts });
  }
}

export function curvingShot(
  bm: BulletManager,
  x: number,
  y: number,
  angle: number,
  speed: number,
  turn: number,
  style: BulletStyleKey,
  opts: Opts = {}
): void {
  bm.spawn({ x, y, angle, speed, style, turn, ...opts });
}

/** Bullets sharing a heading at stepped speeds → reads as a line / laser stream. */
export function lineVolley(
  bm: BulletManager,
  x: number,
  y: number,
  angle: number,
  count: number,
  speed0: number,
  speedStep: number,
  style: BulletStyleKey,
  opts: Opts = {}
): void {
  for (let i = 0; i < count; i++) {
    bm.spawn({ x, y, angle, speed: speed0 + speedStep * i, style, ...opts });
  }
}

/** Single bullet that wiggles sideways as it travels. */
export function sineShot(
  bm: BulletManager,
  x: number,
  y: number,
  angle: number,
  speed: number,
  style: BulletStyleKey,
  waveAmp: number,
  waveFreq: number,
  wavePhase = 0,
  opts: Opts = {}
): void {
  bm.spawn({ x, y, angle, speed, style, waveAmp, waveFreq, wavePhase, ...opts });
}
