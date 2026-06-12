import Phaser from 'phaser';
import { TAU } from '../utils/math';

type Ctx2D = CanvasRenderingContext2D;

function ct(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (c: Ctx2D, w: number, h: number) => void
): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  const c = tex.getContext();
  draw(c, w, h);
  tex.refresh();
}

function rgba(hex: number, a: number): string {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return `rgba(${r},${g},${b},${a})`;
}

function starPath(c: Ctx2D, cx: number, cy: number, points: number, rOut: number, rIn: number, rot = -Math.PI / 2): void {
  c.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOut : rIn;
    const a = rot + (i * Math.PI) / points;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
}

function gearPath(c: Ctx2D, cx: number, cy: number, rOut: number, rIn: number, teeth: number): void {
  c.beginPath();
  const step = TAU / (teeth * 2);
  for (let i = 0; i < teeth * 2; i++) {
    const r = i % 2 === 0 ? rOut : rIn;
    const a0 = i * step;
    const a1 = (i + 1) * step;
    c.arc(cx, cy, r, a0, a1);
  }
  c.closePath();
}

function glowTex(scene: Phaser.Scene, key: string, size: number, inner = 0.95): void {
  ct(scene, key, size, size, (c) => {
    const r = size / 2;
    const g = c.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, `rgba(255,255,255,${inner})`);
    g.addColorStop(0.35, 'rgba(255,255,255,0.42)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, size, size);
  });
}

function bulletTex(scene: Phaser.Scene, key: string, color: number, size = 24, ring?: number): void {
  ct(scene, key, size, size, (c) => {
    const r = size / 2;
    const glow = c.createRadialGradient(r, r, 1, r, r, r);
    glow.addColorStop(0, rgba(color, 0.9));
    glow.addColorStop(0.55, rgba(color, 0.3));
    glow.addColorStop(1, rgba(color, 0));
    c.fillStyle = glow;
    c.fillRect(0, 0, size, size);
    // dark outline for readability
    c.beginPath();
    c.arc(r, r, r * 0.6, 0, TAU);
    c.fillStyle = 'rgba(8,8,26,0.92)';
    c.fill();
    c.beginPath();
    c.arc(r, r, r * 0.52, 0, TAU);
    c.fillStyle = rgba(ring ?? color, 1);
    c.fill();
    c.beginPath();
    c.arc(r, r, r * 0.27, 0, TAU);
    c.fillStyle = '#ffffff';
    c.fill();
  });
}

function knifeTex(scene: Phaser.Scene, key: string, color: number): void {
  ct(scene, key, 34, 12, (c) => {
    c.shadowColor = rgba(color, 0.9);
    c.shadowBlur = 5;
    c.beginPath();
    c.moveTo(2, 6);
    c.lineTo(11, 2);
    c.lineTo(31, 6);
    c.lineTo(11, 10);
    c.closePath();
    c.fillStyle = rgba(color, 1);
    c.fill();
    c.shadowBlur = 0;
    c.strokeStyle = 'rgba(10,10,28,0.9)';
    c.lineWidth = 1.4;
    c.stroke();
    c.beginPath();
    c.moveTo(6, 6);
    c.lineTo(29, 6);
    c.strokeStyle = 'rgba(255,255,255,0.95)';
    c.lineWidth = 1.6;
    c.stroke();
  });
}

function starBulletTex(scene: Phaser.Scene, key: string, color: number): void {
  ct(scene, key, 22, 22, (c) => {
    c.shadowColor = rgba(color, 0.95);
    c.shadowBlur = 6;
    starPath(c, 11, 11, 4, 9, 3.6);
    c.fillStyle = rgba(color, 1);
    c.fill();
    c.shadowBlur = 0;
    c.strokeStyle = 'rgba(10,10,28,0.85)';
    c.lineWidth = 1.2;
    c.stroke();
    c.beginPath();
    c.arc(11, 11, 2.4, 0, TAU);
    c.fillStyle = '#ffffff';
    c.fill();
  });
}

/* ----------------------------- player art ----------------------------- */

