import Phaser from 'phaser';
import { DEBUG_ENABLED, DEPTH, H, PF, PF_BOTTOM, PF_CX, PLAYER_CFG, W, diff, HISCORE_KEY } from '../game/constants';
import { RunState } from '../game/state';
import { STAGES } from '../game/stages';
import { Player } from '../entities/Player';
import { Boss } from '../entities/Boss';
import { PickupManager } from '../entities/Pickup';
import { BulletManager } from '../systems/BulletManager';
import { EnemyManager } from '../systems/EnemyManager';
import { Effects } from '../systems/Effects';
import { StageBackground } from '../systems/Background';
import { StageDirector, DirectorHost } from '../systems/StageDirector';
import { applyUpgrade, pickUpgradeChoices } from '../systems/UpgradeSystem';
import { audio } from '../systems/ProceduralAudio';
import { HUD } from '../ui/HUD';
import { easeOutCubic, dist2 } from '../utils/math';
import type { BossDef, GameRefs, UpgradeId } from '../types';

export interface GameSceneData {
  stageIndex?: number;
  upgrades?: [UpgradeId, number][];
  continued?: boolean;
}

interface HotKeys {
  esc: Phaser.Input.Keyboard.Key;
  p: Phaser.Input.Keyboard.Key;
  q: Phaser.Input.Keyboard.Key;
  m: Phaser.Input.Keyboard.Key;
  x: Phaser.Input.Keyboard.Key;
  k: Phaser.Input.Keyboard.Key;
  tick: Phaser.Input.Keyboard.Key;
  f1: Phaser.Input.Keyboard.Key;
  f2: Phaser.Input.Keyboard.Key;
  f3: Phaser.Input.Keyboard.Key;
  f4: Phaser.Input.Keyboard.Key;
}

export class GameScene extends Phaser.Scene implements DirectorHost {
  refs!: GameRefs;
  private state!: RunState;
  private player!: Player;
  private bm!: BulletManager;
  private em!: EnemyManager;
  private pickups!: PickupManager;
  private fx!: Effects;
  private hud!: HUD;
  private bg!: StageBackground;
  private director!: StageDirector;
  private boss: Boss | null = null;

  private keys!: HotKeys;
  private paused = false;
  private pauseOverlay: Phaser.GameObjects.Container | null = null;
  private upgradeOpen = false;
  private respawnT = 0;
  private pendingBarrier = false;
  private ended = false;
  private padBombHeld = false;

  private bombActive = false;
  private bombT = 0;
  private bombX = 0;
  private bombY = 0;

  private invincible = false;
  private debugOn = false;
  private debugText: Phaser.GameObjects.Text | null = null;

  private startStageIdx = 0;
  private restoreUpgrades: [UpgradeId, number][] | null = null;
  private continued = false;

  constructor() {
    super('Game');
  }

  init(data: GameSceneData): void {
    this.startStageIdx = data.stageIndex ?? 0;
    this.restoreUpgrades = data.upgrades ?? null;
    this.continued = !!data.continued;
    this.boss = null;
    this.paused = false;
    this.upgradeOpen = false;
    this.ended = false;
    this.bombActive = false;
    this.invincible = false;
    this.debugOn = false;
    this.debugText = null;
    this.pauseOverlay = null;
    this.respawnT = 0;
    this.pendingBarrier = false;
  }

