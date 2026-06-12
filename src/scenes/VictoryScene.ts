import Phaser from 'phaser';
import { H, HISCORE_KEY, W } from '../game/constants';
import { audio } from '../systems/ProceduralAudio';
import type { RunStats } from '../game/state';

const TITLE_FONT = 'Georgia, "Times New Roman", serif';
const NUM_FONT = 'Consolas, monospace';

interface VictoryData {
  score: number;
  graze: number;
  lives: number;
  stats: RunStats;
  hiScore: number;
}

export class VictoryScene extends Phaser.Scene {
  private data_!: VictoryData;

  constructor() {
    super('Victory');
  }

  init(data: VictoryData): void {
    this.data_ = data;
  }

  create(): void {
    const d = this.data_;
    const livesBonus = d.lives * 100000;
    const noContinue = d.stats.continuesUsed === 0 ? 250000 : 0;
    const noDeath = d.stats.deaths === 0 ? 500000 : 0;
    const total = d.score + livesBonus + noContinue + noDeath;
    const prevHi = Math.max(d.hiScore, parseInt(localStorage.getItem(HISCORE_KEY) ?? '0', 10) || 0);
    localStorage.setItem(HISCORE_KEY, String(Math.max(prevHi, total)));

    this.add.image(0, 0, 'grad-0').setOrigin(0).setDisplaySize(W, H);
    this.add.tileSprite(0, 0, W, H, 'stars1').setOrigin(0).setAlpha(0.7);
    this.add.tileSprite(0, 0, W, H, 'stars2').setOrigin(0).setAlpha(0.9);
    this.add.image(W / 2, 150, 'glow128').setTint(0xffe14d).setAlpha(0.3).setScale(6).setBlendMode(Phaser.BlendModes.ADD);
    const sigil = this.add.image(W / 2, 380, 'sigil').setTint(0xffd9a0).setAlpha(0.1).setScale(2.8);
    sigil.setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: sigil, rotation: Math.PI * 2, duration: 60000, repeat: -1 });

    const lines: { text: string; size: number; color: string; y: number }[] = [
      { text: 'THE ECLIPSE BLOOMS — AND FADES', size: 38, color: '#ffd9a0', y: 130 },
      { text: 'Noctiluca kneels. Borrowed night is returned to the sky.', size: 16, color: '#b8a8e8', y: 178 },
      { text: `Run score ............ ${d.score.toLocaleString()}`, size: 18, color: '#f0ecff', y: 250 },
      { text: `Graze ................ ${d.graze.toLocaleString()}`, size: 18, color: '#f0ecff', y: 284 },
      { text: `Spell captures ....... ${d.stats.spellCaptures}`, size: 18, color: '#f0ecff', y: 318 },
      { text: `Lives kept ........... +${livesBonus.toLocaleString()}`, size: 18, color: '#f0ecff', y: 352 },
    ];
    let y = 386;
    if (noContinue > 0) {
      lines.push({ text: `No continues ......... +${noContinue.toLocaleString()}`, size: 18, color: '#7fe8ff', y });
      y += 34;
    }
    if (noDeath > 0) {
      lines.push({ text: `FLAWLESS PILGRIMAGE .. +${noDeath.toLocaleString()}`, size: 18, color: '#ffe14d', y });
      y += 34;
    }
    lines.push({ text: `TOTAL  ${total.toLocaleString()}`, size: 30, color: '#ffe14d', y: y + 28 });
    if (total > prevHi) {
      lines.push({ text: '★ NEW RECORD ★', size: 20, color: '#ff8fd0', y: y + 74 });
    }

    lines.forEach((ln, i) => {
      const t = this.add
        .text(W / 2, ln.y, ln.text, {
          fontFamily: i < 2 ? TITLE_FONT : NUM_FONT,
          fontSize: `${ln.size}px`,
          color: ln.color,
          fontStyle: i === 0 ? 'bold' : i === 1 ? 'italic' : 'normal',
          stroke: '#16082a',
          strokeThickness: i === 0 ? 7 : 3,
        })
        .setOrigin(0.5)
        .setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, duration: 400, delay: 250 + i * 280, ease: 'Quad.easeOut' });
    });

    const prompt = this.add
      .text(W / 2, H - 60, 'Enter — return to title', { fontFamily: TITLE_FONT, fontSize: '18px', color: '#b8a8e8' })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({ targets: prompt, alpha: 1, duration: 600, delay: 250 + lines.length * 280 });
    this.tweens.add({ targets: prompt, alpha: 0.4, duration: 800, yoyo: true, repeat: -1, delay: 1000 + lines.length * 280 });

    this.time.delayedCall(400, () => audio.extend());

    const kb = this.input.keyboard!;
    kb.on('keydown-ENTER', () => {
      audio.confirm();
      this.scene.start('Menu');
    });
    kb.on('keydown-Z', () => {
      audio.confirm();
      this.scene.start('Menu');
    });
    kb.on('keydown-ESC', () => this.scene.start('Menu'));
  }
}