function playerArt(scene: Phaser.Scene): void {
  ct(scene, 'player', 32, 40, (c) => {
    c.shadowColor = 'rgba(170,220,255,0.9)';
    c.shadowBlur = 7;
    // wing fins (shrine red)
    c.beginPath();
    c.moveTo(16, 14);
    c.lineTo(2, 28);
    c.lineTo(11, 30);
    c.closePath();
    c.fillStyle = '#d83a52';
    c.fill();
    c.beginPath();
    c.moveTo(16, 14);
    c.lineTo(30, 28);
    c.lineTo(21, 30);
    c.closePath();
    c.fill();
    // body diamond
    c.beginPath();
    c.moveTo(16, 2);
    c.lineTo(24, 22);
    c.lineTo(16, 38);
    c.lineTo(8, 22);
    c.closePath();
    c.fillStyle = '#f4f6ff';
    c.fill();
    c.shadowBlur = 0;
    c.strokeStyle = 'rgba(120,160,255,0.7)';
    c.lineWidth = 1.2;
    c.stroke();
    // red sash
    c.beginPath();
    c.moveTo(10, 24);
    c.lineTo(22, 24);
    c.lineTo(16, 34);
    c.closePath();
    c.fillStyle = '#e0405a';
    c.fill();
    // core
    c.beginPath();
    c.arc(16, 19, 3.4, 0, TAU);
    c.fillStyle = '#54e0ff';
    c.fill();
  });

  ct(scene, 'hitdot', 16, 16, (c) => {
    c.beginPath();
    c.arc(8, 8, 6, 0, TAU);
    c.fillStyle = 'rgba(255,60,90,0.95)';
    c.fill();
    c.beginPath();
    c.arc(8, 8, 4, 0, TAU);
    c.fillStyle = '#ffffff';
    c.fill();
  });

  ct(scene, 'focusring', 68, 68, (c) => {
    c.strokeStyle = 'rgba(255,255,255,0.75)';
    c.lineWidth = 1.4;
    c.beginPath();
    c.arc(34, 34, 27, 0, TAU);
    c.stroke();
    c.strokeStyle = 'rgba(140,220,255,0.4)';
    c.beginPath();
    c.arc(34, 34, 20, 0, TAU);
    c.stroke();
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      c.beginPath();
      c.moveTo(34 + Math.cos(a) * 23, 34 + Math.sin(a) * 23);
      c.lineTo(34 + Math.cos(a) * 30, 34 + Math.sin(a) * 30);
      c.strokeStyle = 'rgba(255,255,255,0.85)';
      c.lineWidth = 2;
      c.stroke();
    }
  });

  ct(scene, 'option', 16, 16, (c) => {
    c.shadowColor = 'rgba(190,130,255,0.95)';
    c.shadowBlur = 5;
    c.beginPath();
    c.moveTo(8, 1);
    c.lineTo(14, 8);
    c.lineTo(8, 15);
    c.lineTo(2, 8);
    c.closePath();
    c.fillStyle = '#cfa6ff';
    c.fill();
    c.shadowBlur = 0;
    c.beginPath();
    c.arc(8, 8, 2.2, 0, TAU);
    c.fillStyle = '#ffffff';
    c.fill();
  });

  ct(scene, 'pb-main', 12, 28, (c) => {
    const g = c.createLinearGradient(0, 0, 12, 0);
    g.addColorStop(0, 'rgba(80,220,255,0)');
    g.addColorStop(0.5, 'rgba(80,220,255,0.55)');
    g.addColorStop(1, 'rgba(80,220,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 12, 28);
    c.fillStyle = 'rgba(235,250,255,0.95)';
    c.fillRect(4, 2, 4, 24);
    c.fillStyle = '#ffffff';
    c.fillRect(5, 4, 2, 20);
  });

  ct(scene, 'pb-side', 10, 20, (c) => {
    const g = c.createLinearGradient(0, 0, 10, 0);
    g.addColorStop(0, 'rgba(255,150,220,0)');
    g.addColorStop(0.5, 'rgba(255,150,220,0.5)');
    g.addColorStop(1, 'rgba(255,150,220,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 10, 20);
    c.fillStyle = 'rgba(255,235,250,0.95)';
    c.fillRect(3.5, 2, 3, 16);
  });

  ct(scene, 'pb-laser', 16, 56, (c) => {
    const g = c.createLinearGradient(0, 0, 16, 0);
    g.addColorStop(0, 'rgba(120,240,255,0)');
    g.addColorStop(0.5, 'rgba(120,240,255,0.7)');
    g.addColorStop(1, 'rgba(120,240,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 16, 56);
    c.fillStyle = 'rgba(255,255,255,0.92)';
    c.fillRect(6, 0, 4, 56);
  });

  ct(scene, 'pb-opt', 8, 16, (c) => {
    c.fillStyle = 'rgba(200,140,255,0.55)';
    c.fillRect(1, 0, 6, 16);
    c.fillStyle = 'rgba(245,230,255,0.95)';
    c.fillRect(2.5, 2, 3, 12);
  });
}

/* ----------------------------- enemy art ----------------------------- */

function enemyArt(scene: Phaser.Scene): void {
  ct(scene, 'e-lantern', 26, 32, (c) => {
    c.shadowColor = 'rgba(255,160,70,0.95)';
    c.shadowBlur = 8;
    c.fillStyle = '#ff9a3d';
    c.beginPath();
    c.roundRect(7, 8, 12, 17, 4);
    c.fill();
    c.shadowBlur = 0;
    const g = c.createRadialGradient(13, 16, 1, 13, 16, 8);
    g.addColorStop(0, 'rgba(255,245,200,0.95)');
    g.addColorStop(1, 'rgba(255,245,200,0)');
    c.fillStyle = g;
    c.fillRect(5, 8, 16, 17);
    c.fillStyle = '#2a1f3d';
    c.fillRect(6, 5, 14, 4);
    c.fillRect(6, 24, 14, 4);
    c.fillRect(12, 1, 2, 5);
  });

  ct(scene, 'e-fairy', 28, 28, (c) => {
    c.shadowColor = 'rgba(255,140,210,0.9)';
    c.shadowBlur = 6;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * TAU) / 5;
      c.save();
      c.translate(14 + Math.cos(a) * 7, 14 + Math.sin(a) * 7);
      c.rotate(a + Math.PI / 2);
      c.beginPath();
      c.ellipse(0, 0, 4, 7, 0, 0, TAU);
      c.fillStyle = 'rgba(255,143,208,0.95)';
      c.fill();
      c.restore();
    }
    c.shadowBlur = 0;
    c.beginPath();
    c.arc(14, 14, 4.2, 0, TAU);
    c.fillStyle = '#fff6fb';
    c.fill();
    c.strokeStyle = 'rgba(255,90,180,0.8)';
    c.lineWidth = 1;
    c.stroke();
  });

  ct(scene, 'e-bird', 30, 24, (c) => {
    c.shadowColor = 'rgba(120,235,255,0.9)';
    c.shadowBlur = 6;
    c.beginPath();
    c.moveTo(2, 18);
    c.lineTo(15, 4);
    c.lineTo(28, 18);
    c.lineTo(15, 12);
    c.closePath();
    c.fillStyle = '#7fe8ff';
    c.fill();
    c.shadowBlur = 0;
    c.strokeStyle = 'rgba(20,60,90,0.8)';
    c.lineWidth = 1.2;
    c.stroke();
    c.beginPath();
    c.arc(15, 9, 1.6, 0, TAU);
    c.fillStyle = '#1a2740';
    c.fill();
  });

  ct(scene, 'e-gear', 30, 30, (c) => {
    c.shadowColor = 'rgba(220,160,70,0.9)';
    c.shadowBlur = 6;
    gearPath(c, 15, 15, 14, 10.5, 8);
    c.fillStyle = '#c8893a';
    c.fill();
    c.shadowBlur = 0;
    c.strokeStyle = 'rgba(60,35,10,0.8)';
    c.lineWidth = 1.2;
    c.stroke();
    c.beginPath();
    c.arc(15, 15, 6.5, 0, TAU);
    c.fillStyle = '#e8b96a';
    c.fill();
    c.beginPath();
    c.arc(15, 15, 3, 0, TAU);
    c.fillStyle = '#3a2410';
    c.fill();
  });

  ct(scene, 'e-knife', 32, 14, (c) => {
    c.shadowColor = 'rgba(170,200,235,0.9)';
    c.shadowBlur = 5;
    c.beginPath();
    c.moveTo(2, 7);
    c.lineTo(12, 2);
    c.lineTo(30, 7);
    c.lineTo(12, 12);
    c.closePath();
    c.fillStyle = '#9fb8d8';
    c.fill();
    c.shadowBlur = 0;
    c.strokeStyle = 'rgba(20,30,60,0.85)';
    c.lineWidth = 1.2;
    c.stroke();
    c.beginPath();
    c.moveTo(7, 7);
    c.lineTo(28, 7);
    c.strokeStyle = 'rgba(255,255,255,0.9)';
    c.lineWidth = 1.2;
    c.stroke();
  });

  ct(scene, 'e-bell', 26, 30, (c) => {
    c.shadowColor = 'rgba(255,210,80,0.9)';
    c.shadowBlur = 6;
    c.beginPath();
    c.moveTo(5, 22);
    c.quadraticCurveTo(5, 6, 13, 5);
    c.quadraticCurveTo(21, 6, 21, 22);
    c.lineTo(24, 25);
    c.lineTo(2, 25);
    c.closePath();
    c.fillStyle = '#ffd24d';
    c.fill();
    c.shadowBlur = 0;
    c.strokeStyle = 'rgba(90,60,10,0.8)';
    c.lineWidth = 1.2;
    c.stroke();
    c.beginPath();
    c.arc(13, 27, 2.2, 0, TAU);
    c.fillStyle = '#8a5a10';
    c.fill();
    c.fillRect(11, 1, 4, 4);
  });

  ct(scene, 'e-moth', 30, 26, (c) => {
    c.shadowColor = 'rgba(182,108,255,0.9)';
    c.shadowBlur = 6;
    c.beginPath();
    c.moveTo(15, 12);
    c.lineTo(2, 3);
    c.lineTo(5, 17);
    c.closePath();
    c.fillStyle = '#b66cff';
    c.fill();
    c.beginPath();
    c.moveTo(15, 12);
    c.lineTo(28, 3);
    c.lineTo(25, 17);
    c.closePath();
    c.fill();
    c.shadowBlur = 0;
    c.beginPath();
    c.ellipse(15, 14, 3, 8, 0, 0, TAU);
    c.fillStyle = '#e7d4ff';
    c.fill();
    c.beginPath();
    c.arc(7, 9, 1.8, 0, TAU);
    c.arc(23, 9, 1.8, 0, TAU);
    c.fillStyle = '#fff';
    c.fill();
  });

  ct(scene, 'e-eye', 30, 30, (c) => {
    c.shadowColor = 'rgba(255,240,240,0.85)';
    c.shadowBlur = 6;
    c.beginPath();
    c.ellipse(15, 15, 13, 8.5, 0, 0, TAU);
    c.fillStyle = '#f2eef6';
    c.fill();
    c.shadowBlur = 0;
    c.strokeStyle = 'rgba(80,30,80,0.85)';
    c.lineWidth = 1.4;
    c.stroke();
    c.beginPath();
    c.arc(15, 15, 6, 0, TAU);
    c.fillStyle = '#ff4455';
    c.fill();
    c.beginPath();
    c.arc(15, 15, 2.6, 0, TAU);
    c.fillStyle = '#1a0a14';
    c.fill();
    c.beginPath();
    c.arc(13, 13, 1.1, 0, TAU);
    c.fillStyle = '#fff';
    c.fill();
  });

  ct(scene, 'e-wraith', 34, 38, (c) => {
    c.shadowColor = 'rgba(140,80,255,0.9)';
    c.shadowBlur = 8;
    c.beginPath();
    c.moveTo(17, 6);
    c.quadraticCurveTo(29, 14, 27, 34);
    c.lineTo(22, 30);
    c.lineTo(17, 35);
    c.lineTo(12, 30);
    c.lineTo(7, 34);
    c.quadraticCurveTo(5, 14, 17, 6);
    c.closePath();
    c.fillStyle = '#2b2342';
    c.fill();
    c.shadowBlur = 0;
    c.strokeStyle = 'rgba(170,120,255,0.6)';
    c.lineWidth = 1.2;
    c.stroke();
    // crown
    c.beginPath();
    c.moveTo(9, 7);
    c.lineTo(11, 1);
    c.lineTo(14, 5);
    c.lineTo(17, 0);
    c.lineTo(20, 5);
    c.lineTo(23, 1);
    c.lineTo(25, 7);
    c.closePath();
    c.fillStyle = '#ffd24d';
    c.fill();
    // eyes
    c.beginPath();
    c.arc(12.5, 16, 1.8, 0, TAU);
    c.arc(21.5, 16, 1.8, 0, TAU);
    c.fillStyle = '#6ff7ff';
    c.fill();
  });
}

