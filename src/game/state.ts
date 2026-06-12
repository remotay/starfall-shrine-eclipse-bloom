import { EXTEND_SCORES, PLAYER_CFG } from './constants';
import { clamp } from '../utils/math';
import type { UpgradeId } from '../types';

export interface RunStats {
  kills: number;
  deaths: number;
  bombsUsed: number;
  spellCaptures: number;
  continuesUsed: number;
  grazeTotal: number;
}

/**
 * All persistent run data: score, lives, bombs, power, graze, upgrades,
 * and the combo-multiplier heat model.
 */
export class RunState {
  score = 0;
  hiScore = 0;
  lives = PLAYER_CFG.startLives;
  bombs = PLAYER_CFG.startBombs;
  maxBombs = PLAYER_CFG.startBombs;
  power = 1.0;
  graze = 0;
  stage = 0;

  /** combo heat from kills (decays) and graze (decays slower) */
  chainHeat = 0;
  grazeHeat = 0;
  private chainIdle = 0;
  mult = 1;

  upgrades = new Map<UpgradeId, number>();
  /** Mercy Star: true once consumed this stage */
  mercyUsed = false;
  /** graze counter toward bonus bombs (Graze Engine) */
  grazeBombMeter = 0;

  extendsGiven = 0;
  stats: RunStats = {
    kills: 0,
    deaths: 0,
    bombsUsed: 0,
    spellCaptures: 0,
    continuesUsed: 0,
    grazeTotal: 0,
  };

  /** set by GameScene when an extend triggers, consumed by HUD/audio */
  onExtend: (() => void) | null = null;

  has(id: UpgradeId): boolean {
    return (this.upgrades.get(id) ?? 0) > 0;
  }

  count(id: UpgradeId): number {
    return this.upgrades.get(id) ?? 0;
  }

  addUpgrade(id: UpgradeId): void {
    this.upgrades.set(id, this.count(id) + 1);
  }

  /** Adds score with the current multiplier applied. Returns actual amount. */
  addScore(raw: number): number {
    const actual = Math.floor(raw * this.mult);
    this.score += actual;
    while (
      this.extendsGiven < EXTEND_SCORES.length &&
      this.score >= EXTEND_SCORES[this.extendsGiven]
    ) {
      this.extendsGiven++;
      if (this.lives < PLAYER_CFG.maxLives) {
        this.lives++;
        this.onExtend?.();
      }
    }
    return actual;
  }

  addPower(n: number): boolean {
    if (this.power >= PLAYER_CFG.maxPower) return false;
    this.power = clamp(this.power + n, 0, PLAYER_CFG.maxPower);
    return true;
  }

  onKill(): void {
    this.stats.kills++;
    this.chainHeat = clamp(this.chainHeat + 0.025, 0, 1.0);
    this.chainIdle = 0;
  }

  /** Returns true if a bonus bomb was earned (Graze Engine). */
  onGrazeTick(): boolean {
    this.graze++;
    this.stats.grazeTotal++;
    const engine = this.has('grazeEngine');
    this.grazeHeat = clamp(this.grazeHeat + (engine ? 0.012 : 0.005), 0, 1.0);
    if (engine) {
      this.grazeBombMeter++;
      if (this.grazeBombMeter >= 60) {
        this.grazeBombMeter = 0;
        if (this.bombs < this.maxBombs) {
          this.bombs++;
          return true;
        }
      }
    }
    return false;
  }

  onDeath(): void {
    this.stats.deaths++;
    this.chainHeat = 0;
    this.grazeHeat *= 0.4;
    this.power = Math.max(1, this.power - 0.8);
    const refill = PLAYER_CFG.startBombs + this.count('bombStock');
    if (this.bombs < refill) this.bombs = refill;
  }

  update(dt: number): void {
    this.chainIdle += dt;
    if (this.chainIdle > 3) this.chainHeat = Math.max(0, this.chainHeat - dt * 0.18);
    this.grazeHeat = Math.max(0, this.grazeHeat - dt * 0.03);
    this.mult = 1 + this.chainHeat + this.grazeHeat;
  }

  startStage(stage: number): void {
    this.stage = stage;
    this.mercyUsed = false;
  }

  serializeUpgrades(): [UpgradeId, number][] {
    return [...this.upgrades.entries()];
  }
}
