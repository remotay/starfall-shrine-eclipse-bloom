import { PF, PF_CX, PF_RIGHT } from './constants';
import { angleDiff, angleTo, randRange } from '../utils/math';
import {
  aimedShot,
  aimedSpread,
  arcFan,
  bulletCurtain,
  clockSpokes,
  curvingShot,
  flowerBurst,
  lineVolley,
  radialBurst,
  ringWithGap,
  sineShot,
} from '../systems/PatternLibrary';
import type { BulletManager } from '../systems/BulletManager';
import type { BulletStyleKey } from './constants';
import type { BossDef, PhaseCtx } from '../types';

/** Boss wanders between fire bursts: smooth, never teleports. */
function wander(c: PhaseCtx, key: string, interval: number, xMin: number, xMax: number, y: number, yJ = 18): void {
  if (c.every(key, interval)) {
    c.boss.glideTo(randRange(xMin, xMax), y + randRange(-yJ, yJ), Math.min(1.5, interval * 0.55));
  }
}

/** Fan of bullets with a safe gap carved around gapCenter. */
function fanWithGap(
  bm: BulletManager,
  x: number,
  y: number,
  centerDeg: number,
  count: number,
  spreadDeg: number,
  speed: number,
  style: BulletStyleKey,
  gapCenter: number,
  gapHalf: number
): void {
  const step = spreadDeg / (count - 1);
  for (let i = 0; i < count; i++) {
    const a = centerDeg - spreadDeg / 2 + step * i;
    if (Math.abs(angleDiff(a, gapCenter)) < gapHalf) continue;
    bm.spawn({ x, y, angle: a, speed, style });
  }
}

/* ===================== STAGE 1 MIDBOSS: The Garden Mirror ===================== */

export const GARDEN_MIRROR: BossDef = {
  key: 'mirror',
  name: 'The Garden Mirror',
  title: 'Watcher in the Silvered Glass',
  tex: 'boss-mirror',
  sigilTint: 0x7fe8ff,
  auraTint: 0x4fc8ff,
  radius: 26,
  mid: true,
  phases: [
    {
      name: 'Reflecting Fan',
      hp: 2600,
      dur: 38,
      update(c) {
        const { bm } = pieces(c);
        wander(c, 'mv', 3.0, PF_CX - 130, PF_CX + 130, 145);
        if (c.every('fan', 0.92, true)) {
          c.mem.side = 1 - (c.mem.side ?? 0);
          const aim = angleTo(c.boss.x, c.boss.y, c.px, c.py);
          const center = c.mem.side ? aim : 180 - aim; // mirrored across the vertical
          arcFan(bm, c.boss.x, c.boss.y + 10, center, c.cnt(9), 56, c.spd(158), 'cyan');
        }
        if (c.every('aim', 2.2)) {
          aimedSpread(bm, c.boss.x, c.boss.y + 10, c.px, c.py, 2, 8, c.spd(225), 'red');
        }
      },
    },
    {
      name: 'Petal Clock',
      hp: 3200,
      dur: 42,
      update(c) {
        const { bm } = pieces(c);
        wander(c, 'mv', 4.2, PF_CX - 70, PF_CX + 70, 150);
        if (c.every('spiral', 0.165, true)) {
          c.mem.ang = (c.mem.ang ?? 0) + 11.4;
          clockSpokes(bm, c.boss.x, c.boss.y, 4, c.mem.ang, c.spd(112), 'pink');
        }
        // counter-rotating inner spiral — weave between the two
        if (c.every('spiral2', 0.28)) {
          c.mem.ang2 = (c.mem.ang2 ?? 45) - 7.6;
          clockSpokes(bm, c.boss.x, c.boss.y, 2, c.mem.ang2, c.spd(86), 'blue');
        }
        if (c.every('ring', 3.0)) {
          radialBurst(bm, c.boss.x, c.boss.y, c.cnt(26), c.spd(78), 'blue', randRange(0, 16));
        }
      },
    },
  ],
};

/* ===================== STAGE 1 BOSS: Lady of the Silver Gate ===================== */

