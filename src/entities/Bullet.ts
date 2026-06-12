import Phaser from 'phaser';
import { BULLET_STYLES, BulletStyleKey, DEPTH, PF, PF_BOTTOM, PF_RIGHT } from '../game/constants';
import { rad, TAU } from '../utils/math';
import type { BulletSpec } from '../types';

const MARGIN = 48;

/**
 * One pooled bullet (enemy or player). Manual kinematics: velocity along a
 * heading, optional acceleration, turn rate (curving), and sine-wave wiggle.
 */
export class Bullet extends Phaser.GameObjects.Image {
  dirDeg = 0;
  speed = 0;
  accel = 0;
  minSpeed = 0;
  maxSpeed = 4000;
  turn = 0;
  turnDelay = 0;
  waveAmp = 0;
  waveFreq = 0;
  wavePhase = 0;
  private lastWave = 0;
  radius = 5;
  age = 0;
  life = 14;
  grazed = false;
  spinSpd = 0;
  alignVel = false;
  isPlayer = false;
  dmg = 0;
  pierce = 0;
  /** targets already damaged by this bullet — piercing shots hit each only once */
  hitTargets: object[] = [];
  styleKey: BulletStyleKey = 'red';

  constructor(scene: Phaser.Scene) {
    super(scene, -100, -100, 'b-red');
    scene.add.existing(this);
    this.setActive(false).setVisible(false);
  }

  fireEnemy(spec: BulletSpec): void {
    const style = BULLET_STYLES[spec.style];
    this.styleKey = spec.style;
    this.setTexture(style.tex);
    this.setPosition(spec.x, spec.y);
    this.setDepth(DEPTH.EBULLET);
    this.setScale(spec.scale ?? 1);
    this.setAlpha(1);
    this.dirDeg = spec.angle;
    this.speed = spec.speed;
    this.accel = spec.accel ?? 0;
    this.minSpeed = spec.minSpeed ?? 0;
    this.maxSpeed = spec.maxSpeed ?? 4000;
    this.turn = spec.turn ?? 0;
    this.turnDelay = spec.turnDelay ?? 0;
    this.waveAmp = spec.waveAmp ?? 0;
    this.waveFreq = spec.waveFreq ?? 1;
    this.wavePhase = spec.wavePhase ?? 0;
    this.lastWave = 0;
    this.radius = style.radius * (spec.scale ?? 1);
    this.age = 0;
    this.life = spec.life ?? 14;
    this.grazed = false;
    this.spinSpd = style.spin ?? 0;
    this.alignVel = style.align ?? false;
    this.isPlayer = false;
    this.rotation = this.alignVel ? rad(this.dirDeg) : 0;
    this.setActive(true).setVisible(true);
  }

  firePlayer(x: number, y: number, angle: number, speed: number, dmg: number, tex: string, pierce = 0): void {
    this.setTexture(tex);
    this.setPosition(x, y);
    this.setDepth(DEPTH.PBULLET);
    this.setScale(1);
    this.setAlpha(0.92);
    this.dirDeg = angle;
    this.speed = speed;
    this.accel = 0;
    this.turn = 0;
    this.waveAmp = 0;
    this.radius = 7;
    this.age = 0;
    this.life = 2;
    this.spinSpd = 0;
    this.alignVel = true;
    this.isPlayer = true;
    this.dmg = dmg;
    this.pierce = pierce;
    this.hitTargets.length = 0;
    // player bullet textures point "up"; rotate so angle 0 = right
    this.rotation = rad(angle + 90);
    this.setActive(true).setVisible(true);
  }

  /** Advance one frame. Returns false when the bullet should be recycled. */
  step(dt: number): boolean {
    this.age += dt;
    if (this.age >= this.life) return false;

    if (this.turn !== 0 && this.age >= this.turnDelay) {
      this.dirDeg += this.turn * dt;
      if (this.alignVel) this.rotation = rad(this.dirDeg + (this.isPlayer ? 90 : 0));
    }
    if (this.accel !== 0) {
      this.speed += this.accel * dt;
      if (this.speed < this.minSpeed) this.speed = this.minSpeed;
      if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
    }
    const dirRad = rad(this.dirDeg);
    let nx = this.x + Math.cos(dirRad) * this.speed * dt;
    let ny = this.y + Math.sin(dirRad) * this.speed * dt;
    if (this.waveAmp !== 0) {
      const w = this.waveAmp * Math.sin(TAU * this.waveFreq * this.age + this.wavePhase);
      const perp = dirRad + Math.PI / 2;
      nx += Math.cos(perp) * (w - this.lastWave);
      ny += Math.sin(perp) * (w - this.lastWave);
      this.lastWave = w;
    }
    this.x = nx;
    this.y = ny;
    if (this.spinSpd !== 0) this.rotation += rad(this.spinSpd) * dt;

    return !(
      nx < PF.x - MARGIN ||
      nx > PF_RIGHT + MARGIN ||
      ny < PF.y - MARGIN ||
      ny > PF_BOTTOM + MARGIN
    );
  }
}
