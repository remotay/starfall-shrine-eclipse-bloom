import Phaser from 'phaser';
import { DEPTH, H, PF, PF_BOTTOM, PF_CX, PF_RIGHT, W } from '../game/constants';
import { upgradeShortName } from '../systems/UpgradeSystem';
import type { Boss } from '../entities/Boss';
import type { GameRefs, UpgradeId } from '../types';

const PANEL_X = 624;
const NUM_FONT = 'Consolas, "Courier New", monospace';
const TITLE_FONT = 'Georgia, "Times New Roman", serif';

function label(scene: Phaser.Scene, x: number, y: number, str: string): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, str, { fontFamily: TITLE_FONT, fontSize: '13px', color: '#8d7bb5' })
    .setDepth(DEPTH.UI);
}

function value(scene: Phaser.Scene, x: number, y: number, size = 20): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, '', { fontFamily: NUM_FONT, fontSize: `${size}px`, color: '#f0ecff' })
    .setDepth(DEPTH.UI);
}

/** Right-side panel, playfield frame, boss HP bar, stage/boss title cards. */
export class HUD {
  private scene: Phaser.Scene;
  private score!: Phaser.GameObjects.Text;
  private hi!: Phaser.GameObjects.Text;
  private grazeTxt!: Phaser.GameObjects.Text;
  private multTxt!: Phaser.GameObjects.Text;
  private stageTxt!: Phaser.GameObjects.Text;
  private upgTxt!: Phaser.GameObjects.Text;
  private powerTxt!: Phaser.GameObjects.Text;
  private powerBar!: Phaser.GameObjects.Graphics;
  private lifeIcons: Phaser.GameObjects.Image[] = [];
  private bombIcons: Phaser.GameObjects.Image[] = [];

  private bossBar!: Phaser.GameObjects.Graphics;
  private bossName!: Phaser.GameObjects.Text;
  private bossTimer!: Phaser.GameObjects.Text;
  private bossDots!: Phaser.GameObjects.Text;