export const SILVER_GATE: BossDef = {
  key: 'silvergate',
  name: 'Lady of the Silver Gate',
  title: 'Warden of the Moonlit Threshold',
  tex: 'boss-silver',
  sigilTint: 0xffd2f0,
  auraTint: 0xc8d4ff,
  radius: 28,
  mid: false,
  phases: [
    {
      name: '',
      hp: 3400,
      dur: 36,
      onStart(c) {
        c.mem['_t_push'] = -0.65; // stagger the pusher shots between waves
      },
      update(c) {
        const { bm } = pieces(c);
        wander(c, 'mv', 3.2, PF_CX - 110, PF_CX + 110, 145);
        if (c.every('wave', 1.3, true)) {
          const aim = angleTo(c.boss.x, c.boss.y, c.px, c.py);
          fanWithGap(bm, c.boss.x, c.boss.y + 12, 90, c.cnt(19), 150, c.spd(138), 'blue', aim, 12);
        }
        if (c.every('push', 1.3)) {
          aimedSpread(bm, c.boss.x, c.boss.y + 12, c.px, c.py, 3, 12, c.spd(205), 'pink');
        }
      },
    },
    {
      name: 'Silver Gate Bloom',
      hp: 4200,
      dur: 50,
      loot: { power: 3, point: 4 },
      update(c) {
        const { bm } = pieces(c);
        wander(c, 'mv', 4.6, PF_CX - 60, PF_CX + 60, 150);
        if (c.every('ring', 1.35, true)) {
          c.mem.gap = (c.mem.gap ?? angleTo(c.boss.x, c.boss.y, c.px, c.py)) + 47;
          ringWithGap(bm, c.boss.x, c.boss.y, c.cnt(36), c.spd(112), 'white', c.mem.gap, 14);
        }
        if (c.every('ring2', 2.7)) {
          ringWithGap(bm, c.boss.x, c.boss.y, c.cnt(26), c.spd(86), 'pink', (c.mem.gap ?? 0) + 180, 16);
        }
        if (c.every('arms', 0.26)) {
          c.mem.spin = (c.mem.spin ?? 0) + 9;
          clockSpokes(bm, c.boss.x, c.boss.y, 2, c.mem.spin, c.spd(72), 'cyan');
        }
      },
    },
    {
      name: '',
      hp: 3900,
      dur: 36,
      update(c) {
        const { bm } = pieces(c);
        wander(c, 'mv', 2.6, PF_CX - 140, PF_CX + 140, 140);
        if (c.every('needle', 0.85, true)) {
          aimedSpread(bm, c.boss.x, c.boss.y + 8, c.px, c.py, 4, 14, c.spd(300), 'knifeY');
        }
        if (c.every('circle', 2.0)) {
          c.mem.r = (c.mem.r ?? 0) + 8;
          radialBurst(bm, c.boss.x, c.boss.y, c.cnt(22), c.spd(74), 'blue', c.mem.r);
        }
      },
    },
    {
      name: 'Moon Petal Labyrinth',
      hp: 4800,
      dur: 55,
      loot: { power: 4, point: 5 },
      update(c) {
        const { bm } = pieces(c);
        wander(c, 'mv', 5.6, PF_CX - 50, PF_CX + 50, 155);
        if (c.every('flower', 0.44, true)) {
          c.mem.rot = (c.mem.rot ?? 0) + 24;
          flowerBurst(bm, c.boss.x, c.boss.y, c.cnt(6), 3, c.spd(88), 24, 'pink', c.mem.rot);
        }
        if (c.every('white', 3.0)) {
          aimedSpread(bm, c.boss.x, c.boss.y, c.px, c.py, 2, 10, c.spd(150), 'whiteBig');
        }
        if (c.every('lane', 4.6)) {
          const aim = angleTo(c.boss.x, c.boss.y, c.px, c.py);
          ringWithGap(bm, c.boss.x, c.boss.y, c.cnt(26), c.spd(66), 'purple', aim, 18);
        }
      },
    },
  ],
};

/* ===================== STAGE 2 MIDBOSS: Ferryman Gearheart ===================== */

