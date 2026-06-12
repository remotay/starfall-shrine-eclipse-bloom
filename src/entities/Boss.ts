import Phaser from 'phaser';
import { DEPTH, PF_CX, PF, dC, dS, diff } from '../game/constants';
import type { BossDef, GameRefs, PhaseCtx } from '../types';

type BossState = 'enter' | 'switch' | 'fight' | 'dying' | 'leaving' | 'done';

const FIGHT_Y = 150;

/**
 * Boss: entrance animation, sequential named phases with HP + timeout,
 * bullet-cancel transitions, spell-capture bonuses, loot, death sequence.
 */
export class Boss extends Phaser.GameObjects.Container {
  def: BossDef;
  radius: number;
  bstate: BossState = 'enter';
  done = false;
  phaseIndex = 0;
  hp = 1;
  maxHp = 1;
  phaseT = 0;
  /** true once the player bombed or died during this phase (no capture bonus) */
  phaseBroken = false;
  mem: Record<string, number> = {};

  private sigil: Phaser.GameObjects.Image;
  private auraImg: Phaser.GameObjects.Image;
  private bodyImg: Phaser.GameObjects.Image;
  // manual glide (deliberately tween-free: boss movement must follow game dt,
  // freeze with the pause/upgrade screens, and never depend on tween state)
  private mvFromX = 0;
  private mvFromY = 0;
  private mvToX = 0;
  private mvToY = 0;
  private mvT = 1;
  private mvDur = 1;
  private switchT = 0;
  private dieT = 0;
  private leaveT = 0;
  private flashT = 0;
  private t = 0;
  private refs: GameRefs;

  constructor(refs: GameRefs, def: BossDef) {
    super(refs.scene, PF_CX, PF.y - 90);
    this.refs = refs;
    this.def = def;
    this.radius = def.radius;

    this.sigil = refs.scene.add.image(0, 0, 'sigil');
    this.sigil.setTint(def.sigilTint).setBlendMode(Phaser.BlendModes.ADD);
    this.sigil.setScale((def.radius * 2.7) / 128).setAlpha(0.5);
    this.auraImg = refs.scene.add.image(0, 0, 'glow128');
    this.auraImg.setTint(def.auraTint).setBlendMode(Phaser.BlendModes.ADD);
    this.auraImg.setScale((def.radius * 1.6) / 64).setAlpha(0.5);
    this.bodyImg = refs.scene.add.image(0, 0, def.tex);
    this.add([this.sigil, this.auraImg, this.bodyImg]);
    this.setDepth(DEPTH.BOSS);
    refs.scene.add.existing(this);

    // entrance
    refs.audio.bossPhase();
    this.glideTo(PF_CX, FIGHT_Y, 1.7);
  }

  get targetable(): boolean {
    return this.bstate === 'fight';
  }

  get phase() {
    return this.def.phases[Math.min(this.phaseIndex, this.def.phases.length - 1)];
  }

  get hpFrac(): number {
    return Math.max(0, this.hp / this.maxHp);
  }

  get timeLeft(): number {
    return Math.max(0, this.phase.dur - this.phaseT);
  }

  get phasesLeft(): number {
    return this.def.phases.length - this.phaseIndex - 1;
  }

  glideTo(x: number, y: number, durS: number): void {
    this.mvFromX = this.x;
    this.mvFromY = this.y;
    this.mvToX = x;
    this.mvToY = y;
    this.mvT = 0;
    this.mvDur = Math.max(0.01, durS);
  }

  private updateGlide(dt: number): void {
    if (this.mvT >= this.mvDur) return;
    this.mvT = Math.min(this.mvDur, this.mvT + dt);
    const p = this.mvT / this.mvDur;
    const e = 0.5 - 0.5 * Math.cos(Math.PI * p); // sine in-out
    this.x = this.mvFromX + (this.mvToX - this.mvFromX) * e;
    this.y = this.mvFromY + (this.mvToY - this.mvFromY) * e;
  }

  /** Delayed call that only fires if still fighting the same phase (pause-safe). */
  delayed(ms: number, fn: () => void): void {
    const idx = this.phaseIndex;
    this.refs.scene.time.delayedCall(ms, () => {
      if (this.bstate === 'fight' && this.phaseIndex === idx && !this.done) fn();
    });
  }

