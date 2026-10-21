import { Scene } from 'phaser';
import { Interface } from '../render/Interface';
import type { Stats } from '../simulation/types';
import { KeyboardControls } from '../systems/KeyboardControls';
export class GameOver extends Scene {
    private ui!: Interface;
    private controls!: KeyboardControls;
    private halfSeconds = 120;
    constructor() { super('GameOver'); }
    create(data: { score: [number, number]; stats: Stats; halfSeconds: number }) {
        this.cameras.main.setBackgroundColor('#102630'); this.halfSeconds = data.halfSeconds;
        this.ui = new Interface(); this.ui.result(data.score, data.stats);
        this.controls = new KeyboardControls(this); this.controls.clear();
        this.events.once('shutdown', () => this.ui.destroy());
    }
    update() {
        this.controls.read();
        if (this.controls.just('ENTER') || this.controls.just('R')) this.scene.start('Game', { halfSeconds: this.halfSeconds });
        else if (this.controls.just('ESC')) this.scene.start('MainMenu');
    }
}