export const GEARHEART: BossDef = {
  key: 'gearheart',
  name: 'Ferryman Gearheart',
  title: 'Toll-Keeper of the Brass Current',
  tex: 'boss-gear',
  sigilTint: 0xffb84d,
  auraTint: 0xff9633,
  radius: 28,
  mid: true,
  phases: [
    {
      name: 'Pendulum Crossfire',
      hp: 4200,
      dur: 42,
      update(c) {
        const { bm } = pieces(c);
        wander(c, 'mv', 3.4, PF_CX - 90, PF_CX + 90, 140);
        if (c.every('pend', 0.12, true)) {
          const sw = Math.sin(c.t * 1.55) * 52;
          bm.spawn({ x: PF.x + 12, y: PF.y + 95, angle: 90 - 38 + sw, speed: c.spd(165), style: 'orange' });
          bm.spawn({ x: PF_RIGHT - 12, y: PF.y + 95, angle: 90 + 38 - sw, speed: c.spd(165), style: 'orange' });
        }
        if (c.every('knife', 1.5)) {
          aimedSpread(bm, c.boss.x, c.boss.y + 8, c.px, c.py, 2, 7, c.spd(290), 'knifeO');
        }
        if (c.every('radial', 3.2)) {
          radialBurst(bm, c.boss.x, c.boss.y, c.cnt(14), c.spd(72), 'blue', randRange(0, 24));
        }
      },
    },
    {
      name: 'Tolling Bell Rings',
      hp: 4800,
      dur: 48,
      loot: { power: 3, point: 3, bomb: 1 },
      onStart(c) {
        c.mem['_t_insert'] = -0.5;
      },
      update(c) {
        const { bm, fx } = pieces(c);
        wander(c, 'mv', 4.0, PF_CX - 100, PF_CX + 100, 150);
        if (c.every('ring', 1.85, true)) {
          c.mem.n = (c.mem.n ?? 0) + 1;
          radialBurst(bm, c.boss.x, c.boss.y, c.cnt(30), c.spd(96), 'cyan', c.mem.n * 7);
          fx.ringPulse(c.boss.x, c.boss.y, 0xffb84d, 60, 0.3);
        }
        // slower echo ring drifting the other way — forces repositioning
        if (c.every('echo', 3.7)) {
          radialBurst(bm, c.boss.x, c.boss.y, c.cnt(18), c.spd(70), 'blue', (c.mem.n ?? 0) * -9);
        }
        if (c.every('insert', 1.85)) {
          aimedSpread(bm, c.boss.x, c.boss.y, c.px, c.py, 4, 20, c.spd(250), 'red');
        }
      },
    },
  ],
};

/* ===================== STAGE 2 BOSS: Chrona, Keeper of the River ===================== */

export const CHRONA: BossDef = {
  key: 'chrona',
  name: 'Chrona, Keeper of the River',
  title: 'Her Hands Mark Every Drowning Hour',
  tex: 'boss-chrona',
  sigilTint: 0xffe14d,
  auraTint: 0xc8a8ff,
  radius: 30,
  mid: false,
  phases: [
    {
      name: '',
      hp: 4600,
      dur: 40,
      update(c) {
        const { bm, fx } = pieces(c);
        wander(c, 'mv', 3.3, PF_CX - 100, PF_CX + 100, 150);
        if (c.every('hands', 2.3, true)) {
          c.mem.rot = (c.mem.rot ?? randRange(0, 90)) + 33;
          const bx = c.boss.x;
          const by = c.boss.y;
          for (const a of [c.mem.rot, c.mem.rot + 120, c.mem.rot + 240]) {
            fx.telegraph(bx, by, a, 720, 0.55, 0xffe14d);
            c.boss.delayed(620, () => {
              lineVolley(bm, bx, by, a, 18, c.spd(235), 26, 'yellow');
            });
          }
        }
        if (c.every('radial', 1.7)) {
          c.mem.rr = (c.mem.rr ?? 0) + 11;
          radialBurst(bm, c.boss.x, c.boss.y, c.cnt(14), c.spd(80), 'blue', c.mem.rr);
        }
      },
    },
    {
      name: 'Minute Hand Execution',
      hp: 5400,
      dur: 50,
      loot: { power: 3, point: 4 },
      update(c) {
        const { bm } = pieces(c);
        wander(c, 'mv', 6.0, PF_CX - 40, PF_CX + 40, 150);
        c.mem.spin = (c.mem.spin ?? 0) + c.dt * 11;
        if (c.every('spokes', 0.2, true)) {
          const g = Math.floor(c.t / 4.5) % 12;
          clockSpokes(bm, c.boss.x, c.boss.y, 12, c.mem.spin, c.spd(142), 'white', [g, (g + 1) % 12, (g + 6) % 12]);
        }
        if (c.every('aim', 2.4)) {
          aimedShot(bm, c.boss.x, c.boss.y, c.px, c.py, c.spd(170), 'purple', { turn: 18, turnDelay: 0.4 });
        }
      },
    },
    {
      name: '',
      hp: 5000,
      dur: 40,
      update(c) {
        const { bm } = pieces(c);
        wander(c, 'mv', 2.8, PF_CX - 120, PF_CX + 120, 145);
        if (c.every('curve', 0.14, true)) {
          curvingShot(bm, c.boss.x - 28, c.boss.y, 116, c.spd(128), -54, 'purple', { turnDelay: 0.25 });
          curvingShot(bm, c.boss.x + 28, c.boss.y, 64, c.spd(128), 54, 'purple', { turnDelay: 0.25 });
        }
        if (c.every('knife', 1.2)) {
          aimedSpread(bm, c.boss.x, c.boss.y + 6, c.px, c.py, 3, 13, c.spd(295), 'knifeO');
        }
      },
    },
    {
      name: 'River of Repeating Seconds',
      hp: 6000,
      dur: 55,
      loot: { power: 4, point: 6, life: 1 },
      update(c) {
        const { bm } = pieces(c);
        wander(c, 'mv', 5.2, PF_CX - 60, PF_CX + 60, 150);
        if (c.every('wave', 1.0, true)) {
          c.mem.n = (c.mem.n ?? 0) + 1;
          const g = 5 + Math.round(Math.sin(c.mem.n * 0.8) * 4);
          bulletCurtain(bm, 13, [g, g + 1], c.spd(158), 'cyan');
        }
        if (c.every('sine', 1.9)) {
          for (let k = 0; k < 4; k++) {
            sineShot(bm, c.boss.x, c.boss.y + 8, 90, c.spd(124), 'blue', 34, 0.8, k * 1.6);
          }
        }
        if (c.every('pair', 3.5)) {
          aimedSpread(bm, c.boss.x, c.boss.y, c.px, c.py, 2, 9, c.spd(240), 'red');
        }
      },
    },
  ],
};