/* ----------------------------- boss art ----------------------------- */

function bossArt(scene: Phaser.Scene): void {
  ct(scene, 'boss-mirror', 68, 68, (c) => {
    c.shadowColor = 'rgba(140,235,255,0.95)';
    c.shadowBlur = 10;
    c.beginPath();
    c.moveTo(34, 4);
    c.lineTo(58, 34);
    c.lineTo(34, 64);
    c.lineTo(10, 34);
    c.closePath();
    const g = c.createLinearGradient(10, 4, 58, 64);
    g.addColorStop(0, '#bff4ff');
    g.addColorStop(0.5, '#5fc8e8');
    g.addColorStop(1, '#2a6f9e');
    c.fillStyle = g;
    c.fill();
    c.shadowBlur = 0;
    c.strokeStyle = '#e8eef6';
    c.lineWidth = 3;
    c.stroke();
    c.beginPath();
    c.moveTo(22, 22);
    c.lineTo(40, 14);
    c.moveTo(26, 34);
    c.lineTo(46, 24);
    c.strokeStyle = 'rgba(255,255,255,0.8)';
    c.lineWidth = 2;
    c.stroke();
  });

  ct(scene, 'boss-silver', 76, 76, (c) => {
    c.shadowColor = 'rgba(230,235,255,0.9)';
    c.shadowBlur = 9;
    // gate arc
    c.beginPath();
    c.arc(38, 38, 32, Math.PI * 0.8, Math.PI * 2.2);
    c.strokeStyle = '#cfd6e8';
    c.lineWidth = 5;
    c.stroke();
    // figure
    c.beginPath();
    c.moveTo(38, 10);
    c.lineTo(50, 42);
    c.lineTo(38, 68);
    c.lineTo(26, 42);
    c.closePath();
    c.fillStyle = '#f4f6ff';
    c.fill();
    c.shadowBlur = 0;
    c.strokeStyle = 'rgba(180,190,230,0.9)';
    c.lineWidth = 1.6;
    c.stroke();
    // halo
    c.beginPath();
    c.arc(38, 16, 10, 0, TAU);
    c.strokeStyle = 'rgba(255,210,240,0.9)';
    c.lineWidth = 2;
    c.stroke();
    // gem
    c.beginPath();
    c.arc(38, 38, 5, 0, TAU);
    c.fillStyle = '#ff8fd0';
    c.fill();
  });

  ct(scene, 'boss-gear', 80, 80, (c) => {
    c.shadowColor = 'rgba(235,170,80,0.95)';
    c.shadowBlur = 10;
    gearPath(c, 40, 40, 37, 29, 10);
    c.fillStyle = '#b5772c';
    c.fill();
    c.shadowBlur = 0;
    c.strokeStyle = 'rgba(60,35,10,0.9)';
    c.lineWidth = 2;
    c.stroke();
    c.beginPath();
    c.arc(40, 40, 22, 0, TAU);
    c.fillStyle = '#1d1426';
    c.fill();
    c.strokeStyle = '#e8b96a';
    c.lineWidth = 2.5;
    c.stroke();
    const g = c.createRadialGradient(40, 40, 1, 40, 40, 15);
    g.addColorStop(0, 'rgba(255,230,160,1)');
    g.addColorStop(1, 'rgba(255,150,50,0.1)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(40, 40, 15, 0, TAU);
    c.fill();
  });

  ct(scene, 'boss-chrona', 84, 84, (c) => {
    c.shadowColor = 'rgba(255,225,120,0.95)';
    c.shadowBlur = 10;
    c.beginPath();
    c.arc(42, 42, 36, 0, TAU);
    c.fillStyle = '#f5f1e2';
    c.fill();
    c.shadowBlur = 0;
    c.strokeStyle = '#caa83e';
    c.lineWidth = 5;
    c.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i * TAU) / 12;
      c.beginPath();
      c.moveTo(42 + Math.cos(a) * 28, 42 + Math.sin(a) * 28);
      c.lineTo(42 + Math.cos(a) * 32, 42 + Math.sin(a) * 32);
      c.strokeStyle = '#5a4a20';
      c.lineWidth = i % 3 === 0 ? 3 : 1.6;
      c.stroke();
    }
    // hands
    c.beginPath();
    c.moveTo(42, 42);
    c.lineTo(42 + 20, 42 - 12);
    c.strokeStyle = '#7a3cc8';
    c.lineWidth = 4;
    c.stroke();
    c.beginPath();
    c.moveTo(42, 42);
    c.lineTo(42 - 8, 42 - 24);
    c.lineWidth = 3;
    c.stroke();
    c.beginPath();
    c.arc(42, 42, 4, 0, TAU);
    c.fillStyle = '#e0405a';
    c.fill();
  });

  ct(scene, 'boss-crown', 72, 64, (c) => {
    c.shadowColor = 'rgba(160,90,255,0.95)';
    c.shadowBlur = 12;
    // void beneath
    const g = c.createRadialGradient(36, 44, 2, 36, 44, 24);
    g.addColorStop(0, 'rgba(60,20,110,0.95)');
    g.addColorStop(1, 'rgba(60,20,110,0)');
    c.fillStyle = g;
    c.fillRect(8, 22, 56, 44);
    // crown
    c.beginPath();
    c.moveTo(12, 16);
    c.lineTo(18, 38);
    c.lineTo(54, 38);
    c.lineTo(60, 16);
    c.lineTo(48, 26);
    c.lineTo(36, 8);
    c.lineTo(24, 26);
    c.closePath();
    c.fillStyle = '#ffd24d';
    c.fill();
    c.shadowBlur = 0;
    c.strokeStyle = 'rgba(120,70,10,0.9)';
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = '#3a2a4d';
    c.fillRect(18, 38, 36, 7);
    for (const [x, col] of [
      [24, '#ff4060'],
      [36, '#54e0ff'],
      [48, '#b66cff'],
    ] as [number, string][]) {
      c.beginPath();
      c.arc(x, 41.5, 2.6, 0, TAU);
      c.fillStyle = col;
      c.fill();
    }
  });

  ct(scene, 'boss-noct', 92, 92, (c) => {
    // wing blades
    c.shadowColor = 'rgba(255,255,255,0.85)';
    c.shadowBlur = 8;
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6 + Math.PI / 6;
      c.save();
      c.translate(46 + Math.cos(a) * 30, 46 + Math.sin(a) * 30);
      c.rotate(a);
      c.beginPath();
      c.ellipse(0, 0, 16, 5, 0, 0, TAU);
      c.fillStyle = 'rgba(240,244,255,0.92)';
      c.fill();
      c.restore();
    }
    // corona
    const cor = c.createRadialGradient(46, 46, 18, 46, 46, 34);
    cor.addColorStop(0, 'rgba(255,90,60,0.95)');
    cor.addColorStop(0.6, 'rgba(255,60,80,0.4)');
    cor.addColorStop(1, 'rgba(255,60,80,0)');
    c.fillStyle = cor;
    c.beginPath();
    c.arc(46, 46, 34, 0, TAU);
    c.fill();
    c.shadowBlur = 0;
    // black disc
    c.beginPath();
    c.arc(46, 46, 22, 0, TAU);
    c.fillStyle = '#06030a';
    c.fill();
    c.strokeStyle = 'rgba(255,240,230,0.95)';
    c.lineWidth = 2;
    c.stroke();
    // red gem
    c.beginPath();
    c.arc(46, 46, 5, 0, TAU);
    c.fillStyle = '#ff2444';
    c.fill();
  });
}

