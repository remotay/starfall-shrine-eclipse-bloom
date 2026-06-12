import Phaser from 'phaser';
import { Bullet } from '../entities/Bullet';
import { PLAYER_CFG } from '../game/constants';
import { dist2, lerp } from '../utils/math';
import type { BulletSpec, GameRefs } from '../types';

const MAX_ENEMY_BULLETS = 1500;
const MAX_PLAYER_BULLETS = 220;

/**
 * Object-pooled bullet simulation + circular collision for both sides.
 * Also owns the global bullet time-scale (Slow-Time Charm).
 */
export class BulletManager {
  private scene: Phaser.Scene;
  private pool: Bullet[] = [];
  active: Bullet[] = [];
  private pPool: Bullet[] = [];
  pActive: Bullet[] = [];

  timeScale = 1;
  private slowTimer = 0;
  private slowScale = 1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  spawn(spec: BulletSpec): Bullet | null {
    if (this.active.length >= MAX_ENEMY_BULLETS) return null;
    const b = this.pool.pop() ?? new Bullet(this.scene);
    b.fireEnemy(spec);
    this.active.push(b);
    return b;
  }

  spawnPlayer(x: number, y: number, angle: number, speed: number, dmg: number, tex: string, pierce = 0): void {
    if (this.pActive.length >= MAX_PLAYER_BULLETS) return;
    const b = this.pPool.pop() ?? new Bullet(this.scene);
    b.firePlayer(x, y, angle, speed, dmg, tex, pierce);
    this.pActive.push(b);
  }

  /** Slow all enemy bullets for `dur` seconds (Slow-Time Charm). */
  applySlow(scale: number, dur: number): void {
    this.slowScale = scale;
    this.slowTimer = dur;
    this.timeScale = scale;
  }

  update(dt: number, refs: GameRefs): void {
    // slow-time decay
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) this.timeScale = 1;
      else if (this.slowTimer < 0.6) this.timeScale = lerp(1, this.slowScale, this.slowTimer / 0.6);
    }

    const player = refs.player;
    const canHit = player.alive && player.invulnT <= 0;
    const canGraze = player.alive;
    const px = player.x;
    const py = player.y;
    const hitR = PLAYER_CFG.hitRadius;
    const grazeR = PLAYER_CFG.grazeRadius;
    const edt = dt * this.timeScale;

    // --- enemy bullets ---
    for (let i = this.active.length - 1; i >= 0; i--) {
      // nested callbacks (hitPlayer → cancelRadius) may shrink the array under us
      if (i >= this.active.length) continue;
      const b = this.active[i];
      if (!b.step(edt)) {
        this.recycle(i);
        continue;
      }
      if (!canGraze) continue;
      const d2 = dist2(b.x, b.y, px, py);
      const hitDist = b.radius + hitR;
      if (canHit && d2 < hitDist * hitDist) {
        this.recycle(i);
        // hitPlayer cancels bullets in bulk (death burst / Barrier / Mercy Star),
        // invalidating our indices — stop this frame's sweep entirely.
        refs.hitPlayer();
        break;
      }
      if (!b.grazed && b.age > 0.05) {
        const gd = b.radius + grazeR;
        if (d2 < gd * gd) {
          b.grazed = true;
          refs.onGraze(b.x, b.y);
        }
      }
    }

    // --- player bullets vs enemies/boss ---
    const enemies = refs.em.active;
    const boss = refs.getBoss();
    for (let i = this.pActive.length - 1; i >= 0; i--) {
      if (i >= this.pActive.length) continue;
      const b = this.pActive[i];
      if (!b.step(dt)) {
        this.recyclePlayer(i);
        continue;
      }
      let consumed = false;
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (e.dead) continue;
        const rr = e.radius + b.radius;
        if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
          if (b.pierce > 0) {
            // piercing shots damage each target exactly once, never per-frame
            if (b.hitTargets.includes(e)) continue;
            b.hitTargets.push(e);
            b.pierce--;
            e.damage(b.dmg, refs);
            refs.fx.hitSpark(b.x, b.y - 4);
          } else {
            e.damage(b.dmg, refs);
            refs.fx.hitSpark(b.x, b.y - 4);
            consumed = true;
            break;
          }
        }
      }
      if (!consumed && boss && boss.targetable) {
        const rr = boss.radius + b.radius;
        if (dist2(b.x, b.y, boss.x, boss.y) < rr * rr) {
          if (b.pierce > 0) {
            if (!b.hitTargets.includes(boss)) {
              b.hitTargets.push(boss);
              b.pierce--;
              boss.damage(b.dmg, refs);
              refs.fx.hitSpark(b.x, b.y - 4);
            }
          } else {
            boss.damage(b.dmg, refs);
            refs.fx.hitSpark(b.x, b.y - 4);
            consumed = true;
          }
        }
      }
      if (consumed) this.recyclePlayer(i);
    }
  }

  /** Remove every enemy bullet; optionally convert to score stars. */
  cancelAll(toStars: boolean, refs: GameRefs): void {
    let stars = 0;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const b = this.active[i];
      refs.fx.cancelPuff(b.x, b.y);
      if (toStars && stars < 90) {
        refs.pickups.spawn(b.x, b.y, 'star');
        stars++;
      }
      this.recycle(i);
    }
  }

  /** Remove enemy bullets within radius r of (x,y). */
  cancelRadius(x: number, y: number, r: number, toStars: boolean, refs: GameRefs): void {
    const r2 = r * r;
    let stars = 0;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const b = this.active[i];
      if (dist2(b.x, b.y, x, y) < r2) {
        refs.fx.cancelPuff(b.x, b.y);
        if (toStars && stars < 60) {
          refs.pickups.spawn(b.x, b.y, 'star');
          stars++;
        }
        this.recycle(i);
      }
    }
  }

  get enemyCount(): number {
    return this.active.length;
  }

  get playerCount(): number {
    return this.pActive.length;
  }

  private recycle(i: number): void {
    const b = this.active[i];
    b.setActive(false).setVisible(false);
    this.active.splice(i, 1);
    this.pool.push(b);
  }

  private recyclePlayer(i: number): void {
    const b = this.pActive[i];
    b.setActive(false).setVisible(false);
    this.pActive.splice(i, 1);
    this.pPool.push(b);
  }
}