/* ===================== STAGE 3 MIDBOSS: The Hollow Crown ===================== */

export const HOLLOW_CROWN: BossDef = {
  key: 'crown',
  name: 'The Hollow Crown',
  title: 'A Throne Remembers Its King',
  tex: 'boss-crown',
  sigilTint: 0xb066ff,
  auraTint: 0x8a4dff,
  radius: 27,
  mid: true,
  phases: [
    {
      name: 'Crown Rain',
      hp: 5600,
      dur: 46,
      update(c) {
        const { bm } = pieces(c);
        wander(c, 'mv', 3.6, PF_CX - 100, PF_CX + 100, 140);
        if (c.every('rain', 0.62, true)) {
          c.mem.gx = Math.max(1, Math.min(13, (c.mem.gx ?? 6) + Math.round(randRange(-1.4, 1.4))));
          const g = c.mem.gx;
          bulletCurtain(bm, 16, [g, g + 1, (g + 8) % 16], c.spd(172), 'yellow');
        }
        if (c.every('pair', 1.6)) {
          aimedSpread(bm, c.boss.x, c.boss.y + 8, c.px, c.py, 3, 15, c.spd(245), 'red');
        }
      },
    },
    {
      name: 'Black Halo',
      hp: 6200,
      dur: 48,
      loot: { power: 3, point: 4, bomb: 1 },
      update(c) {
        const { bm } = pieces(c);
        wander(c, 'mv', 4.2, PF_CX - 80, PF_CX + 80, 150);
        if (c.every('halo', 1.3, true)) {
          c.mem.alt = 1 - (c.mem.alt ?? 0);
          if (c.mem.alt === 1) {
            radialBurst(bm, c.boss.x, c.boss.y, c.cnt(40), c.spd(98), 'purple', randRange(0, 12));
          } else {
            aimedSpread(bm, c.boss.x, c.boss.y, c.px, c.py, c.cnt(7), 36, c.spd(255), 'white');
          }
        }
        if (c.every('stars', 3.8)) {
          const aim = angleTo(c.boss.x, c.boss.y, c.px, c.py);
          ringWithGap(bm, c.boss.x, c.boss.y, c.cnt(30), c.spd(74), 'star', aim, 22);
        }
      },
    },
  ],
};

/* ===================== STAGE 3 BOSS: Noctiluca ===================== */