/* ----------------------------- world art ----------------------------- */

function sigilTex(scene: Phaser.Scene): void {
  ct(scene, 'sigil', 256, 256, (c) => {
    const cx = 128;
    const cy = 128;
    c.strokeStyle = 'rgba(255,255,255,0.9)';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(cx, cy, 118, 0, TAU);
    c.stroke();
    c.lineWidth = 1;
    c.beginPath();
    c.arc(cx, cy, 102, 0, TAU);
    c.stroke();
    c.lineWidth = 2;
    c.beginPath();
    c.arc(cx, cy, 66, 0, TAU);
    c.stroke();
    // hexagram
    for (const off of [0, Math.PI / 3]) {
      c.beginPath();
      for (let i = 0; i <= 3; i++) {
        const a = off + (i * TAU) / 3 - Math.PI / 2;
        const x = cx + Math.cos(a) * 100;
        const y = cy + Math.sin(a) * 100;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.lineWidth = 1.6;
      c.stroke();
    }
    // ticks
    for (let i = 0; i < 24; i++) {
      const a = (i * TAU) / 24;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * 104, cy + Math.sin(a) * 104);
      c.lineTo(cx + Math.cos(a) * (i % 2 === 0 ? 116 : 110), cy + Math.sin(a) * (i % 2 === 0 ? 116 : 110));
      c.lineWidth = 1.4;
      c.stroke();
    }
    // rune dashes
    for (let i = 0; i < 18; i++) {
      const a0 = (i * TAU) / 18 + 0.06;
      const a1 = a0 + 0.12 + (i % 3) * 0.05;
      c.beginPath();
      c.arc(cx, cy, 84, a0, a1);
      c.lineWidth = 4;
      c.stroke();
    }
    // vertex dots
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6 - Math.PI / 2;
      c.beginPath();
      c.arc(cx + Math.cos(a) * 100, cy + Math.sin(a) * 100, 5, 0, TAU);
      c.fillStyle = 'rgba(255,255,255,0.95)';
      c.fill();
    }
  });
}

