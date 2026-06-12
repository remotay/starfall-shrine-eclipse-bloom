import Phaser from 'phaser';
import { DEPTH, PF, PF_BOTTOM, PF_RIGHT, PLAYER_CFG } from '../game/constants';
import { clamp, dist2, randRange } from '../utils/math';
import type { GameRefs } from '../types';

export type PickupType = 'power' | 'point' | 'star' | 'bomb' | 'life';

const TEX: Record<PickupType, string> = {
  power: 'p-power',
  point: 'p-point',
  star: 'p-star',
  bomb: 'p-bomb',
  life: 'p-life',
};

class Pickup extends Phaser.GameObjects.Image {
  ptype: PickupType = 'point';
  vy = 0;
  vx = 0;
  magnet = false;

  constructor(scene: Phaser.Scene) {
    super(scene, -100, -100, 'p-point');
    scene.add.existing(this);
    this.setDepth(DEPTH.PICKUP);
    this.setActive(false).setVisible(false);
  }

  launch(x: number, y: number, type: PickupType): void {
    this.ptype = type;
    this.setTexture(TEX[type]);
    this.setPosition(x, y);
    this.setAlpha(1);
    this.setScale(type === 'star' ? 0.9 : 1);
    this.vy = type === 'star' ? randRange(-40, 20) : randRange(-150, -90);
    this.vx = randRange(-35, 35);
    this.magnet = false;
    this.setActive(true).setVisible(true);
  }
}

/** Pooled pickups with magnet behavior and the top-of-screen collect line. */
export class PickupManager {
  private scene: Phaser.Scene;
  private pool: Pickup[] = [];
  active: Pickup[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  spawn(x: number, y: number, type: PickupType): void {
    if (this.active.length > 220) return;
    const p = this.pool.pop() ?? new Pickup(this.scene);
    p.launch(clamp(x, PF.x + 10, PF_RIGHT - 10), y, type);
    this.active.push(p);
  }

  /** Scatter a loot bundle around (x, y) — used by enemy drops and boss phases. */
  spawnBundle(x: number, y: number, loot: { power?: number; point?: number; bomb?: number; life?: number }): void {
    const types: PickupType[] = [];
    for (let i = 0; i < (loot.power ?? 0); i++) types.push('power');
    for (let i = 0; i < (loot.point ?? 0); i++) types.push('point');
    for (let i = 0; i < (loot.bomb ?? 0); i++) types.push('bomb');
    for (let i = 0; i < (loot.life ?? 0); i++) types.push('life');
    for (const t of types) {
      this.spawn(x + randRange(-36, 36), y + randRange(-26, 26), t);
    }
  }

  update(dt: number, refs: GameRefs): void {
    const player = refs.player;
    const state = refs.state;
    const magnetUp = state.has('magnet');
    const magnetR = magnetUp ? 210 : 70;
    const magnetR2 = magnetR * magnetR;
    const collectLine = player.alive && player.y < PF.y + 150;

    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];

      if (player.alive && (p.magnet || collectLine || dist2(p.x, p.y, player.x, player.y) < magnetR2)) {
        p.magnet = true;
        const a = Math.atan2(player.y - p.y, player.x - p.x);
        const sp = 580;
        p.x += Math.cos(a) * sp * dt;
        p.y += Math.sin(a) * sp * dt;
      } else {
        p.vy = Math.min(p.vy + 320 * dt, p.ptype === 'star' ? 150 : 115);
        p.vx *= 1 - Math.min(1, dt * 2);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }

      // collect
      if (player.alive) {
        const d2 = dist2(p.x, p.y, player.x, player.y);
        if (d2 < 22 * 22) {
          this.collect(p, refs);
          this.recycle(i);
          continue;
        }
      }
      if (p.y > PF_BOTTOM + 30) this.recycle(i);
    }
  }

  private collect(p: Pickup, refs: GameRefs): void {
    const state = refs.state;
    const high = p.y < PF.y + 200 ? 1.5 : 1;
    switch (p.ptype) {
      case 'power': {
        const wasMax = state.power >= PLAYER_CFG.maxPower;
        if (state.addPower(0.08)) {
          state.addScore(100);
          if (!wasMax && state.power >= PLAYER_CFG.maxPower) {
            refs.fx.popText(refs.player.x, refs.player.y - 42, 'FULL POWER!', 0xffe14d, 20);
            refs.audio.spellCapture();
          }
        } else {
          state.addScore(5120);
        }
        break;
      }
      case 'point':
        state.addScore(10000 * high);
        break;
      case 'star':
        state.addScore(420);
        break;
      case 'bomb':
        if (state.bombs < state.maxBombs) state.bombs++;
        else state.addScore(20000);
        refs.fx.popText(p.x, p.y, 'BOMB +1', 0x5fe88f);
        break;
      case 'life':
        if (state.lives < PLAYER_CFG.maxLives) state.lives++;
        refs.fx.popText(p.x, p.y, 'LIFE +1', 0xff8fd0);
        refs.audio.extend();
        break;
    }
    refs.audio.pickup();
    refs.fx.collectSpark(p.x, p.y);
  }

  clear(): void {
    for (let i = this.active.length - 1; i >= 0; i--) this.recycle(i);
  }

  private recycle(i: number): void {
    const p = this.active[i];
    p.setActive(false).setVisible(false);
    this.active.splice(i, 1);
    this.pool.push(p);
  }
}