export const NOCTILUCA: BossDef = {
  key: 'noctiluca',
  name: 'Noctiluca, Saint of the False Eclipse',
  title: 'She Crowned the Sky in Borrowed Night',
  tex: 'boss-noct',
  sigilTint: 0xff4060,
  auraTint: 0xff2444,
  radius: 31,
  mid: false,
  phases: [
    {
      name: '',
      hp: 6000,
      dur: 40,
      update(c) {
        const { bm } = pieces(c);
        wander(c, 'mv', 3.2, PF_CX - 110, PF_CX + 110, 148);
        if (c.every('fan', 0.78, true)) {
          c.mem.osc = (c.mem.osc ?? 0) + 0.55;
          const off = Math.sin(c.mem.osc) * 38;
          arcFan(bm, c.boss.x, c.boss.y + 8, 90 + off, c.cnt(11), 68, c.spd(160), 'red');
          arcFan(bm, c.boss.x, c.boss.y + 8, 90 - off, c.cnt(11), 68, c.spd(160), 'white');
        }
        if (c.every('ring', 2.6)) {
          radialBurst(bm, c.boss.x, c.boss.y, c.cnt(24), c.spd(72), 'blue', randRange(0, 18));
        }
      },
    },
    {
      name: 'False Eclipse Mandala',
      hp: 6600,
      dur: 55,
      loot: { power: 4, point: 5 },
      update(c) {
        const { bm } = pieces(c);
        wander(c, 'mv', 6.4, PF_CX - 36, PF_CX + 36, 152);
        if (c.every('s1', 0.15, true)) {
          c.mem.a1 = (c.mem.a1 ?? 0) + 13;
          clockSpokes(bm, c.boss.x, c.boss.y, 3, c.mem.a1, c.spd(126), 'white');
        }
        if (c.every('s2', 0.15)) {
          c.mem.a2 = (c.mem.a2 ?? 90) - 9;
          clockSpokes(bm, c.boss.x, c.boss.y, 3, c.mem.a2, c.spd(100), 'red');
        }
        if (c.every('valve', 4.4)) {
          const aim = angleTo(c.boss.x, c.boss.y, c.px, c.py);
          ringWithGap(bm, c.boss.x, c.boss.y, c.cnt(30), c.spd(150), 'whiteBig', aim, 18);
        }
      },
    },
    {
      name: '',
      hp: 6400,
      dur: 40,
      update(c) {
        const { bm } = pieces(c);
        wander(c, 'mv', 2.7, PF_CX - 130, PF_CX + 130, 145);
        if (c.every('knife', 0.9, true)) {
          aimedSpread(bm, c.boss.x, c.boss.y + 6, c.px, c.py, 4, 16, c.spd(295), 'knifeO');
        }
        if (c.every('ring', 1.9)) {
          c.mem.r = (c.mem.r ?? 0) + 9;
          radialBurst(bm, c.boss.x, c.boss.y, c.cnt(22), c.spd(76), 'blue', c.mem.r);
        }
        if (c.every('curve', 0.4)) {
          curvingShot(bm, c.boss.x - 30, c.boss.y, 118, c.spd(130), -48, 'purple', { turnDelay: 0.3 });
          curvingShot(bm, c.boss.x + 30, c.boss.y, 62, c.spd(130), 48, 'purple', { turnDelay: 0.3 });
        }
      },
    },
    {
      name: 'Starless Coronation',
      hp: 7400,
      dur: 60,
      loot: { power: 4, point: 7 },
      update(c) {
        const { bm } = pieces(c);
        wander(c, 'mv', 5.4, PF_CX - 55, PF_CX + 55, 150);
        if (c.every('flower', 0.32, true)) {
          c.mem.rot = (c.mem.rot ?? 0) + 17;
          flowerBurst(bm, c.boss.x, c.boss.y, c.cnt(6), 2, c.spd(112), 30, 'white', c.mem.rot);
        }
        if (c.every('knife', 1.35)) {
          aimedSpread(bm, c.boss.x, c.boss.y, c.px, c.py, c.cnt(6), 34, c.spd(272), 'knifeR');
        }
        if (c.every('bigring', 3.7)) {
          const aim = angleTo(c.boss.x, c.boss.y, c.px, c.py);
          ringWithGap(bm, c.boss.x, c.boss.y, c.cnt(34), c.spd(140), 'red', aim, 15);
        }
      },
    },
    {
      name: 'Last Stand — Eclipse Requiem',
      hp: 3800,
      dur: 26,
      loot: { power: 4, point: 8, life: 1 },
      onStart(c) {
        c.boss.glideTo(PF_CX, 200, 1.2);
        c.refs.fx.flash(0xff2444, 0.35, 600);
        c.refs.fx.shake(0.006, 400);
      },
      update(c) {
        const { bm } = pieces(c);
        if (c.every('arms', 0.12, true)) {
          c.mem.n = (c.mem.n ?? 0) + 1;
          c.mem.a = (c.mem.a ?? 0) + 9.5 + Math.sin(c.t * 0.7) * 5;
          clockSpokes(bm, c.boss.x, c.boss.y, 6, c.mem.a, c.spd(100 + c.t * 2.6), c.mem.n % 2 === 0 ? 'red' : 'white');
        }
        if (c.every('ring', 3.0)) {
          radialBurst(bm, c.boss.x, c.boss.y, c.cnt(28), c.spd(66), 'purple', randRange(0, 15));
        }
      },
    },
  ],
};

/** small destructuring helper so phase bodies stay terse */
function pieces(c: PhaseCtx) {
  return { bm: c.refs.bm, fx: c.refs.fx };
}
