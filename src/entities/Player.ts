import Phaser from 'phaser';
import { DEPTH, PF, PF_BOTTOM, PF_RIGHT, PLAYER_CFG } from '../game/constants';
import { clamp, lerp, rad } from '../utils/math';
import type { GameRefs } from '../types';

interface MoveKeys {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  w: Phaser.Input.Keyboard.Key;
  a: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
  shift: Phaser.Input.Keyboard.Key;
  z: Phaser.Input.Keyboard.Key;
  j: Phaser.Input.Keyboard.Key;
}

/**
 * The shrine maiden. Tiny 4px hitbox; visible body and aura are cosmetic.
 * Movement is delta-time based and clamped to the playfield.
 */
export class Player extends Phaser.GameObjects.Container {
  alive = true;
  invulnT = 0;
  focusing = false;
  shooting = false;

  private body_: Phaser.GameObjects.Image;
  private aura: Phaser.GameObjects.Image;
  private focusRing: Phaser.GameObjects.Image;
  private hitdot: Phaser.GameObjects.Image;
  private options: Phaser.GameObjects.Image[] = [];
  private optAngle = 0;
  private fireT = 0;
  private t = 0;
  private keys: MoveKeys;

  constructor(scene: Phaser.Scene) {
    super(scene, PF.x + PF.w / 2, PF_BOTTOM - 70);
    this.aura = scene.add.image(0, 0, 'glow64').setTint(0x66ddff).setAlpha(0.32).setScale(1.35);
    this.aura.setBlendMode(Phaser.BlendModes.ADD);
    this.body_ = scene.add.image(0, 0, 'player');
    this.focusRing = scene.add.image(0, 0, 'focusring').setAlpha(0);
    this.add([this.aura, this.body_, this.focusRing]);
    this.setDepth(DEPTH.PLAYER);
    scene.add.existing(this);

    this.hitdot = scene.add.image(this.x, this.y, 'hitdot').setDepth(DEPTH.HITDOT).setAlpha(0);

    const kb = scene.input.keyboard!;
    const KC = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      up: kb.addKey(KC.UP),
      down: kb.addKey(KC.DOWN),
      left: kb.addKey(KC.LEFT),
      right: kb.addKey(KC.RIGHT),
      w: kb.addKey(KC.W),
      a: kb.addKey(KC.A),
      s: kb.addKey(KC.S),
      d: kb.addKey(KC.D),
      shift: kb.addKey(KC.SHIFT),
      z: kb.addKey(KC.Z),
      j: kb.addKey(KC.J),
    };
  }

  /** Re-create orbiting option drones to match Twin Familiar stacks. */
  syncOptions(refs: GameRefs): void {
    const want = refs.state.count('familiar') * 2;
    while (this.options.length < want) {
      const o = this.scene.add.image(this.x, this.y, 'option').setDepth(DEPTH.PLAYER);
      this.options.push(o);
    }
    while (this.options.length > want) {
      this.options.pop()!.destroy();
    }
  }

  update(dt: number, refs: GameRefs): void {
    this.t += dt;
    if (this.invulnT > 0) this.invulnT -= dt;

    const k = this.keys;
    const pad = this.scene.input.gamepad && this.scene.input.gamepad.total > 0
      ? this.scene.input.gamepad.getPad(0)
      : null;

    this.focusing =
      k.shift.isDown || !!(pad && (pad.buttons[4]?.pressed || pad.buttons[5]?.pressed || pad.buttons[6]?.pressed || pad.buttons[7]?.pressed));
    this.shooting = k.z.isDown || k.j.isDown || !!(pad && pad.buttons[0]?.pressed);

    if (this.alive) {
      let dx = 0;
      let dy = 0;
      if (k.left.isDown || k.a.isDown) dx -= 1;
      if (k.right.isDown || k.d.isDown) dx += 1;
      if (k.up.isDown || k.w.isDown) dy -= 1;
      if (k.down.isDown || k.s.isDown) dy += 1;
      if (pad) {
        const ax = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
        const ay = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;
        if (Math.abs(ax) > 0.25) dx += ax;
        if (Math.abs(ay) > 0.25) dy += ay;
        if (pad.left) dx -= 1;
        if (pad.right) dx += 1;
        if (pad.up) dy -= 1;
        if (pad.down) dy += 1;
      }
      const mag = Math.hypot(dx, dy);
      if (mag > 0.01) {
        const spd = this.focusing ? PLAYER_CFG.focusSpeed : PLAYER_CFG.speed;
        this.x += (dx / Math.max(1, mag)) * spd * dt;
        this.y += (dy / Math.max(1, mag)) * spd * dt;
      }
      this.x = clamp(this.x, PF.x + 14, PF_RIGHT - 14);
      this.y = clamp(this.y, PF.y + 18, PF_BOTTOM - 16);

      if (this.shooting) {
        this.fireT += dt;
        const surge = refs.state.count('surge');
        const interval = PLAYER_CFG.fireInterval * Math.pow(0.93, surge);
        while (this.fireT >= interval) {
          this.fireT -= interval;
          this.volley(refs, surge);
        }
      } else {
        this.fireT = Math.min(this.fireT, 0.04);
      }
    }

    // cosmetics
    this.aura.setScale(1.28 + Math.sin(this.t * 4.2) * 0.09);
    this.focusRing.rotation += dt * 0.9;
    this.focusRing.setAlpha(lerp(this.focusRing.alpha, this.focusing && this.alive ? 0.9 : 0, Math.min(1, dt * 12)));
    this.hitdot.setPosition(this.x, this.y);
    this.hitdot.setAlpha(lerp(this.hitdot.alpha, this.focusing && this.alive ? 1 : 0, Math.min(1, dt * 14)));
    if (this.alive && this.invulnT > 0) {
      this.body_.setAlpha(Math.sin(this.t * 38) > 0 ? 1 : 0.3);
    } else {
      this.body_.setAlpha(1);
    }

    // options orbit
    if (this.options.length > 0) {
      this.optAngle += dt * (this.focusing ? 90 : 175);
      const r = this.focusing ? 21 : 31;
      for (let i = 0; i < this.options.length; i++) {
        const a = rad(this.optAngle + (360 / this.options.length) * i);
        const o = this.options[i];
        o.setPosition(this.x + Math.cos(a) * r, this.y + Math.sin(a) * r);
        o.setVisible(this.alive);
        o.rotation += dt * 3;
      }
    }
  }

  private volley(refs: GameRefs, surge: number): void {
    const bm = refs.bm;
    const s = refs.state;
    const dmgMul = Math.pow(1.22, surge);
    const x = this.x;
    const y = this.y;

    if (this.focusing && s.has('laser')) {
      // Shrine Laser: piercing focused beam. Scales with power; each bolt
      // damages a given target once (pierce semantics), so DPS stays honest.
      const laserDmg = (7 + 2.5 * s.power) * dmgMul;
      bm.spawnPlayer(x, y - 24, -90, 1450, laserDmg, 'pb-laser', 99);
      bm.spawnPlayer(x, y - 52, -90, 1450, laserDmg, 'pb-laser', 99);
    } else {
      const p = s.power;
      const mains = p >= 3 ? 3 : 2;
      const sides = p >= 4 ? 4 : p >= 2 ? 2 : 0;
      if (mains === 2) {
        bm.spawnPlayer(x - 7, y - 16, -90, 940, 9 * dmgMul, 'pb-main');
        bm.spawnPlayer(x + 7, y - 16, -90, 940, 9 * dmgMul, 'pb-main');
      } else {
        bm.spawnPlayer(x, y - 20, -90, 940, 9 * dmgMul, 'pb-main');
        bm.spawnPlayer(x - 10, y - 14, -90, 940, 9 * dmgMul, 'pb-main');
        bm.spawnPlayer(x + 10, y - 14, -90, 940, 9 * dmgMul, 'pb-main');
      }
      const wide = s.has('wide');
      const spreadMul = wide ? 1.5 : 1;
      const a1 = (this.focusing ? 4 : 10) * spreadMul;
      const a2 = (this.focusing ? 8 : 20) * spreadMul;
      if (sides >= 2) {
        bm.spawnPlayer(x - 12, y - 8, -90 - a1, 850, 5 * dmgMul, 'pb-side');
        bm.spawnPlayer(x + 12, y - 8, -90 + a1, 850, 5 * dmgMul, 'pb-side');
      }
      if (sides >= 4) {
        bm.spawnPlayer(x - 15, y - 4, -90 - a2, 850, 5 * dmgMul, 'pb-side');
        bm.spawnPlayer(x + 15, y - 4, -90 + a2, 850, 5 * dmgMul, 'pb-side');
      }
      if (wide) {
        const a3 = this.focusing ? 12 : 28;
        bm.spawnPlayer(x - 16, y - 2, -90 - a3, 820, 6 * dmgMul, 'pb-side');
        bm.spawnPlayer(x + 16, y - 2, -90 + a3, 820, 6 * dmgMul, 'pb-side');
      }
    }

    for (const o of this.options) {
      bm.spawnPlayer(o.x, o.y - 8, -90, 880, 4 * dmgMul, 'pb-opt');
    }
    refs.audio.shoot();
  }

  kill(): void {
    this.alive = false;
    this.setVisible(false);
    for (const o of this.options) o.setVisible(false);
  }

  respawn(): void {
    this.setPosition(PF.x + PF.w / 2, PF_BOTTOM - 70);
    this.alive = true;
    this.setVisible(true);
    this.invulnT = PLAYER_CFG.respawnInvuln;
  }

  destroy(fromScene?: boolean): void {
    this.hitdot.destroy();
    for (const o of this.options) o.destroy();
    super.destroy(fromScene);
  }
}