  // caches to avoid text churn
  private cScore = -1;
  private cHi = -1;
  private cGraze = -1;
  private cMult = '';
  private cPower = -1;
  private cLives = -1;
  private cBombs = -1;
  private cUpg = '';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.buildFrame();
    this.buildPanel();
    this.buildBossUI();
  }

  private buildFrame(): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.FRAME);
    g.fillStyle(0x0b0716, 1);
    g.fillRect(0, 0, PF.x, H);
    g.fillRect(PF_RIGHT, 0, W - PF_RIGHT, H);
    g.fillRect(PF.x, 0, PF.w, PF.y);
    g.fillRect(PF.x, PF_BOTTOM, PF.w, H - PF_BOTTOM);
    // border glow
    g.lineStyle(7, 0x7a5cff, 0.16);
    g.strokeRect(PF.x - 3, PF.y - 3, PF.w + 6, PF.h + 6);
    g.lineStyle(2, 0x9a7cff, 0.85);
    g.strokeRect(PF.x - 1, PF.y - 1, PF.w + 2, PF.h + 2);
    // panel divider
    g.lineStyle(1, 0x4a3a7a, 0.9);
    g.lineBetween(608, 24, 608, H - 24);
  }

  private buildPanel(): void {
    const s = this.scene;
    s.add
      .text(PANEL_X, 38, 'STARFALL SHRINE', {
        fontFamily: TITLE_FONT,
        fontSize: '24px',
        color: '#ffd9a0',
        fontStyle: 'bold',
      })
      .setDepth(DEPTH.UI);
    s.add
      .text(PANEL_X, 66, '~ Eclipse Bloom ~', { fontFamily: TITLE_FONT, fontSize: '16px', color: '#ff8fd0', fontStyle: 'italic' })
      .setDepth(DEPTH.UI);

    label(s, PANEL_X, 104, 'SCORE');
    this.score = value(s, PANEL_X, 120, 24);
    label(s, PANEL_X, 152, 'HI-SCORE');
    this.hi = value(s, PANEL_X, 168, 16);

    label(s, PANEL_X, 200, 'LIVES');
    for (let i = 0; i < 8; i++) {
      this.lifeIcons.push(
        s.add.image(PANEL_X + 8 + i * 22, 228, 'icon-life').setDepth(DEPTH.UI).setVisible(false)
      );
    }
    label(s, PANEL_X, 246, 'BOMBS');
    for (let i = 0; i < 8; i++) {
      this.bombIcons.push(
        s.add.image(PANEL_X + 8 + i * 22, 274, 'icon-bomb').setDepth(DEPTH.UI).setVisible(false)
      );
    }

    label(s, PANEL_X, 294, 'POWER');
    this.powerBar = s.add.graphics().setDepth(DEPTH.UI);
    this.powerTxt = value(s, PANEL_X + 218, 308, 13);

    label(s, PANEL_X, 336, 'GRAZE');
    this.grazeTxt = value(s, PANEL_X + 70, 334, 18);
    this.multTxt = s.add
      .text(PANEL_X + 170, 334, '', { fontFamily: NUM_FONT, fontSize: '18px', color: '#ffe14d' })
      .setDepth(DEPTH.UI);

    this.stageTxt = s.add
      .text(PANEL_X, 378, '', {
        fontFamily: TITLE_FONT,
        fontSize: '15px',
        color: '#b8a8e8',
        wordWrap: { width: 310 },
      })
      .setDepth(DEPTH.UI);

    label(s, PANEL_X, 420, 'BLESSINGS');
    this.upgTxt = s.add
      .text(PANEL_X, 440, '', {
        fontFamily: TITLE_FONT,
        fontSize: '14px',
        color: '#cfe2ff',
        lineSpacing: 4,
      })
      .setDepth(DEPTH.UI);

    s.add
      .text(PANEL_X, H - 84, 'Move ····· Arrows / WASD\nFocus ···· Shift     Fire · Z / J\nBomb ····· X / K     Pause · Esc\nMute ····· M', {
        fontFamily: NUM_FONT,
        fontSize: '12px',
        color: '#695a8f',
        lineSpacing: 4,
      })
      .setDepth(DEPTH.UI);
  }

  private buildBossUI(): void {
    const s = this.scene;
    this.bossBar = s.add.graphics().setDepth(DEPTH.UI);
    this.bossName = s.add
      .text(PF.x + 12, PF.y + 6, '', { fontFamily: TITLE_FONT, fontSize: '15px', color: '#ffffff', stroke: '#180a28', strokeThickness: 3 })
      .setDepth(DEPTH.UI);
    this.bossTimer = s.add
      .text(PF_RIGHT - 14, PF.y + 6, '', { fontFamily: NUM_FONT, fontSize: '16px', color: '#ffe14d', stroke: '#180a28', strokeThickness: 3 })
      .setOrigin(1, 0)
      .setDepth(DEPTH.UI);
    this.bossDots = s.add
      .text(PF.x + 12, PF.y + 40, '', { fontFamily: NUM_FONT, fontSize: '12px', color: '#ff8fd0' })
      .setDepth(DEPTH.UI);
  }

  setStageName(name: string): void {
    this.stageTxt.setText(name);
  }

  update(refs: GameRefs, boss: Boss | null): void {
    const st = refs.state;
    if (st.score !== this.cScore) {
      this.cScore = st.score;
      this.score.setText(st.score.toLocaleString());
    }
    const hi = Math.max(st.hiScore, st.score);
    if (hi !== this.cHi) {
      this.cHi = hi;
      this.hi.setText(hi.toLocaleString());
    }
    if (st.graze !== this.cGraze) {
      this.cGraze = st.graze;
      this.grazeTxt.setText(String(st.graze));
    }
    const multStr = 'x' + st.mult.toFixed(2);
    if (multStr !== this.cMult) {
      this.cMult = multStr;
      this.multTxt.setText(multStr);
    }
    if (st.lives !== this.cLives) {
      this.cLives = st.lives;
      this.lifeIcons.forEach((ic, i) => ic.setVisible(i < st.lives));
    }
    if (st.bombs !== this.cBombs) {
      this.cBombs = st.bombs;
      this.bombIcons.forEach((ic, i) => ic.setVisible(i < st.bombs));
    }
    if (st.power !== this.cPower) {
      this.cPower = st.power;
      this.powerTxt.setText(st.power.toFixed(2));
      this.powerBar.clear();
      this.powerBar.fillStyle(0x241a40, 1);
      this.powerBar.fillRect(PANEL_X, 312, 210, 10);
      const frac = (st.power - 1) / 3;
      this.powerBar.fillStyle(st.power >= 4 ? 0xffe14d : 0xff5577, 1);
      this.powerBar.fillRect(PANEL_X, 312, 210 * Math.max(0.02, frac), 10);
      this.powerBar.lineStyle(1, 0x8d7bb5, 0.8);
      this.powerBar.strokeRect(PANEL_X, 312, 210, 10);
    }
    let upgStr = '';
    for (const [id, n] of st.upgrades.entries()) {
      if (id === 'tithe') continue;
      upgStr += `• ${upgradeShortName(id as UpgradeId)}${n > 1 ? ` ×${n}` : ''}\n`;
    }
    if (upgStr === '') upgStr = '· none yet ·';
    if (upgStr !== this.cUpg) {
      this.cUpg = upgStr;
      this.upgTxt.setText(upgStr);
    }

    // boss bar
    this.bossBar.clear();
    if (boss && (boss.bstate === 'fight' || boss.bstate === 'switch')) {
      const x0 = PF.x + 12;
      const x1 = PF_RIGHT - 64;
      const wFull = x1 - x0;
      this.bossBar.fillStyle(0x1a1030, 0.85);
      this.bossBar.fillRect(x0, PF.y + 28, wFull, 8);
      const frac = boss.hpFrac;
      this.bossBar.fillStyle(frac > 0.3 ? 0xf0ecff : 0xff4455, 1);
      this.bossBar.fillRect(x0, PF.y + 28, wFull * frac, 8);
      this.bossBar.lineStyle(1, 0x9a7cff, 0.9);
      this.bossBar.strokeRect(x0, PF.y + 28, wFull, 8);
      const spell = boss.phase.name;
      this.bossName.setText(boss.def.name + (spell ? `  —  “${spell}”` : ''));
      this.bossTimer.setText(Math.ceil(boss.timeLeft).toString());
      this.bossDots.setText('★ '.repeat(boss.phasesLeft));
      this.bossName.setVisible(true);
      this.bossTimer.setVisible(true);
      this.bossDots.setVisible(true);
    } else {
      this.bossName.setVisible(false);
      this.bossTimer.setVisible(false);
      this.bossDots.setVisible(false);
    }
  }

  /** Center-screen card: stage titles, boss intros, stage clear. */
  showCard(title: string, sub: string, holdMs = 2400, tint = '#f0ecff'): void {
    const s = this.scene;
    const t1 = s.add
      .text(PF_CX, 286, title, {
        fontFamily: TITLE_FONT,
        fontSize: '30px',
        color: tint,
        fontStyle: 'bold',
        stroke: '#16082a',
        strokeThickness: 6,
        align: 'center',
        wordWrap: { width: PF.w - 60 },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.CARD)
      .setAlpha(0);
    const t2 = s.add
      .text(PF_CX, 330, sub, {
        fontFamily: TITLE_FONT,
        fontSize: '16px',
        color: '#b8a8e8',
        fontStyle: 'italic',
        stroke: '#16082a',
        strokeThickness: 4,
        align: 'center',
        wordWrap: { width: PF.w - 80 },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.CARD)
      .setAlpha(0);
    s.tweens.add({
      targets: [t1, t2],
      alpha: 1,
      y: '-=10',
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => {
        s.tweens.add({
          targets: [t1, t2],
          alpha: 0,
          delay: holdMs,
          duration: 600,
          onComplete: () => {
            t1.destroy();
            t2.destroy();
          },
        });
      },
    });
  }
}
