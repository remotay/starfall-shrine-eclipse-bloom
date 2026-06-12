import Phaser from 'phaser';
import { H, W } from '../game/constants';
import { audio } from '../systems/ProceduralAudio';
import type { RunState } from '../game/state';
import type { UpgradeDef, UpgradeId } from '../types';

const TITLE_FONT = 'Georgia, "Times New Roman", serif';

interface UpgradeSceneData {
  choices: UpgradeDef[];
  state: RunState;
  onPick: (id: UpgradeId) => void;
}

const CARD_W = 256;
const CARD_H = 250;

/** Overlay launched on top of GameScene after each midboss / stage boss. */
export class UpgradeScene extends Phaser.Scene {
  private choices: UpgradeDef[] = [];
  private onPick!: (id: UpgradeId) => void;
  private runState!: RunState;
  private idx = 0;
  private frames: Phaser.GameObjects.Graphics[] = [];
  private cards: Phaser.GameObjects.Container[] = [];
  private picked = false;

  constructor() {
    super('Upgrade');
  }

  init(data: UpgradeSceneData): void {
    this.choices = data.choices;
    this.onPick = data.onPick;
    this.runState = data.state;
    this.idx = 0;
    this.frames = [];
    this.cards = [];
    this.picked = false;
  }

  create(): void {
    this.add.rectangle(W / 2, H / 2, W, H, 0x05030c, 0.72);
    this.add
      .text(W / 2, 170, '— CHOOSE A BLESSING —', {
        fontFamily: TITLE_FONT,
        fontSize: '32px',
        color: '#ffd9a0',
        fontStyle: 'bold',
        stroke: '#16082a',
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    this.add
      .text(W / 2, 208, 'The shrine offers power for the road ahead', {
        fontFamily: TITLE_FONT,
        fontSize: '15px',
        color: '#b8a8e8',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);

    this.choices.forEach((u, i) => {
      const cx = W / 2 + (i - 1) * (CARD_W + 28);
      const cy = 392;
      const c = this.add.container(cx, cy);

      const bg = this.add.graphics();
      bg.fillStyle(0x150c2c, 0.97);
      bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 12);
      const frame = this.add.graphics();
      c.add([bg, frame]);
      this.frames.push(frame);

      const name = this.add
        .text(0, -CARD_H / 2 + 36, u.name, {
          fontFamily: TITLE_FONT,
          fontSize: '21px',
          color: '#ffe14d',
          fontStyle: 'bold',
          align: 'center',
          wordWrap: { width: CARD_W - 30 },
        })
        .setOrigin(0.5);
      const owned = this.runState.count(u.id);
      const stack =
        u.max > 1 && u.id !== 'tithe'
          ? this.add
              .text(0, -CARD_H / 2 + 64, `stackable · owned ${owned}/${u.max}`, {
                fontFamily: 'Consolas, monospace',
                fontSize: '12px',
                color: '#8d7bb5',
              })
              .setOrigin(0.5)
          : null;
      const desc = this.add
        .text(0, 16, u.desc, {
          fontFamily: TITLE_FONT,
          fontSize: '16px',
          color: '#e8e2ff',
          align: 'center',
          wordWrap: { width: CARD_W - 36 },
          lineSpacing: 5,
        })
        .setOrigin(0.5);
      const key = this.add
        .text(0, CARD_H / 2 - 24, `[ ${i + 1} ]`, { fontFamily: 'Consolas, monospace', fontSize: '14px', color: '#695a8f' })
        .setOrigin(0.5);
      c.add([name, desc, key]);
      if (stack) c.add(stack);

      // visible immediately — the tween is pure polish, never a gate
      c.setScale(0.93);
      this.tweens.add({ targets: c, scale: 1, duration: 240, delay: i * 80, ease: 'Back.easeOut' });
      this.cards.push(c);
    });

    this.add
      .text(W / 2, 560, '◀ ▶ select      Enter / Z confirm', {
        fontFamily: 'Consolas, monospace',
        fontSize: '15px',
        color: '#9a8cc0',
      })
      .setOrigin(0.5);

    const kb = this.input.keyboard!;
    kb.on('keydown-LEFT', () => this.move(-1));
    kb.on('keydown-A', () => this.move(-1));
    kb.on('keydown-RIGHT', () => this.move(1));
    kb.on('keydown-D', () => this.move(1));
    kb.on('keydown-ENTER', () => this.confirm());
    kb.on('keydown-Z', () => this.confirm());
    kb.on('keydown-J', () => this.confirm());
    kb.on('keydown-ONE', () => this.pickIndex(0));
    kb.on('keydown-TWO', () => this.pickIndex(1));
    kb.on('keydown-THREE', () => this.pickIndex(2));

    this.refresh();
  }

  private refresh(): void {
    this.frames.forEach((f, i) => {
      f.clear();
      const sel = i === this.idx;
      f.lineStyle(sel ? 3 : 1.5, sel ? 0xffe14d : 0x5a4a8a, sel ? 1 : 0.8);
      f.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 12);
      this.cards[i]?.setScale(sel ? 1.045 : 1);
    });
  }

  private move(d: number): void {
    this.idx = (this.idx + d + this.choices.length) % this.choices.length;
    audio.select();
    this.refresh();
  }

  private pickIndex(i: number): void {
    if (i < this.choices.length) {
      this.idx = i;
      this.refresh();
      this.confirm();
    }
  }

  private confirm(): void {
    if (this.picked) return;
    this.picked = true;
    audio.confirm();
    const id = this.choices[this.idx].id;
    this.scene.stop();
    this.onPick(id);
  }
}
