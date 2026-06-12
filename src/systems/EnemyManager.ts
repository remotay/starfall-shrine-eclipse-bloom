import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy';
import { dC, dS } from '../game/constants';
import { angleTo, dist2, randRange } from '../utils/math';
import {
  aimedSpread,
  curvingShot,
  flowerBurst,
  radialBurst,
  ringWithGap,
  sineShot,
} from './PatternLibrary';
import type { EnemyKindDef, GameRefs, MovementSpec } from '../types';

/**
 * Enemy archetypes for all three stages.
 * Stage 1 "Moonlit Garden": lantern wisps, petal fairies, mirror birds.
 * Stage 2 "Clockwork River": gear sprites, river knives, bell drones.
 * Stage 3 "Eclipse Palace": eclipse moths, palace eyes, crown wraiths.
 */
export const ENEMY_KINDS: Record<string, EnemyKindDef> = {
  lantern: {
    tex: 'e-lantern',
    hp: 30,
    radius: 13,
    score: 420,
    drops: { power: 0.55, point: 0.2 },
    fireInterval: 2.0,
    fireDelay: 1.1,
    fire(e, refs) {
      aimedSpread(refs.bm, e.x, e.y + 8, refs.player.x, refs.player.y, 3, 24, dS(112), 'blue');
    },
  },
  fairy: {
    tex: 'e-fairy',
    hp: 36,
    radius: 13,
    score: 520,
    drops: { point: 0.5, power: 0.2 },
    fireInterval: 1.8,
    fireDelay: 0.8,
    fire(e, refs) {
      flowerBurst(refs.bm, e.x, e.y, dC(7), 2, dS(88), 28, 'pink', randRange(0, 60));
    },
  },
  bird: {
    tex: 'e-bird',
    hp: 32,
    radius: 13,
    score: 480,
    drops: { power: 0.4 },
    fireInterval: 1.4,
    fireDelay: 0.65,
    fire(e, refs) {
      aimedSpread(refs.bm, e.x, e.y + 6, refs.player.x, refs.player.y, 2, 7, dS(215), 'red');
    },
  },
  gear: {
    tex: 'e-gear',
    hp: 70,
    radius: 14,
    score: 800,
    drops: { power: 0.5, point: 0.35 },
    fireInterval: 2.0,
    fireDelay: 0.95,
    fire(e, refs) {
      e.mem.rot = (e.mem.rot ?? randRange(0, 36)) + 14;
      radialBurst(refs.bm, e.x, e.y, dC(12), dS(100), 'cyan', e.mem.rot);
    },
  },
  rknife: {
    tex: 'e-knife',
    hp: 40,
    radius: 13,
    score: 600,
    drops: { point: 0.4 },
    fireInterval: 1.05,
    fireDelay: 0.4,
    fire(e, refs) {
      aimedSpread(refs.bm, e.x, e.y, refs.player.x, refs.player.y, 2, 9, dS(300), 'knifeO');
    },
  },
  bell: {
    tex: 'e-bell',
    hp: 90,
    radius: 14,
    score: 950,
    drops: { power: 0.8, point: 0.4 },
    fireInterval: 0.85,
    fireDelay: 0.85,
    fire(e, refs) {
      e.mem.ph = (e.mem.ph ?? 0) + 2.0;
      sineShot(refs.bm, e.x, e.y + 8, 90, dS(126), 'blue', 26, 0.85, e.mem.ph);
      sineShot(refs.bm, e.x, e.y + 8, 90, dS(126), 'blue', 26, 0.85, e.mem.ph + Math.PI);
    },
  },
  moth: {
    tex: 'e-moth',
    hp: 60,
    radius: 13,
    score: 760,
    drops: { point: 0.5, power: 0.25 },
    fireInterval: 1.5,
    fireDelay: 0.75,
    fire(e, refs) {
      const aim = angleTo(e.x, e.y, refs.player.x, refs.player.y);
      for (const s of [-1, 0, 1]) {
        curvingShot(refs.bm, e.x, e.y, aim + s * 20, dS(122), s * 44, 'purple', { turnDelay: 0.3 });
      }
    },
  },
  eye: {
    tex: 'e-eye',
    hp: 100,
    radius: 14,
    score: 1100,
    drops: { power: 0.6, point: 0.5 },
    fireInterval: 1.9,
    fireDelay: 0.65,
    fire(e, refs) {
      aimedSpread(refs.bm, e.x, e.y, refs.player.x, refs.player.y, dC(5), 34, dS(185), 'red');
      refs.scene.time.delayedCall(280, () => {
        if (!e.dead && e.active) {
          aimedSpread(refs.bm, e.x, e.y, refs.player.x, refs.player.y, 2, 10, dS(272), 'knifeY');
        }
      });
    },
  },
  wraith: {
    tex: 'e-wraith',
    hp: 380,
    radius: 16,
    score: 3200,
    drops: { power: 1.3, point: 2.2 },
    fireInterval: 2.3,
    fireDelay: 1.1,
    fire(e, refs) {
      const aim = angleTo(e.x, e.y, refs.player.x, refs.player.y);
      ringWithGap(refs.bm, e.x, e.y, dC(24), dS(92), 'purple', aim, 18);
    },
    onDeath(e, refs) {
      // bullet-cancel reward
      refs.bm.cancelRadius(e.x, e.y, 150, true, refs);
      refs.fx.ringPulse(e.x, e.y, 0xc45cff, 150, 0.5);
    },
  },
};

interface Scheduled {
  t: number;
  fn: () => void;
}

/** Pooled enemy spawning, scheduling, update, and enemy-body collision. */
export class EnemyManager {
  private scene: Phaser.Scene;
  active: Enemy[] = [];
  private pool: Enemy[] = [];
  private scheduled: Scheduled[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  spawn(kind: keyof typeof ENEMY_KINDS, x: number, y: number, move: MovementSpec, fireDelay?: number): Enemy {
    const def = ENEMY_KINDS[kind];
    const e = this.pool.pop() ?? new Enemy(this.scene);
    e.launch(kind as string, def, x, y, move, fireDelay);
    this.active.push(e);
    return e;
  }

  /** Run fn after delay seconds of game time (paused while game is paused). */
  schedule(delay: number, fn: () => void): void {
    this.scheduled.push({ t: delay, fn });
  }

  update(dt: number, refs: GameRefs): void {
    for (let i = this.scheduled.length - 1; i >= 0; i--) {
      const s = this.scheduled[i];
      s.t -= dt;
      if (s.t <= 0) {
        this.scheduled.splice(i, 1);
        s.fn();
      }
    }

    const player = refs.player;
    const ramming = player.alive && player.invulnT <= 0;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const e = this.active[i];
      if (!e.dead) {
        e.update(dt, refs);
        if (ramming && !e.dead) {
          const rr = e.radius + 5;
          if (dist2(e.x, e.y, player.x, player.y) < rr * rr) {
            refs.hitPlayer();
          }
        }
      }
      if (e.dead) this.recycle(i);
    }
  }

  /** Kill or remove every enemy (no drops). Used on player death is NOT desired; used by debug skip & stage transitions. */
  clearAll(): void {
    this.scheduled.length = 0;
    for (let i = this.active.length - 1; i >= 0; i--) {
      this.recycle(i);
    }
  }

  get count(): number {
    return this.active.length;
  }

  get anyPending(): boolean {
    return this.active.length > 0 || this.scheduled.length > 0;
  }

  private recycle(i: number): void {
    const e = this.active[i];
    e.setActive(false).setVisible(false);
    this.active.splice(i, 1);
    this.pool.push(e);
  }
}