  create(): void {
    this.state = new RunState();
    this.state.hiScore = parseInt(localStorage.getItem(HISCORE_KEY) ?? '0', 10) || 0;
    if (this.continued) this.state.stats.continuesUsed = 1;

    this.bg = new StageBackground(this);
    this.fx = new Effects(this);
    this.bm = new BulletManager(this);
    this.em = new EnemyManager(this);
    this.pickups = new PickupManager(this);
    this.player = new Player(this);
    this.hud = new HUD(this);

    this.refs = {
      scene: this,
      state: this.state,
      player: this.player,
      bm: this.bm,
      em: this.em,
      pickups: this.pickups,
      fx: this.fx,
      audio,
      getBoss: () => this.boss,
      hitPlayer: () => this.onPlayerHit(),
      onGraze: (x, y) => this.onGraze(x, y),
    };

    // restore upgrades when continuing
    if (this.restoreUpgrades) {
      for (const [id, n] of this.restoreUpgrades) {
        if (id === 'tithe') continue;
        for (let i = 0; i < n; i++) applyUpgrade(this.refs, id);
      }
      this.player.syncOptions(this.refs);
    }

    this.state.onExtend = () => {
      audio.extend();
      this.fx.popText(PF_CX, 320, 'EXTEND!', 0xff8fd0, 26);
      this.fx.flash(0xff8fd0, 0.18, 300);
    };

    const kb = this.input.keyboard!;
    const KC = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      esc: kb.addKey(KC.ESC),
      p: kb.addKey(KC.P),
      q: kb.addKey(KC.Q),
      m: kb.addKey(KC.M),
      x: kb.addKey(KC.X),
      k: kb.addKey(KC.K),
      tick: kb.addKey(KC.BACKTICK),
      f1: kb.addKey(KC.F1),
      f2: kb.addKey(KC.F2),
      f3: kb.addKey(KC.F3),
      f4: kb.addKey(KC.F4),
    };
    kb.addCapture([KC.UP, KC.DOWN, KC.LEFT, KC.RIGHT, KC.SPACE, KC.SHIFT, KC.Z, KC.X]);

    this.director = new StageDirector(this, STAGES);
    this.director.start(this.startStageIdx);
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000; // clamp tab-switch spikes
    const JD = Phaser.Input.Keyboard.JustDown;

    if (JD(this.keys.m)) audio.toggleMute();

    // pause toggling (not during upgrade screen)
    if (!this.upgradeOpen && (JD(this.keys.esc) || JD(this.keys.p))) {
      this.togglePause();
    }
    if (this.paused) {
      if (JD(this.keys.q)) {
        audio.stopMusic();
        this.scene.start('Menu');
      }
      return;
    }
    if (this.upgradeOpen) return;

    // debug tools (dev builds only)
    if (DEBUG_ENABLED) {
      if (JD(this.keys.tick)) this.toggleDebug();
      if (JD(this.keys.f1)) {
        this.invincible = !this.invincible;
        this.fx.popText(this.player.x, this.player.y - 30, this.invincible ? 'INVULN ON' : 'INVULN OFF', 0x7fe8ff);
      }
      if (JD(this.keys.f2)) this.director.skip();
      if (JD(this.keys.f3)) this.state.bombs = Math.min(8, this.state.bombs + 1);
      if (JD(this.keys.f4)) this.state.lives = Math.min(8, this.state.lives + 1);
    }

    // bomb input
    const pad = this.input.gamepad && this.input.gamepad.total > 0 ? this.input.gamepad.getPad(0) : null;
    const padBomb = !!(pad && pad.buttons[1]?.pressed);
    if (JD(this.keys.x) || JD(this.keys.k) || (padBomb && !this.padBombHeld)) {
      this.castBomb();
    }
    this.padBombHeld = padBomb;

    this.state.update(dt);
    this.bg.update(dt);
    this.player.update(dt, this.refs);
    this.updateBomb(dt);
    this.em.update(dt, this.refs);
    this.boss?.update(dt);
    this.bm.update(dt, this.refs);
    this.pickups.update(dt, this.refs);
    this.director.update(dt);

    // respawn flow
    if (!this.player.alive && !this.ended) {
      this.respawnT -= dt;
      if (this.respawnT <= 0) {
        this.player.respawn();
        if (this.pendingBarrier) {
          this.player.invulnT += 2.0;
          this.fx.ringPulse(this.player.x, this.player.y, 0x7fe8ff, 200, 0.7);
          this.pendingBarrier = false;
        }
      }
    }