function pickupArt(scene: Phaser.Scene): void {
  ct(scene, 'p-power', 18, 18, (c) => {
    c.fillStyle = '#e02446';
    c.beginPath();
    c.roundRect(1.5, 1.5, 15, 15, 3.5);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.9)';
    c.lineWidth = 1.4;
    c.stroke();
    c.fillStyle = '#ffffff';
    c.font = 'bold 12px monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('P', 9, 10);
  });

  ct(scene, 'p-point', 18, 18, (c) => {
    c.fillStyle = '#2456e0';
    c.beginPath();
    c.roundRect(1.5, 1.5, 15, 15, 3.5);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.9)';
    c.lineWidth = 1.4;
    c.stroke();
    starPath(c, 9, 9, 4, 5.5, 2.2);
    c.fillStyle = '#cfe2ff';
    c.fill();
  });

  ct(scene, 'p-star', 12, 12, (c) => {
    c.shadowColor = 'rgba(255,230,110,0.95)';
    c.shadowBlur = 4;
    starPath(c, 6, 6, 4, 5, 2);
    c.fillStyle = '#ffe26e';
    c.fill();
  });

  ct(scene, 'p-bomb', 20, 20, (c) => {
    c.fillStyle = '#1d9e50';
    c.beginPath();
    c.roundRect(1.5, 1.5, 17, 17, 4);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.95)';
    c.lineWidth = 1.6;
    c.stroke();
    starPath(c, 10, 10, 5, 6.5, 2.8);
    c.fillStyle = '#dfffe8';
    c.fill();
  });

  ct(scene, 'p-life', 20, 20, (c) => {
    c.fillStyle = '#e23a8e';
    c.beginPath();
    c.roundRect(1.5, 1.5, 17, 17, 4);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.95)';
    c.lineWidth = 1.6;
    c.stroke();
    // heart
    c.beginPath();
    c.moveTo(10, 15);
    c.bezierCurveTo(3, 10, 4.5, 4, 10, 7.5);
    c.bezierCurveTo(15.5, 4, 17, 10, 10, 15);
    c.fillStyle = '#ffe2f0';
    c.fill();
  });

  ct(scene, 'icon-life', 14, 16, (c) => {
    c.beginPath();
    c.moveTo(7, 0.5);
    c.lineTo(11, 8);
    c.lineTo(7, 15.5);
    c.lineTo(3, 8);
    c.closePath();
    c.fillStyle = '#f4f6ff';
    c.fill();
    c.strokeStyle = '#e0405a';
    c.lineWidth = 1.4;
    c.stroke();
  });

  ct(scene, 'icon-bomb', 16, 16, (c) => {
    starPath(c, 8, 8, 5, 7, 3);
    c.fillStyle = '#5fe88f';
    c.fill();
    c.strokeStyle = 'rgba(10,60,30,0.8)';
    c.lineWidth = 1;
    c.stroke();
  });
}

