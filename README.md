# Starfall Shrine: Eclipse Bloom

A complete 3-stage precision bullet-hell (danmaku) built with **Vite + TypeScript + Phaser 3**.
Every sprite, background, sigil, particle, and sound is **generated in code** — there are no
image, audio, or font assets in the repository.

## Run

```bash
npm install
npm run dev     # http://localhost:5180
npm run build   # type-checks then bundles to dist/
```

## Controls

| Action | Keys |
| --- | --- |
| Move | Arrow keys / WASD (gamepad: left stick / d-pad) |
| Focus (slow, shows hitbox) | Shift (gamepad: shoulder buttons) |
| Fire (hold) | Z or J (gamepad: A) |
| Bomb | X or K (gamepad: B) |
| Pause | Esc or P · Q quits to title while paused |
| Confirm / menus | Enter or Z · arrows navigate |
| Mute | M |

Dev-only debug (when running `npm run dev`): **`** backtick toggles the overlay,
**F1** invulnerability, **F2** skip wave / boss phase, **F3** +bomb, **F4** +life.

## Where to tune things

| What | File |
| --- | --- |
| Player speed, hitbox, fire rate, lives/bombs, extend scores | `src/game/constants.ts` (`PLAYER_CFG`, `EXTEND_SCORES`) |
| Difficulty ranks (Normal/Hard/Lunatic multipliers) | `src/game/constants.ts` (`DIFFS`) |
| Bullet styles, hit radii | `src/game/constants.ts` (`BULLET_STYLES`) |
| Enemy HP, drops, fire patterns | `src/systems/EnemyManager.ts` (`ENEMY_KINDS`) |
| Wave timing/composition per stage | `src/game/stages.ts` |
| Boss phases: HP, durations, spell patterns, loot | `src/game/bosses.ts` |
| Upgrade pool and effects | `src/systems/UpgradeSystem.ts` |
| Reusable pattern emitters | `src/systems/PatternLibrary.ts` |
| Music tracks (scale/bpm/patterns) and SFX | `src/systems/ProceduralAudio.ts` |

## Architecture notes

- All bullets/enemies/pickups are object-pooled; collision is circle-vs-circle.
- `StageDirector` runs a data-driven event script per stage (waves → midboss →
  upgrade → waves → boss → upgrade) and waits on boss defeat, not just timers.
- Boss fights are phase objects (`{ name, hp, dur, update(ctx) }`) with per-phase
  scratch memory and an `every(key, interval)` rhythm helper.
- Boss movement uses manual dt-based glides (not tweens) so fight logic is
  independent of the tween manager and freezes correctly with pause/upgrade.
