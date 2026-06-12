import Phaser from 'phaser';
import { H, W } from '../game/constants';
import { audio } from '../systems/ProceduralAudio';
import type { RunStats } from '../game/state';
import type { UpgradeId } from '../types';

const TITLE_FONT = 'Georgia, "Times New Roman", serif';
const NUM_FONT = 'Consolas, monospace';

interface GameOverData {
  score: number;
  stageIndex: number;
  upgrades: [UpgradeId, number][];
  stats: RunStats;
}

export class GameOverScene extends Phaser.Scene {
  private data_!: GameOverData;

  constructor() {
    super('GameOver');
  }

  init(data: GameOverData): void {
    this.data_ = data;
  }

  create(): void {
    this.add.image(0, 0, 'grad-2').setOrigin(0).setDisplaySize(W, H);
    this.add.tileSprite(0, 0, W, H, 'stars1').setOrigin(0).setAlpha(0.4);
    this.add.image(W / 2, 250, 'glow128').setTint(0xff2444).setAlpha(0.25).setScale(6).setBlendMode(Phaser.BlendModes.ADD);

    const title = this.add
      .text(W / 2, 220, 'THE LIGHT GOES OUT', {
        fontFamily: TITLE_FONT,
        fontSize: '48px',
        color: '#ff4455',
        fontStyle: 'bold',
        stroke: '#16020a',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, y: 230, duration: 900, ease: 'Quad.easeOut' });

    this.add
      .text(W / 2, 300, `Final score   ${this.data_.score.toLocaleString()}`, {
        fontFamily: NUM_FONT,
        fontSize: '22px',
        color: '#f0ecff',
      })
      .setOrigin(0.5);
    this.add
      .text(
        W / 2,
        345,
        `graze ${this.data_.stats.grazeTotal}   ·   kills ${this.data_.stats.kills}   ·   spell captures ${this.data_.stats.spellCaptures}`,
        { fontFamily: NUM_FONT, fontSize: '15px', color: '#8d7bb5' }
      )
      .setOrigin(0.5);

    this.add
      .text(W / 2, 450, `Enter — continue from Stage ${this.data_.stageIndex + 1}`, {
        fontFamily: TITLE_FONT,
        fontSize: '22px',
        color: '#ffe14d',
      })
      .setOrigin(0.5);
    this.add
      .text(W / 2, 488, '(blessings are kept · score is offered back to the void)', {
        fontFamily: TITLE_FONT,
        fontSize: '14px',
        fontStyle: 'italic',
        color: '#9a8cc0',
      })
      .setOrigin(0.5);
    this.add
      .text(W / 2, 540, 'Esc — return to title', { fontFamily: TITLE_FONT, fontSize: '18px', color: '#b8a8e8' })
      .setOrigin(0.5);

    const kb = this.input.keyboard!;
    kb.on('keydown-ENTER', () => {
      audio.confirm();
      this.scene.start('Game', {
        stageIndex: this.data_.stageIndex,
        upgrades: this.data_.upgrades,
        continued: true,
      });
    });
    kb.on('keydown-ESC', () => this.scene.start('Menu'));
    kb.on('keydown-Q', () => this.scene.start('Menu'));
  }
}