function backgroundArt(scene: Phaser.Scene): void {
  // star tiles, three densities
  const starCfg = [
    { key: 'stars0', n: 90, rMax: 1.1, aMax: 0.5 },
    { key: 'stars1', n: 45, rMax: 1.6, aMax: 0.8 },
    { key: 'stars2', n: 18, rMax: 2.4, aMax: 1.0 },
  ];
  for (const cfg of starCfg) {
    ct(scene, cfg.key, 256, 256, (c) => {
      const cols = ['255,255,255', '190,210,255', '230,190,255', '255,220,220'];
      for (let i = 0; i < cfg.n; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const r = 0.4 + Math.random() * cfg.rMax;
        c.beginPath();
        c.arc(x, y, r, 0, TAU);
        c.fillStyle = `rgba(${cols[i % cols.length]},${(0.2 + Math.random() * cfg.aMax).toFixed(2)})`;
        c.fill();
      }
    });
  }

  const makeGrad = (
    key: string,
    stops: [number, string][],
    blobs: { x: number; y: number; r: number; col: string }[]
  ) => {
    ct(scene, key, 480, 360, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h);
      for (const [p, col] of stops) g.addColorStop(p, col);
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
      for (const b of blobs) {
        const rg = c.createRadialGradient(b.x, b.y, 1, b.x, b.y, b.r);
        rg.addColorStop(0, b.col);
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = rg;
        c.fillRect(0, 0, w, h);
      }
    });
  };

  makeGrad(
    'grad-0',
    [
      [0, '#070418'],
      [0.5, '#140b2e'],
      [1, '#0c1430'],
    ],
    [
      { x: 120, y: 90, r: 160, col: 'rgba(90,60,180,0.16)' },
      { x: 360, y: 250, r: 190, col: 'rgba(50,90,200,0.13)' },
      { x: 240, y: 330, r: 150, col: 'rgba(190,90,200,0.08)' },
    ]
  );
  makeGrad(
    'grad-1',
    [
      [0, '#04070f'],
      [0.55, '#0a1a26'],
      [1, '#0d2430'],
    ],
    [
      { x: 90, y: 200, r: 170, col: 'rgba(40,160,180,0.13)' },
      { x: 380, y: 110, r: 150, col: 'rgba(190,140,60,0.10)' },
      { x: 250, y: 320, r: 170, col: 'rgba(40,110,190,0.10)' },
    ]
  );
  makeGrad(
    'grad-2',
    [
      [0, '#0c0309'],
      [0.5, '#1c0712'],
      [1, '#240a0d'],
    ],
    [
      { x: 240, y: 100, r: 190, col: 'rgba(220,50,60,0.14)' },
      { x: 100, y: 300, r: 160, col: 'rgba(140,30,120,0.12)' },
      { x: 400, y: 280, r: 150, col: 'rgba(255,90,40,0.08)' },
    ]
  );

  ct(scene, 'moon', 150, 150, (c) => {
    const g = c.createRadialGradient(75, 75, 30, 75, 75, 75);
    g.addColorStop(0, 'rgba(220,228,255,0.5)');
    g.addColorStop(1, 'rgba(220,228,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 150, 150);
    c.beginPath();
    c.arc(75, 75, 44, 0, TAU);
    c.fillStyle = '#e6eaff';
    c.fill();
    c.fillStyle = 'rgba(150,160,210,0.25)';
    for (const [x, y, r] of [
      [60, 62, 9],
      [90, 80, 12],
      [70, 95, 6],
      [95, 55, 5],
    ]) {
      c.beginPath();
      c.arc(x, y, r, 0, TAU);
      c.fill();
    }
  });

  ct(scene, 'eclipse', 240, 240, (c) => {
    const cor = c.createRadialGradient(120, 120, 60, 120, 120, 118);
    cor.addColorStop(0, 'rgba(255,120,60,0.85)');
    cor.addColorStop(0.4, 'rgba(255,60,70,0.35)');
    cor.addColorStop(1, 'rgba(255,60,70,0)');
    c.fillStyle = cor;
    c.fillRect(0, 0, 240, 240);
    c.beginPath();
    c.arc(120, 120, 62, 0, TAU);
    c.fillStyle = '#050208';
    c.fill();
    c.strokeStyle = 'rgba(255,235,210,0.95)';
    c.lineWidth = 2.5;
    c.stroke();
  });

  ct(scene, 'gearbg', 180, 180, (c) => {
    gearPath(c, 90, 90, 84, 66, 12);
    c.strokeStyle = 'rgba(255,255,255,0.9)';
    c.lineWidth = 5;
    c.stroke();
    c.beginPath();
    c.arc(90, 90, 40, 0, TAU);
    c.lineWidth = 4;
    c.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6;
      c.beginPath();
      c.moveTo(90 + Math.cos(a) * 40, 90 + Math.sin(a) * 40);
      c.lineTo(90 + Math.cos(a) * 66, 90 + Math.sin(a) * 66);
      c.lineWidth = 4;
      c.stroke();
    }
  });

  ct(scene, 'streaks', 48, 256, (c) => {
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * 48;
      const y = Math.random() * 256;
      const len = 30 + Math.random() * 80;
      const g = c.createLinearGradient(0, y, 0, y + len);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(180,230,255,0.22)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(x, y, 1.6, len);
    }
  });

  ct(scene, 'petal', 14, 18, (c) => {
    c.beginPath();
    c.ellipse(7, 9, 4, 8, 0.4, 0, TAU);
    const g = c.createLinearGradient(0, 0, 14, 18);
    g.addColorStop(0, 'rgba(255,170,220,0.95)');
    g.addColorStop(1, 'rgba(255,110,180,0.7)');
    c.fillStyle = g;
    c.fill();
  });

  ct(scene, 'ember', 10, 10, (c) => {
    const g = c.createRadialGradient(5, 5, 0, 5, 5, 5);
    g.addColorStop(0, 'rgba(255,210,130,1)');
    g.addColorStop(0.5, 'rgba(255,130,50,0.6)');
    g.addColorStop(1, 'rgba(255,130,50,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 10, 10);
  });
}

