import { PF, PF_CX, PF_RIGHT } from './constants';
import { CHRONA, GARDEN_MIRROR, GEARHEART, HOLLOW_CROWN, NOCTILUCA, SILVER_GATE } from './bosses';
import type { EnemyManager } from '../systems/EnemyManager';
import type { StageScript } from '../types';

/**
 * Stage wave scripts. Everything is data + small spawn closures, so pacing
 * and density are easy to tune: change counts, schedule offsets, or waits.
 */

/* --------------------------- stage 1 waves --------------------------- */

function s1LanternLine(em: EnemyManager): void {
  for (let i = 0; i < 5; i++) {
    em.schedule(i * 0.55, () => {
      em.spawn('lantern', PF.x + 90 + i * 90, PF.y - 24, { kind: 'drift', vy: 52, swayAmp: 26, swayFreq: 0.22 });
    });
  }
}

function s1FairyArc(em: EnemyManager, fromLeft: boolean): void {
  for (let i = 0; i < 6; i++) {
    em.schedule(i * 0.42, () => {
      const sx = fromLeft ? PF.x - 28 : PF_RIGHT + 28;
      const ex = fromLeft ? PF_RIGHT + 50 : PF.x - 50;
      em.spawn('fairy', sx, 110 + i * 9, {
        kind: 'bezier',
        x1: PF_CX + (fromLeft ? -50 : 50),
        y1: 305,
        x2: ex,
        y2: 130,
        dur: 4.6,
      });
    });
  }
}

function s1BirdSweeps(em: EnemyManager, dense: boolean): void {
  const n = dense ? 5 : 4;
  for (let i = 0; i < n; i++) {
    em.schedule(i * 0.5, () => {
      em.spawn('bird', PF.x - 26, 120, { kind: 'line', vx: 165, vy: 12, swayAmp: 14, swayFreq: 0.5 });
    });
    em.schedule(1.1 + i * 0.5, () => {
      em.spawn('bird', PF_RIGHT + 26, 205, { kind: 'line', vx: -165, vy: 12, swayAmp: 14, swayFreq: 0.5 });
    });
  }
}

function s1Mixed(em: EnemyManager): void {
  for (let i = 0; i < 8; i++) {
    em.schedule(i * 0.45, () => {
      em.spawn('lantern', PF.x + 60 + i * 60, PF.y - 24, { kind: 'drift', vy: 58, swayAmp: 32, swayFreq: 0.25 });
    });
  }
  for (let i = 0; i < 3; i++) {
    em.schedule(2 + i * 0.6, () => {
      em.spawn('fairy', PF_CX - 70 + i * 70, PF.y - 26, {
        kind: 'hover',
        tx: PF_CX - 110 + i * 110,
        ty: 190,
        inDur: 1.4,
        holdDur: 4.5,
        exitVx: i === 1 ? 0 : i === 0 ? -60 : 60,
        exitVy: -90,
      });
    });
  }
}

function s1FinalPush(em: EnemyManager): void {
  // V formation of lanterns
  for (let i = 0; i < 10; i++) {
    const k = i < 5 ? i : 9 - i;
    em.schedule(i * 0.3, () => {
      em.spawn('lantern', PF.x + 70 + i * 45, PF.y - 24 - k * 8, { kind: 'drift', vy: 66, swayAmp: 20, swayFreq: 0.3 });
    });
  }
  for (let i = 0; i < 4; i++) {
    em.schedule(2.4 + i * 0.55, () => {
      const left = i % 2 === 0;
      em.spawn('bird', left ? PF.x - 26 : PF_RIGHT + 26, 140 + i * 35, {
        kind: 'line',
        vx: left ? 175 : -175,
        vy: 8,
        swayAmp: 12,
        swayFreq: 0.5,
      });
    });
  }
}

/* --------------------------- stage 2 waves --------------------------- */

function s2GearColumns(em: EnemyManager): void {
  for (const cx of [PF.x + 110, PF_RIGHT - 110]) {
    for (let i = 0; i < 3; i++) {
      em.schedule(i * 0.7 + (cx > PF_CX ? 0.35 : 0), () => {
        em.spawn('gear', cx, PF.y - 26, {
          kind: 'hover',
          tx: cx,
          ty: 125 + i * 85,
          inDur: 1.3,
          holdDur: 6,
          exitVx: 0,
          exitVy: 120,
        });
      });
    }
  }
}