    this.hud.update(this.refs, this.boss);
    if (this.debugOn && this.debugText) this.updateDebug();
  }

  /* --------------------------- combat events --------------------------- */

  private onPlayerHit(): void {
    const player = this.player;
    if (!player.alive || player.invulnT > 0 || this.invincible || this.ended) return;
    const st = this.state;

    // Mercy Star: cheat death once per stage when out of spare lives
    if (st.lives <= 0 && st.has('mercy') && !st.mercyUsed) {
      st.mercyUsed = true;
      this.bm.cancelAll(true, this.refs);
      player.invulnT = 3.5;
      this.fx.flash(0xffe14d, 0.4, 500);
      this.fx.ringPulse(player.x, player.y, 0xffe14d, 320, 0.8);
      this.fx.popText(player.x, player.y - 44, 'MERCY STAR!', 0xffe14d, 22);
      audio.spellCapture();
      return;
    }

    if (this.boss) this.boss.phaseBroken = true;
    audio.playerHit();
    this.fx.playerDeathFx(player.x, player.y);
    const barrier = st.has('barrier');
    this.bm.cancelRadius(player.x, player.y, barrier ? 280 : 140, false, this.refs);
    if (barrier) this.fx.ringPulse(player.x, player.y, 0x7fe8ff, 280, 0.6);
    // dropped power scatters back
    for (let i = 0; i < 3; i++) {
      this.pickups.spawn(player.x - 30 + i * 30, player.y - 24, 'power');
    }
    st.onDeath();
    st.lives--;
    player.kill();
    if (st.lives < 0) {
      this.endRun(false);
    } else {
      this.respawnT = PLAYER_CFG.respawnDelay;
      this.pendingBarrier = barrier;
    }
  }

  private onGraze(x: number, y: number): void {
    if (!this.player.alive) return;
    const gotBomb = this.state.onGrazeTick();
    this.state.addScore(120);
    audio.graze();
    this.fx.grazeSpark(x, y);
    if (gotBomb) this.fx.popText(this.player.x, this.player.y - 36, 'GRAZE BOMB +1', 0x5fe88f, 15);
  }

  private castBomb(): void {
    const st = this.state;
    if (!this.player.alive || st.bombs <= 0 || this.bombActive || this.ended || this.upgradeOpen) return;
    st.bombs--;
    st.stats.bombsUsed++;
    if (this.boss) this.boss.phaseBroken = true;
    this.player.invulnT = Math.max(this.player.invulnT, PLAYER_CFG.bombInvuln);
    this.bombActive = true;
    this.bombT = 0;
    this.bombX = this.player.x;
    this.bombY = this.player.y;
    this.fx.bombCircle(this.bombX, this.bombY);
    audio.bomb();
    if (st.has('slowTime')) this.bm.applySlow(0.38, 3.6);
  }

  private updateBomb(dt: number): void {
    if (!this.bombActive) return;
    this.bombT += dt;
    const frac = Math.min(1, this.bombT / 1.15);
    const radius = easeOutCubic(frac) * 560;
    this.bm.cancelRadius(this.bombX, this.bombY, radius, true, this.refs);
    const r2 = radius * radius;
    for (const e of this.em.active) {
      if (!e.dead && dist2(e.x, e.y, this.bombX, this.bombY) < r2) {
        e.damage(460 * dt, this.refs);
      }
    }
    if (this.boss && this.boss.targetable && dist2(this.boss.x, this.boss.y, this.bombX, this.bombY) < r2) {
      this.boss.damage(380 * dt, this.refs);
    }
    if (this.bombT >= 1.15) this.bombActive = false;
  }

  /* --------------------------- DirectorHost --------------------------- */

  announceStage(name: string, sub: string): void {
    this.hud.showCard(name, sub, 2600);
    this.hud.setStageName(name);
  }

  announceBoss(def: BossDef): void {
    this.hud.showCard(def.name, def.title, 2600, def.mid ? '#9fefff' : '#ff9fb8');
  }

  setStageVisual(bgIdx: number): void {
    this.bg.create(bgIdx);
    audio.startMusic(('stage' + bgIdx) as 'stage0' | 'stage1' | 'stage2');
  }

  openUpgrade(): void {
    this.upgradeOpen = true;
    this.setWorldFrozen(true);
    const choices = pickUpgradeChoices(this.state);
    this.scene.launch('Upgrade', {
      choices,
      state: this.state,
      onPick: (id: UpgradeId) => {
        applyUpgrade(this.refs, id);
        this.player.syncOptions(this.refs);
        this.setWorldFrozen(false);
        this.upgradeOpen = false;
        this.player.invulnT = Math.max(this.player.invulnT, 1.0);
      },
    });
  }

  isUpgradeOpen(): boolean {
    return this.upgradeOpen;
  }

  setBoss(b: Boss | null): void {
    this.boss = b;
  }

  stageClearBonus(stageIdx: number): void {
    const bonus = 100000 * (stageIdx + 1) + Math.max(0, this.state.lives) * 20000;
    this.state.score += bonus;
    this.hud.showCard('STAGE CLEAR!', `Clear bonus  +${bonus.toLocaleString()}`, 2800, '#ffe14d');
    audio.spellCapture();
  }

  onVictory(): void {
    this.endRun(true);
  }

  /* ----------------------------- run flow ----------------------------- */

  private endRun(victory: boolean): void {
    if (this.ended) return;
    this.ended = true;
    const st = this.state;
    const hi = Math.max(st.hiScore, st.score);
    localStorage.setItem(HISCORE_KEY, String(hi));
    this.time.delayedCall(victory ? 1600 : 1700, () => {
      audio.stopMusic();
      if (victory) {
        this.scene.start('Victory', {
          score: st.score,
          graze: st.graze,
          lives: Math.max(0, st.lives),
          stats: st.stats,
          hiScore: st.hiScore,
        });
      } else {
        this.scene.start('GameOver', {
          score: st.score,
          stageIndex: this.director.si,
          upgrades: st.serializeUpgrades(),
          stats: st.stats,
        });
      }
    });
  }

  private setWorldFrozen(frozen: boolean): void {
    if (frozen) {
      this.tweens.pauseAll();
      this.time.paused = true;
    } else {
      this.tweens.resumeAll();
      this.time.paused = false;
    }
  }

  private togglePause(): void {
    this.paused = !this.paused;
    this.setWorldFrozen(this.paused);
    if (this.paused) {
      const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x05030c, 0.62);
      const title = this.add
        .text(PF_CX, 300, 'PAUSED', { fontFamily: 'Georgia, serif', fontSize: '42px', color: '#f0ecff', fontStyle: 'bold' })
        .setOrigin(0.5);
      const hint = this.add
        .text(PF_CX, 358, 'Esc — resume        Q — return to title', {
          fontFamily: 'Consolas, monospace',
          fontSize: '16px',
          color: '#b8a8e8',
        })
        .setOrigin(0.5);
      this.pauseOverlay = this.add.container(0, 0, [dim, title, hint]).setDepth(DEPTH.OVERLAY);
    } else {
      this.pauseOverlay?.destroy();
      this.pauseOverlay = null;
    }
  }

  /* ------------------------------ debug ------------------------------ */

  private toggleDebug(): void {
    this.debugOn = !this.debugOn;
    if (this.debugOn && !this.debugText) {
      this.debugText = this.add
        .text(PF.x + 8, PF_BOTTOM - 148, '', {
          fontFamily: 'Consolas, monospace',
          fontSize: '12px',
          color: '#7fff9f',
          backgroundColor: '#05030cc0',
        })
        .setDepth(DEPTH.OVERLAY);
    }
    this.debugText?.setVisible(this.debugOn);
  }

  private updateDebug(): void {
    const st = this.state;
    const b = this.boss;
    this.debugText!.setText(
      [
        `fps ${this.game.loop.actualFps.toFixed(0)}`,
        `ebullets ${this.bm.enemyCount}  pbullets ${this.bm.playerCount}  enemies ${this.em.count}`,
        this.director.label,
        `power ${st.power.toFixed(2)}  lives ${st.lives}  bombs ${st.bombs}  graze ${st.graze}`,
        `boss ${b ? `${b.hp.toFixed(0)}/${b.maxHp} (${b.bstate})` : '—'}`,
        `rank ${diff().name} (cnt×${diff().cnt} spd×${diff().spd})  invuln:${this.invincible ? 'ON' : 'off'}`,
        `F1 invuln · F2 skip · F3 +bomb · F4 +life`,
      ].join('\n')
    );
  }
}
