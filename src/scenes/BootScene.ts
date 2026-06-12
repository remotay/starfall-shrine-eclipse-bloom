import Phaser from 'phaser';
import { generateAllTextures } from '../systems/ProceduralArt';

/** Generates every texture in code — there are no asset files to load. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    generateAllTextures(this);
    this.scene.start('Menu');
  }
}