function s2KnifeRush(em: EnemyManager, n: number): void {
  for (let i = 0; i < n; i++) {
    em.schedule(i * 0.55, () => {
      const left = i % 2 === 0;
      em.spawn('rknife', left ? PF.x - 24 : PF_RIGHT + 24, PF.y + 20 + (i % 3) * 50, {
        kind: 'line',
        vx: left ? 195 : -195,
        vy: 150,
      });
    });
  }
}

function s2Bells(em: EnemyManager, n: number): void {
  for (let i = 0; i < n; i++) {
    em.schedule(i * 0.8, () => {
      const tx = PF.x + (PF.w / (n + 1)) * (i + 1);
      em.spawn('bell', tx, PF.y - 26, {
        kind: 'hover',
        tx,
        ty: 150 + (i % 2) * 55,
        inDur: 1.5,
        holdDur: 7,
        exitVx: 0,
        exitVy: -110,
      });
    });
  }
}

function s2Mixed(em: EnemyManager): void {
  for (let i = 0; i < 3; i++) {
    em.schedule(i * 0.8, () => {
      em.spawn('gear', PF_CX, PF.y - 26, {
        kind: 'hover',
        tx: PF_CX - 70 + i * 70,
        ty: 130 + i * 55,
        inDur: 1.3,
        holdDur: 5.5,
        exitVx: 0,
        exitVy: 130,
      });
    });
  }
  s2KnifeRush(em, 6);
}

function s2FinalPush(em: EnemyManager): void {
  for (let i = 0; i < 6; i++) {
    em.schedule(i * 0.5, () => {
      const col = i % 3;
      em.spawn('gear', PF.x + 135 + col * 135, PF.y - 26, {
        kind: 'hover',
        tx: PF.x + 135 + col * 135,
        ty: 115 + Math.floor(i / 3) * 90,
        inDur: 1.3,
        holdDur: 6.5,
        exitVx: 0,
        exitVy: 130,
      });
    });
  }
  em.schedule(2.5, () => s2KnifeRush(em, 6));
  em.schedule(4, () => s2Bells(em, 2));
}

/* --------------------------- stage 3 waves --------------------------- */

function s3Moths(em: EnemyManager, n: number, offset = 0): void {
  for (let i = 0; i < n; i++) {
    em.schedule(offset + i * 0.55, () => {
      const left = i % 2 === 0;
      em.spawn('moth', left ? PF.x + 60 : PF_RIGHT - 60, PF.y - 20, {
        kind: 'spiral',
        cx: left ? PF.x + 160 : PF_RIGHT - 160,
        cvy: 22,
        r0: 130,
        rShrink: 16,
        angVel: left ? 125 : -125,
        holdDur: 6,
      });
    });
  }
}

function s3Eyes(em: EnemyManager, positions: [number, number][]): void {
  positions.forEach(([tx, ty], i) => {
    em.schedule(i * 0.6, () => {
      em.spawn('eye', tx, PF.y - 26, {
        kind: 'hover',
        tx,
        ty,
        inDur: 1.5,
        holdDur: 6.5,
        exitVx: tx < PF_CX ? -70 : 70,
        exitVy: -100,
      });
    });
  });
}

function s3Wraith(em: EnemyManager, x: number, delay = 0): void {
  em.schedule(delay, () => {
    em.spawn('wraith', x, PF.y - 30, { kind: 'drift', vy: 26, swayAmp: 42, swayFreq: 0.12 });
  });
}

function s3FinalPush(em: EnemyManager): void {
  s3Wraith(em, PF_CX, 0);
  s3Eyes(em, [
    [PF.x + 120, 130],
    [PF_RIGHT - 120, 130],
  ]);
  s3Moths(em, 8, 2.2);
}

/* ------------------------------ scripts ------------------------------ */

