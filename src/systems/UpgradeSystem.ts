import type { GameRefs, UpgradeDef, UpgradeId } from '../types';
import type { RunState } from '../game/state';

/**
 * The blessing pool. Picked 3-at-a-time after each midboss and stage boss.
 * Effects are read from RunState flags by Player/BulletManager/GameScene.
 */
export const UPGRADES: UpgradeDef[] = [
  {
    id: 'familiar',
    name: 'Twin Familiar',
    desc: 'Two spirit drones orbit you and fire alongside your shots.',
    max: 2,
    apply(refs) {
      refs.state.addUpgrade('familiar');
      refs.player.syncOptions(refs);
    },
  },
  {
    id: 'laser',
    name: 'Shrine Laser',
    desc: 'While focused, your shot becomes a piercing twin beam.',
    max: 1,
    apply(refs) {
      refs.state.addUpgrade('laser');
    },
  },
  {
    id: 'wide',
    name: 'Wide Charm',
    desc: 'Unfocused fire fans far wider and gains two extra bolts.',
    max: 1,
    apply(refs) {
      refs.state.addUpgrade('wide');
    },
  },
  {
    id: 'grazeEngine',
    name: 'Graze Engine',
    desc: 'Grazing heats your multiplier much faster, and every 60 grazes restores a bomb.',
    max: 1,
    apply(refs) {
      refs.state.addUpgrade('grazeEngine');
    },
  },
  {
    id: 'magnet',
    name: 'Spirit Magnet',
    desc: 'Pickups are drawn to you from far across the field.',
    max: 1,
    apply(refs) {
      refs.state.addUpgrade('magnet');
    },
  },
  {
    id: 'barrier',
    name: 'Barrier Thread',
    desc: 'When struck, a shield pulse cancels nearby bullets and your invulnerability lasts longer.',
    max: 1,
    apply(refs) {
      refs.state.addUpgrade('barrier');
    },
  },
  {
    id: 'bombStock',
    name: 'Bomb Stock',
    desc: '+1 maximum bomb, and one bomb restored now.',
    max: 2,
    apply(refs) {
      refs.state.addUpgrade('bombStock');
      refs.state.maxBombs++;
      if (refs.state.bombs < refs.state.maxBombs) refs.state.bombs++;
    },
  },
  {
    id: 'surge',
    name: 'Power Surge',
    desc: '+22% shot damage and +7% fire rate.',
    max: 3,
    apply(refs) {
      refs.state.addUpgrade('surge');
    },
  },
  {
    id: 'slowTime',
    name: 'Slow-Time Charm',
    desc: 'Bombs leave enemy bullets crawling for several seconds after the blast.',
    max: 1,
    apply(refs) {
      refs.state.addUpgrade('slowTime');
    },
  },
  {
    id: 'mercy',
    name: 'Mercy Star',
    desc: 'Once per stage: survive a hit that would end your run, clearing every bullet.',
    max: 1,
    apply(refs) {
      refs.state.addUpgrade('mercy');
      refs.state.mercyUsed = false;
    },
  },
  {
    id: 'tithe',
    name: 'Stardust Tithe',
    desc: '+100,000 score and one bomb restored. (offered when nothing else remains)',
    max: 99,
    apply(refs) {
      refs.state.score += 100000;
      if (refs.state.bombs < refs.state.maxBombs) refs.state.bombs++;
    },
  },
];

const SHORT_NAMES: Record<UpgradeId, string> = {
  familiar: 'Twin Familiar',
  laser: 'Shrine Laser',
  wide: 'Wide Charm',
  grazeEngine: 'Graze Engine',
  magnet: 'Spirit Magnet',
  barrier: 'Barrier Thread',
  bombStock: 'Bomb Stock',
  surge: 'Power Surge',
  slowTime: 'Slow-Time',
  mercy: 'Mercy Star',
  tithe: 'Stardust Tithe',
};

export function upgradeShortName(id: UpgradeId): string {
  return SHORT_NAMES[id];
}

export function pickUpgradeChoices(state: RunState, n = 3): UpgradeDef[] {
  const pool = UPGRADES.filter((u) => u.id !== 'tithe' && state.count(u.id) < u.max);
  // Fisher–Yates
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const out = pool.slice(0, n);
  const tithe = UPGRADES.find((u) => u.id === 'tithe')!;
  while (out.length < n) out.push(tithe);
  return out;
}

export function applyUpgrade(refs: GameRefs, id: UpgradeId): void {
  UPGRADES.find((u) => u.id === id)?.apply(refs);
}