  update(dt: number): void {
    this.t += dt;
    const refs = this.refs;

    // cosmetics
    this.sigil.rotation += dt * 0.55;
    this.auraImg.setScale(((this.radius * 1.6) / 64) * (1 + Math.sin(this.t * 3.1) * 0.1));
    this.bodyImg.y = Math.sin(this.t * 1.8) * 4;
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) this.bodyImg.clearTint();
    }

    switch (this.bstate) {
      case 'enter':
        this.updateGlide(dt);
        if (this.mvT >= this.mvDur) {
          this.bstate = 'switch';
          this.switchT = 0.6;
        }
        break;
      case 'switch':
        this.updateGlide(dt);
        this.switchT -= dt;
        if (this.switchT <= 0) this.beginPhase();
        break;
      case 'fight': {
        this.updateGlide(dt);
        this.phaseT += dt;
        const ctx = this.makeCtx(dt);
        this.phase.update(ctx);
        if (this.phaseT >= this.phase.dur) this.endPhase(true);
        break;
      }
      case 'dying':
        this.dieT -= dt;
        this.setAlpha(Math.max(0, this.dieT / 1.4));
        if (this.dieT <= 0) {
          this.bstate = 'done';
          this.done = true;
          this.setVisible(false);
        }
        break;
      case 'leaving':
        this.leaveT += dt;
        this.y -= (60 + 180 * this.leaveT) * dt;
        this.setAlpha(Math.max(0, 1 - this.leaveT / 1.3));
        if (this.leaveT >= 1.3) {
          this.bstate = 'done';
          this.done = true;
          this.setVisible(false);
        }
        break;
      case 'done':
        break;
    }
  }

  private makeCtx(dt: number): PhaseCtx {
    const refs = this.refs;
    const mem = this.mem;
    return {
      refs,
      boss: this,
      t: this.phaseT,
      dt,
      mem,
      px: refs.player.x,
      py: refs.player.y,
      every: (key: string, interval: number, first = false) => {
        const k = '_t_' + key;
        if (!(k in mem)) mem[k] = first ? interval : 0;
        mem[k] += dt;
        if (mem[k] >= interval) {
          mem[k] -= interval;
          return true;
        }
        return false;
      },
      cnt: dC,
      spd: dS,
    };
  }

  private beginPhase(): void {
    const refs = this.refs;
    const phase = this.phase;
    this.maxHp = this.hp = phase.hp * diff().hp;
    this.phaseT = 0;
    this.mem = {};
    this.phaseBroken = false;
    this.bstate = 'fight';
    refs.audio.bossPhase();
    refs.fx.bossPhaseFx(this.x, this.y, this.def.sigilTint);
    if (phase.name) {
      refs.fx.popText(PF_CX, PF.y + 70, `“${phase.name}”`, 0xffffff, 19);
    }
    phase.onStart?.(this.makeCtx(0));
  }

  damage(d: number, refs: GameRefs): void {
    if (this.bstate !== 'fight') return;
    this.hp -= d;
    this.flashT = 0.04;
    this.bodyImg.setTintFill(0xffffff);
    refs.audio.bossHit();
    if (this.hp <= 0) this.endPhase(false);
  }

  /** Debug: skip the current phase. */
  forceEndPhase(): void {
    if (this.bstate === 'fight') this.endPhase(false);
  }

  private endPhase(timeout: boolean): void {
    const refs = this.refs;
    const phase = this.phase;
    const state = refs.state;
    const last = this.phaseIndex >= this.def.phases.length - 1;

    refs.bm.cancelAll(!timeout, refs);

    if (!timeout) {
      const loot = phase.loot ?? (this.def.mid ? { power: 3, point: 3 } : { power: 3, point: 5 });
      refs.pickups.spawnBundle(this.x, this.y + 20, loot);
      state.addScore(20000 + 12000 * state.stage);
      if (phase.name && !this.phaseBroken) {
        state.stats.spellCaptures++;
        const bonus = 60000 + 40000 * state.stage;
        state.score += bonus; // capture bonus ignores multiplier: flat & honest
        refs.fx.popText(PF_CX, PF.y + 130, `SPELL CAPTURE!  +${bonus.toLocaleString()}`, 0xffe14d, 20);
        refs.audio.spellCapture();
      }
    }

    if (last) {
      if (timeout && this.def.mid) {
        // midboss escapes
        this.bstate = 'leaving';
        this.leaveT = 0;
      } else {
        this.bstate = 'dying';
        this.dieT = 1.4;
        refs.audio.bossDie();
        refs.fx.bossDeathFx(this.x, this.y, this.def.sigilTint);
        if (!timeout) {
          refs.pickups.spawnBundle(this.x, this.y + 10, this.def.mid ? { power: 4, point: 6 } : { power: 5, point: 9 });
          state.addScore(this.def.mid ? 50000 : 120000);
        }
      }
    } else {
      this.phaseIndex++;
      this.bstate = 'switch';
      this.switchT = 1.5;
      this.glideTo(PF_CX, FIGHT_Y, 1.1);
      refs.fx.bossPhaseFx(this.x, this.y, 0xffffff);
    }
  }
}