export const STAGES: StageScript[] = [
  {
    name: 'Stage 1 — Moonlit Garden',
    subtitle: 'Where dead petals still remember the moon',
    bg: 0,
    events: [
      { type: 'wait', s: 3.0 },
      { type: 'spawn', fn: (em) => s1LanternLine(em) },
      { type: 'wait', s: 7.0 },
      { type: 'spawn', fn: (em) => s1FairyArc(em, true) },
      { type: 'wait', s: 4.5 },
      { type: 'spawn', fn: (em) => s1FairyArc(em, false) },
      { type: 'wait', s: 6.5 },
      { type: 'spawn', fn: (em) => s1BirdSweeps(em, false) },
      { type: 'wait', s: 7.5 },
      { type: 'spawn', fn: (em) => s1Mixed(em) },
      { type: 'waitClear', timeout: 11 },
      { type: 'midboss', def: GARDEN_MIRROR },
      { type: 'upgrade' },
      { type: 'wait', s: 2.0 },
      { type: 'spawn', fn: (em) => s1BirdSweeps(em, true) },
      { type: 'wait', s: 7.0 },
      {
        type: 'spawn',
        fn: (em) => {
          s1FairyArc(em, true);
          s1FairyArc(em, false);
        },
      },
      { type: 'wait', s: 8.0 },
      { type: 'spawn', fn: (em) => s1FinalPush(em) },
      { type: 'waitClear', timeout: 12 },
      { type: 'boss', def: SILVER_GATE },
      { type: 'upgrade' },
    ],
  },
  {
    name: 'Stage 2 — Clockwork River',
    subtitle: 'Every ferry toll is paid in seconds',
    bg: 1,
    events: [
      { type: 'wait', s: 3.0 },
      { type: 'spawn', fn: (em) => s2GearColumns(em) },
      { type: 'wait', s: 8.0 },
      { type: 'spawn', fn: (em) => s2KnifeRush(em, 6) },
      { type: 'wait', s: 6.0 },
      { type: 'spawn', fn: (em) => s2Bells(em, 3) },
      { type: 'wait', s: 8.0 },
      { type: 'spawn', fn: (em) => s2Mixed(em) },
      { type: 'waitClear', timeout: 11 },
      { type: 'midboss', def: GEARHEART },
      { type: 'upgrade' },
      { type: 'wait', s: 2.0 },
      { type: 'spawn', fn: (em) => s2KnifeRush(em, 10) },
      { type: 'wait', s: 7.0 },
      {
        type: 'spawn',
        fn: (em) => {
          s2Bells(em, 4);
          em.schedule(2, () => s2GearColumns(em));
        },
      },
      { type: 'wait', s: 10.0 },
      { type: 'spawn', fn: (em) => s2FinalPush(em) },
      { type: 'waitClear', timeout: 12 },
      { type: 'boss', def: CHRONA },
      { type: 'upgrade' },
    ],
  },
  {
    name: 'Stage 3 — Eclipse Palace',
    subtitle: 'The throne room at the end of the light',
    bg: 2,
    events: [
      { type: 'wait', s: 3.0 },
      { type: 'spawn', fn: (em) => s3Moths(em, 6) },
      { type: 'wait', s: 8.0 },
      {
        type: 'spawn',
        fn: (em) =>
          s3Eyes(em, [
            [PF.x + 110, 140],
            [PF_RIGHT - 110, 140],
            [PF_CX, 185],
          ]),
      },
      { type: 'wait', s: 8.0 },
      {
        type: 'spawn',
        fn: (em) => {
          s3Wraith(em, PF_CX);
          s3Moths(em, 4, 1.2);
        },
      },
      { type: 'wait', s: 9.0 },
      { type: 'spawn', fn: (em) => s3Moths(em, 6) },
      { type: 'waitClear', timeout: 11 },
      { type: 'midboss', def: HOLLOW_CROWN },
      { type: 'upgrade' },
      { type: 'wait', s: 2.0 },
      {
        type: 'spawn',
        fn: (em) => {
          s3Wraith(em, PF.x + 130);
          s3Wraith(em, PF_RIGHT - 130, 1.4);
          s3Moths(em, 4, 1.8);
        },
      },
      { type: 'wait', s: 10.0 },
      {
        type: 'spawn',
        fn: (em) =>
          s3Eyes(em, [
            [PF.x + 90, 130],
            [PF.x + 230, 165],
            [PF_RIGHT - 230, 165],
            [PF_RIGHT - 90, 130],
          ]),
      },
      { type: 'wait', s: 9.0 },
      { type: 'spawn', fn: (em) => s3FinalPush(em) },
      { type: 'waitClear', timeout: 13 },
      { type: 'boss', def: NOCTILUCA },
    ],
  },
];
