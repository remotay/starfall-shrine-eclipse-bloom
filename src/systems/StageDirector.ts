import { Boss } from '../entities/Boss';
import type { BossDef, GameRefs, StageScript } from '../types';

/** What the director needs from GameScene. */
export interface DirectorHost {
  refs: GameRefs;
  announceStage(name: string, sub: string): void;
  announceBoss(def: BossDef): void;
  setStageVisual(bg: number): void;
  openUpgrade(): void;
  isUpgradeOpen(): boolean;
  setBoss(b: Boss | null): void;
  stageClearBonus(stageIdx: number): void;
  onVictory(): void;
}

type DirState = 'idle' | 'wait' | 'waitClear' | 'boss' | 'upgrade' | 'stageclear' | 'done';

/**
 * Sequences each stage's event script: waves, waits, bosses, upgrade pauses,
 * stage transitions, and final victory. Data lives in game/stages.ts.
 */
export class StageDirector {
  si = 0;
  private ei = -1;
  private state: DirState = 'idle';
  private timer = 0;
  private boss: Boss | null = null;
  private host: DirectorHost;
  private stages: StageScript[];

  constructor(host: DirectorHost, stages: StageScript[]) {
    this.host = host;
    this.stages = stages;
  }

  start(stageIdx: number): void {
    this.si = Math.min(stageIdx, this.stages.length - 1);
    this.beginStage();
  }

  private beginStage(): void {
    const s = this.stages[this.si];
    this.host.refs.state.startStage(this.si);
    this.host.setStageVisual(s.bg);
    this.host.announceStage(s.name, s.subtitle);
    this.ei = -1;
    this.advance();
  }

  private advance(): void {
    this.ei++;
    const s = this.stages[this.si];
    if (this.ei >= s.events.length) {
      this.stageComplete();
      return;
    }
    const ev = s.events[this.ei];
    switch (ev.type) {
      case 'wait':
        this.state = 'wait';
        this.timer = ev.s;
        break;
      case 'waitClear':
        this.state = 'waitClear';
        this.timer = ev.timeout ?? 10;
        break;
      case 'spawn':
        ev.fn(this.host.refs.em, this.host.refs);
        this.advance();
        break;
      case 'midboss':
      case 'boss':
        this.spawnBoss(ev.def);
        break;
      case 'upgrade':
        this.state = 'upgrade';
        this.host.openUpgrade();
        break;
    }
  }

  private spawnBoss(def: BossDef): void {
    this.boss = new Boss(this.host.refs, def);
    this.host.setBoss(this.boss);
    this.host.announceBoss(def);
    this.state = 'boss';
  }

  private stageComplete(): void {
    if (this.si + 1 < this.stages.length) {
      this.state = 'stageclear';
      this.timer = 4.2;
      this.host.stageClearBonus(this.si);
    } else {
      this.state = 'done';
      this.host.onVictory();
    }
  }

  update(dt: number): void {
    switch (this.state) {
      case 'wait':
        this.timer -= dt;
        if (this.timer <= 0) this.advance();
        break;
      case 'waitClear':
        this.timer -= dt;
        if (!this.host.refs.em.anyPending || this.timer <= 0) this.advance();
        break;
      case 'boss':
        if (this.boss && this.boss.done) {
          this.host.setBoss(null);
          this.boss.destroy();
          this.boss = null;
          this.advance();
        }
        break;
      case 'upgrade':
        if (!this.host.isUpgradeOpen()) this.advance();
        break;
      case 'stageclear':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.si++;
          this.beginStage();
        }
        break;
      case 'idle':
      case 'done':
        break;
    }
  }

  /** Debug F2: end the current phase / wave immediately. */
  skip(): void {
    if (this.state === 'boss' && this.boss) {
      this.boss.forceEndPhase();
    } else if (this.state === 'wait' || this.state === 'waitClear') {
      this.host.refs.em.clearAll();
      this.advance();
    }
  }

  get label(): string {
    return `stage ${this.si + 1} · event ${this.ei} · ${this.state}` + (this.boss ? ` · boss p${this.boss.phaseIndex + 1}` : '');
  }
}