/* ----------------------------- entry ----------------------------- */

export function generateAllTextures(scene: Phaser.Scene): void {
  // tiny utilities
  ct(scene, 'px', 4, 4, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 4, 4);
  });
  glowTex(scene, 'glow32', 32);
  glowTex(scene, 'glow64', 64);
  glowTex(scene, 'glow128', 128, 0.8);
  ct(scene, 'spark', 12, 12, (c) => {
    const g = c.createRadialGradient(6, 6, 0, 6, 6, 6);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 12, 12);
  });
  ct(scene, 'ring64', 64, 64, (c) => {
    c.strokeStyle = 'rgba(255,255,255,0.9)';
    c.lineWidth = 4;
    c.beginPath();
    c.arc(32, 32, 27, 0, TAU);
    c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.3)';
    c.lineWidth = 8;
    c.beginPath();
    c.arc(32, 32, 25, 0, TAU);
    c.stroke();
  });

  // enemy bullets
  bulletTex(scene, 'b-red', 0xff3355, 24);
  bulletTex(scene, 'b-pink', 0xff7fd4, 24);
  bulletTex(scene, 'b-blue', 0x3f7bff, 26);
  bulletTex(scene, 'b-cyan', 0x39e6ff, 24);
  bulletTex(scene, 'b-yellow', 0xffe14d, 24);
  bulletTex(scene, 'b-orange', 0xff9633, 24);
  bulletTex(scene, 'b-purple', 0xc45cff, 26);
  bulletTex(scene, 'b-white', 0xaac8ff, 26, 0xf4f6ff);
  bulletTex(scene, 'b-redbig', 0xff3355, 40);
  bulletTex(scene, 'b-whitebig', 0xaac8ff, 40, 0xf4f6ff);
  starBulletTex(scene, 'b-star', 0xffe14d);
  knifeTex(scene, 'knife-y', 0xffe14d);
  knifeTex(scene, 'knife-o', 0xff9633);
  knifeTex(scene, 'knife-r', 0xff3355);

  playerArt(scene);
  enemyArt(scene);
  bossArt(scene);
  sigilTex(scene);
  pickupArt(scene);
  backgroundArt(scene);
}
