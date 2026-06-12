import Phaser from 'phaser';
import { DIFFS, DiffState, H, HISCORE_KEY, W } from '../game/constants';
import { audio } from '../systems/ProceduralAudio';

const TITLE_FONT = 'Georgia, "Times New Roman", serif';
const NUM_FONT = 'Consolas, monospace';

export class MenuScene extends Phaser.Scene {
  private tiles: { ts: Phaser.GameObjects.TileSprite; vy: number }[] = [];
  private sigil!: Phaser.GameObjects.Image;
  private items: Phaser.GameObjects.Text[] = [];
  private idx = 0;
  private unlocked = false;

  constructor() {
    super('Menu');
  }

  create(): void {
    this.tiles = [];
    this.items = [];
    this.idx = 0;

    this.add.image(0, 0, 'grad-0').setOrigin(0).setDisplaySize(W, H);
    for (const [key, vy, a] of [
      ['stars0', 9, 0.6],
      ['stars1', 17, 0.75],
      ['stars2', 30, 0.9],
    ] as [string, number, number][]) {
      const ts = this.add.tileSprite(0, 0, W, H, key).setOrigin(0).setAlpha(a);
      this.tiles.push({ ts, vy });
    }
    this.sigil = this.add.image(W / 2, 360, 'sigil').setTint(0x7a5cff).setAlpha(0.14).setScale(2.6);
    this.sigil.setBlendMode(Phaser.BlendModes.ADD);
    this.add.image(W / 2, 175, 'glow128').setTint(0xff8fd0).setAlpha(0.35).setScale(5).setBlendMode(Phaser.BlendModes.ADD);
    this.add.image(150, 130, 'moon').setAlpha(0.85);

    const title = this.add
      .text(W / 2, 150, 'STARFALL SHRINE', {
        fontFamily: TITLE_FONT,
        fontSize: '58px',
        color: '#ffd9a0',
        fontStyle: 'bold',
        stroke: '#2a0e3d',
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.add
      .text(W / 2, 210, '~  E c l i p s e   B l o o m  ~', {
        fontFamily: TITLE_FONT,
        fontSize: '26px',
        color: '#ff8fd0',
        fontStyle: 'italic',
        stroke: '#2a0e3d',
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: title, scale: 1.02, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const hi = parseInt(localStorage.getItem(HISCORE_KEY) ?? '0', 10) || 0;
    this.add
      .text(W / 2, 268, `HI-SCORE  ${hi.toLocaleString()}`, { fontFamily: NUM_FONT, fontSize: '16px', color: '#8d7bb5' })
      .setOrigin(0.5);

    this.items.push(
      this.add.text(W / 2, 360, 'Begin the Pilgrimage', { fontFamily: TITLE_FONT, fontSize: '28px', color: '#f0ecff' }).setOrigin(0.5)
    );
    this.items.push(
      this.add.text(W / 2, 410, '', { fontFamily: TITLE_FONT, fontSize: '22px', color: '#f0ecff' }).setOrigin(0.5)
    );
    this.refreshItems();

    this.add
      .text(
        W / 2,
        530,
        'Arrows / WASD — move      Shift — focus (shows hitbox)\nZ / J — fire      X / K — bomb      Esc / P — pause      M — mute',
        { fontFamily: NUM_FONT, fontSize: '15px', color: '#9a8cc0', align: 'center', lineSpacing: 8 }
      )
      .setOrigin(0.5);

    const prompt = this.add
      .text(W / 2, 625, 'Press  Enter  or  Z', { fontFamily: TITLE_FONT, fontSize: '19px', color: '#ffe14d' })
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 });

    this.add
      .text(W - 14, H - 12, 'a procedural danmaku offering — no assets were harmed', {
        fontFamily: NUM_FONT,
        fontSize: '11px',
        color: '#564a78',
      })
      .setOrigin(1);

    const kb = this.input.keyboard!;
    kb.on('keydown', () => this.unlockAudio());
    this.input.on('pointerdown', () => this.unlockAudio());
    kb.on('keydown-UP', () => this.move(-1));
    kb.on('keydown-W', () => this.move(-1));
    kb.on('keydown-DOWN', () => this.move(1));
    kb.on('keydown-S', () => this.move(1));
    kb.on('keydown-LEFT', () => this.adjust(-1));
    kb.on('keydown-A', () => this.adjust(-1));
    kb.on('keydown-RIGHT', () => this.adjust(1));
    kb.on('keydown-D', () => this.adjust(1));
    kb.on('keydown-ENTER', () => this.confirm());
    kb.on('keydown-Z', () => this.confirm());
    kb.on('keydown-J', () => this.confirm());
  }

  private unlockAudio(): void {
    audio.unlock();
    if (!this.unlocked) {
      this.unlocked = true;
      audio.startMusic('menu');
    }
  }

  private refreshItems(): void {
    this.items[1].setText(`Rank:  ‹ ${DIFFS[DiffState.idx].name} ›`);
    this.items.forEach((it, i) => {
      it.setColor(i === this.idx ? '#ffe14d' : '#b8a8e8');
      it.setScale(i === this.idx ? 1.08 : 1);
    });
  }

  private move(d: number): void {
    this.idx = (this.idx + d + this.items.length) % this.items.length;
    audio.select();
    this.refreshItems();
  }

  private adjust(d: number): void {
    if (this.idx !== 1) return;
    DiffState.idx = (DiffState.idx + d + DIFFS.length) % DIFFS.length;
    audio.select();
    this.refreshItems();
  }

  private confirm(): void {
    if (this.idx === 0) {
      audio.confirm();
      audio.stopMusic();
      this.scene.start('Game', {});
    } else {
      this.adjust(1);
    }
  }

  update(_t: number, delta: number): void {
    const dt = delta / 1000;
    for (const tl of this.tiles) tl.ts.tilePositionY -= tl.vy * dt;
    this.sigil.rotation += dt * 0.15;
  }
}
