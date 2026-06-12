import Phaser from 'phaser';
import { DEPTH, PF } from '../game/constants';
import { rad } from '../utils/math';

type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;

/**
 * All juice: pooled particle emitters (lazily created per tint), screen shake,
 * flashes, warning telegraphs, expanding rings, floating score text.
 */
export class Effects {
  private scene: Phaser.Scene;
  private sparkEms = new Map<number, Emitter>();
  private puffEms = new Map<number, Emitter>();
  private cancelEm: Emitter;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.cancelEm = scene.add.particles(0, 0, 'glow32', {
      speed: { min: 8, max: 45 },
      lifespan: 320,
      scale: { start: 0.55, end: 0 },
      alpha: { start: 0.8, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      tint: 0x9fd8ff,
      emitting: false,
    });
    this.cancelEm.setDepth(DEPTH.FXTOP);
  }

  private sparks(tint: number): Emitter {
    let em = this.sparkEms.get(tint);
    if (!em) {
      em = this.scene.add.particles(0, 0, 'spark', {
        speed: { min: 50, max: 240 },
        lifespan: { min: 220, max: 520 },
        scale: { start: 1.1, end: 0 },
        alpha: { start: 1, end: 0 },
        blendMode: Phaser.BlendModes.ADD,
        tint,
        emitting: false,
      });
      em.setDepth(DEPTH.FXTOP);
      this.sparkEms.set(tint, em);
    }
    return em;
  }

  private puffs(tint: number): Emitter {
    let em = this.puffEms.get(tint);
    if (!em) {
      em = this.scene.add.particles(0, 0, 'glow32', {
        speed: { min: 15, max: 90 },
        lifespan: { min: 300, max: 700 },
        scale: { start: 1.1, end: 0 },
        alpha: { start: 0.65, end: 0 },
        blendMode: Phaser.BlendModes.ADD,
        tint,
        emitting: false,
      });
      em.setDepth(DEPTH.FX);
      this.puffEms.set(tint, em);
    }
    return em;
  }

  explode(x: number, y: number, tint: number, size = 1): void {
    this.sparks(tint).emitParticleAt(x, y, Math.round(8 * size));
    this.puffs(tint).emitParticleAt(x, y, Math.round(3 * size));
    if (size >= 1.5) this.ringPulse(x, y, tint, 70 * size, 0.35);
  }

  hitSpark(x: number, y: number): void {
    this.sparks(0x9fefff).emitParticleAt(x, y, 1);
  }

  grazeSpark(x: number, y: number): void {
    this.sparks(0xffffff).emitParticleAt(x, y, 2);
  }

  collectSpark(x: number, y: number): void {
    this.sparks(0xffe26e).emitParticleAt(x, y, 2);
  }

  cancelPuff(x: number, y: number): void {
    this.cancelEm.emitParticleAt(x, y, 1);
  }

  ringPulse(x: number, y: number, tint: number, maxRadius: number, dur = 0.45): void {
    const img = this.scene.add.image(x, y, 'ring64');
    img.setDepth(DEPTH.FXTOP).setBlendMode(Phaser.BlendModes.ADD).setTint(tint);
    img.setScale(0.15);
    this.scene.tweens.add({
      targets: img,
      scale: maxRadius / 27,
      alpha: 0,
      duration: dur * 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => img.destroy(),
    });
  }

  /** Flash covering the playfield only (HUD untouched). */
  flash(tint = 0xffffff, alpha = 0.45, durMs = 240): void {
    const r = this.scene.add.rectangle(PF.x + PF.w / 2, PF.y + PF.h / 2, PF.w, PF.h, tint, alpha);
    r.setDepth(DEPTH.FXTOP).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: r,
      alpha: 0,
      duration: durMs,
      ease: 'Quad.easeOut',
      onComplete: () => r.destroy(),
    });
  }

  shake(intensity = 0.004, durMs = 220): void {
    this.scene.cameras.main.shake(durMs, intensity);
  }

  /** Blinking warning line for laser/stream telegraphs. */
  telegraph(x: number, y: number, angleDeg: number, len: number, durS: number, tint = 0xff5577): void {
    const img = this.scene.add.image(x, y, 'px');
    img.setOrigin(0, 0.5);
    img.setDisplaySize(len, 3);
    img.setRotation(rad(angleDeg));
    img.setTint(tint);
    img.setBlendMode(Phaser.BlendModes.ADD);
    img.setDepth(DEPTH.FX);
    img.setAlpha(0.18);
    this.scene.tweens.add({
      targets: img,
      alpha: 0.62,
      duration: 90,
      yoyo: true,
      repeat: Math.max(1, Math.floor((durS * 1000) / 180)),
      onComplete: () => img.destroy(),
    });
  }

  popText(x: number, y: number, str: string, tint = 0xffffff, size = 16): void {
    const t = this.scene.add.text(x, y, str, {
      fontFamily: 'Georgia, serif',
      fontSize: `${size}px`,
      color: '#' + tint.toString(16).padStart(6, '0'),
      stroke: '#0a0618',
      strokeThickness: 4,
    });
    t.setOrigin(0.5).setDepth(DEPTH.CARD);
    this.scene.tweens.add({
      targets: t,
      y: y - 34,
      alpha: 0,
      duration: 1100,
      ease: 'Quad.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  /** Expanding bomb magic circle. */
  bombCircle(x: number, y: number): void {
    const sigil = this.scene.add.image(x, y, 'sigil');
    sigil.setDepth(DEPTH.FXTOP).setBlendMode(Phaser.BlendModes.ADD).setTint(0x7fe8ff);
    sigil.setScale(0.2).setAlpha(0.95);
    this.scene.tweens.add({
      targets: sigil,
      scale: 5.6,
      alpha: 0,
      rotation: rad(150),
      duration: 1250,
      ease: 'Cubic.easeOut',
      onComplete: () => sigil.destroy(),
    });
    this.ringPulse(x, y, 0x7fe8ff, 330, 0.8);
    this.flash(0x66ccff, 0.3, 350);
    this.shake(0.006, 320);
  }

  playerDeathFx(x: number, y: number): void {
    this.sparks(0xffffff).emitParticleAt(x, y, 14);
    this.sparks(0xff5577).emitParticleAt(x, y, 12);
    this.puffs(0xff8899).emitParticleAt(x, y, 6);
    this.ringPulse(x, y, 0xff6688, 150, 0.5);
    this.flash(0xff3355, 0.22, 300);
    this.shake(0.005, 260);
  }

  bossPhaseFx(x: number, y: number, tint: number): void {
    this.ringPulse(x, y, tint, 230, 0.6);
    this.sparks(tint).emitParticleAt(x, y, 16);
    this.flash(tint, 0.16, 260);
  }

  bossDeathFx(x: number, y: number, tint: number): void {
    for (let i = 0; i < 6; i++) {
      this.scene.time.delayedCall(i * 130, () => {
        const ox = x + (Math.random() - 0.5) * 90;
        const oy = y + (Math.random() - 0.5) * 70;
        this.explode(ox, oy, i % 2 === 0 ? tint : 0xffffff, 1.6);
      });
    }
    this.scene.time.delayedCall(700, () => {
      this.ringPulse(x, y, 0xffffff, 380, 0.9);
      this.flash(0xffffff, 0.5, 500);
      this.shake(0.009, 500);
    });
  }
}
