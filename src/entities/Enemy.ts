import Phaser from 'phaser';
import { DEPTH, PF, PF_BOTTOM, PF_RIGHT } from '../game/constants';
import { chance, easeOutCubic, lerp, quadBezier, rad, TAU } from '../utils/math';
import type { EnemyKindDef, GameRefs, MovementSpec } from '../types';

const OUT = 80;

/** Pooled enemy: parametric movement + timed fire behavior from its kind def. */
export class Enemy extends Phaser.GameObjects.Image {
  kind!: EnemyKindDef;
  kindName = '';
  hp = 1;
  radius = 12;
  t = 0;
  dead = false;
  move!: MovementSpec;
  spawnX = 0;
  spawnY = 0;
  /** scratch for fire patterns */
  mem: Record<string, number> = {};

  private fireT = 0;
  private flashT = 0;
  private a0 = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, -100, -100, 'e-lantern');
    scene.add.existing(this);
    this.setDepth(DEPTH.ENEMY);
    this.setActive(false).setVisible(false);
  }

  launch(kindName: string, kind: EnemyKindDef, x: number, y: number, move: MovementSpec, fireDelay?: number): void {
    this.kind = kind;
    this.kindName = kindName;
    this.setTexture(kind.tex);
    this.setPosition(x, y);
    this.spawnX = x;
    this.spawnY = y;
    this.hp = kind.hp;
    this.radius = kind.radius;
    this.t = 0;
    this.fireT = -(fireDelay ?? kind.fireDelay);
    this.flashT = 0;
    this.dead = false;
    this.move = move;
    this.mem = {};
    this.clearTint();
    this.setAlpha(1);
    this.setRotation(0);
    if (move.kind === 'spiral') {
      this.a0 = Math.atan2(y - move.cvy * 0 - y, x - move.cx) || (x < move.cx ? Math.PI : 0);
    }
    this.setActive(true).setVisible(true);
  }

  update(dt: number, refs: GameRefs): void {
    if (this.dead) return;
    this.t += dt;
    const t = this.t;
    const m = this.move;

    switch (m.kind) {
      case 'drift':
        this.x = this.spawnX + Math.sin(t * m.swayFreq * TAU) * m.swayAmp;
        this.y += m.vy * dt;
        break;
      case 'line':
        this.x = this.spawnX + m.vx * t;
        this.y = this.spawnY + m.vy * t + (m.swayAmp ? Math.sin(t * (m.swayFreq ?? 0.5) * TAU) * m.swayAmp : 0);
        break;
      case 'bezier': {
        const bt = Math.min(1, t / m.dur);
        this.x = quadBezier(this.spawnX, m.x1, m.x2, bt);
        this.y = quadBezier(this.spawnY, m.y1, m.y2, bt);
        if (bt >= 1) this.dead = true;
        break;
      }
      case 'hover': {
        if (t < m.inDur) {
          const ht = easeOutCubic(t / m.inDur);
          this.x = lerp(this.spawnX, m.tx, ht);
          this.y = lerp(this.spawnY, m.ty, ht);
        } else if (t < m.inDur + m.holdDur) {
          this.x = m.tx;
          this.y = m.ty + Math.sin((t - m.inDur) * TAU * 0.45) * 4;
        } else {
          const te = t - m.inDur - m.holdDur;
          this.x = m.tx + m.exitVx * te;
          this.y = m.ty + m.exitVy * te + 50 * te * te;
        }
        break;
      }
      case 'spiral': {
        if (t < m.holdDur) {
          const r = Math.max(26, m.r0 - m.rShrink * t);
          const cy = this.spawnY + m.cvy * t;
          const a = this.a0 + rad(m.angVel) * t;
          this.x = m.cx + Math.cos(a) * r;
          this.y = cy + Math.sin(a) * r * 0.62;
        } else {
          const te = t - m.holdDur;
          this.y += (130 + 140 * te) * dt;
        }
        break;
      }
    }

    // leave-screen cleanup (only after they had a chance to enter)
    if (
      t > 1.5 &&
      (this.x < PF.x - OUT || this.x > PF_RIGHT + OUT || this.y < PF.y - OUT || this.y > PF_BOTTOM + OUT)
    ) {
      this.dead = true;
      return;
    }

    // fire only while inside the playfield
    this.fireT += dt;
    if (this.fireT >= this.kind.fireInterval) {
      this.fireT -= this.kind.fireInterval;
      if (
        this.x > PF.x + 6 &&
        this.x < PF_RIGHT - 6 &&
        this.y > PF.y + 6 &&
        this.y < PF_BOTTOM - 60
      ) {
        this.kind.fire(this, refs);
      }
    }

    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) this.clearTint();
    }

    // subtle life: bob scale
    this.setScale(1 + Math.sin(t * 5 + this.spawnX) * 0.05);
  }

  damage(d: number, refs: GameRefs): void {
    if (this.dead) return;
    this.hp -= d;
    this.flashT = 0.05;
    this.setTintFill(0xffffff);
    if (this.hp <= 0) this.die(refs);
  }

  private die(refs: GameRefs): void {
    this.dead = true;
    refs.fx.explode(this.x, this.y, 0xffb066, this.radius > 15 ? 1.6 : 1);
    refs.audio.enemyDie();
    refs.state.onKill();
    refs.state.addScore(this.kind.score);
    for (const [type, v] of Object.entries(this.kind.drops) as ['power' | 'point', number][]) {
      let n = Math.floor(v);
      if (chance(v - n)) n++;
      for (let i = 0; i < n; i++) {
        refs.pickups.spawn(this.x + (Math.random() - 0.5) * 24, this.y + (Math.random() - 0.5) * 16, type);
      }
    }
    this.kind.onDeath?.(this, refs);
  }
}
