import Phaser from 'phaser';
import { DEPTH, H, PF, PF_BOTTOM, PF_CX, PF_RIGHT, W } from '../game/constants';

interface ScrollTile {
  ts: Phaser.GameObjects.TileSprite;
  vy: number;
}

interface Rotator {
  img: Phaser.GameObjects.Image;
  w: number;
}

/**
 * Per-stage procedural parallax backgrounds:
 * 0 Moonlit Garden · 1 Clockwork River · 2 Eclipse Palace.
 */
export class StageBackground {
  private scene: Phaser.Scene;
  private objs: Phaser.GameObjects.GameObject[] = [];
  private tiles: ScrollTile[] = [];
  private rotators: Rotator[] = [];
  private pulser: Phaser.GameObjects.Image | null = null;
  private t = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(idx: number): void {
    this.destroy();
    const s = this.scene;

    const grad = s.add.image(0, 0, `grad-${idx}`).setOrigin(0).setDepth(DEPTH.BG);
    grad.setDisplaySize(W, H);
    this.objs.push(grad);

    const starAlpha = idx === 1 ? [0.4, 0.5, 0.55] : [0.6, 0.75, 0.9];
    const starTint = idx === 2 ? 0xffb0a8 : 0xffffff;
    [
      { key: 'stars0', vy: 14 },
      { key: 'stars1', vy: 27 },
      { key: 'stars2', vy: 46 },
    ].forEach((cfg, i) => {
      const ts = s.add.tileSprite(0, 0, W, H, cfg.key).setOrigin(0).setDepth(DEPTH.BG + 1);
      ts.setAlpha(starAlpha[i]);
      ts.setTint(starTint);
      this.tiles.push({ ts, vy: cfg.vy });
      this.objs.push(ts);
    });

    if (idx === 0) this.garden(s);
    else if (idx === 1) this.river(s);
    else this.eclipse(s);
  }

  private garden(s: Phaser.Scene): void {
    const moon = s.add.image(170, 160, 'moon').setDepth(DEPTH.BG + 2).setAlpha(0.9);
    this.objs.push(moon);

    const sigil = s.add.image(PF_CX, 590, 'sigil').setDepth(DEPTH.SIGIL);
    sigil.setTint(0x6688ff).setAlpha(0.06).setScale(1.7).setBlendMode(Phaser.BlendModes.ADD);
    this.rotators.push({ img: sigil, w: 0.12 });
    this.objs.push(sigil);

    const petals = s.add.particles(0, 0, 'petal', {
      x: { min: PF.x, max: PF_RIGHT },
      y: PF.y - 14,
      lifespan: 9000,
      speedY: { min: 30, max: 60 },
      speedX: { min: -22, max: 22 },
      rotate: { start: 0, end: 360 },
      alpha: { start: 0.55, end: 0.1 },
      scale: { min: 0.7, max: 1.1 },
      frequency: 450,
      quantity: 1,
    });
    petals.setDepth(DEPTH.BG + 3);
    this.objs.push(petals);
  }

  private river(s: Phaser.Scene): void {
    const gears: [number, number, number, number][] = [
      // x, y, scale, spin
      [110, 180, 1.0, 0.18],
      [480, 420, 1.5, -0.1],
      [220, 600, 0.8, 0.25],
      [430, 110, 0.7, -0.22],
    ];
    for (const [x, y, sc, w] of gears) {
      const g = s.add.image(x, y, 'gearbg').setDepth(DEPTH.BG + 2);
      g.setTint(0x4aa8c8).setAlpha(0.11).setScale(sc);
      this.rotators.push({ img: g, w });
      this.objs.push(g);
    }
    for (const vy of [220, 300]) {
      const ts = s.add.tileSprite(PF.x, PF.y, PF.w, PF.h, 'streaks').setOrigin(0).setDepth(DEPTH.BG + 3);
      ts.setAlpha(vy === 220 ? 0.18 : 0.1);
      this.tiles.push({ ts, vy });
      this.objs.push(ts);
    }
  }

  private eclipse(s: Phaser.Scene): void {
    const ecl = s.add.image(PF_CX, 175, 'eclipse').setDepth(DEPTH.BG + 2).setAlpha(0.95);
    this.pulser = ecl;
    this.objs.push(ecl);

    const sigil = s.add.image(PF_CX, 380, 'sigil').setDepth(DEPTH.SIGIL);
    sigil.setTint(0xff4060).setAlpha(0.055).setScale(2.5).setBlendMode(Phaser.BlendModes.ADD);
    this.rotators.push({ img: sigil, w: -0.09 });
    this.objs.push(sigil);

    const embers = s.add.particles(0, 0, 'ember', {
      x: { min: PF.x, max: PF_RIGHT },
      y: PF_BOTTOM + 6,
      lifespan: 8000,
      speedY: { min: -85, max: -40 },
      speedX: { min: -12, max: 12 },
      alpha: { start: 0.75, end: 0 },
      scale: { min: 0.6, max: 1.2 },
      frequency: 240,
      quantity: 1,
      blendMode: Phaser.BlendModes.ADD,
    });
    embers.setDepth(DEPTH.BG + 3);
    this.objs.push(embers);
  }

  update(dt: number): void {
    this.t += dt;
    for (const tl of this.tiles) tl.ts.tilePositionY -= tl.vy * dt;
    for (const r of this.rotators) r.img.rotation += r.w * dt;
    if (this.pulser) this.pulser.setScale(1 + Math.sin(this.t * 1.4) * 0.04);
  }

  destroy(): void {
    for (const o of this.objs) o.destroy();
    this.objs = [];
    this.tiles = [];
    this.rotators = [];
    this.pulser = null;
  }
}
