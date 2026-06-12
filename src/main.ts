import Phaser from 'phaser';
import { gameConfig } from './game/config';

const game = new Phaser.Game(gameConfig);

if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
}
