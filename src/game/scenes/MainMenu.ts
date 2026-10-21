import { Scene } from 'phaser';
import { Match } from '../simulation/Match';
import { createPitch } from '../render/Pitch';
import { MatchView } from '../render/MatchView';
import { Interface } from '../render/Interface';
import { KeyboardControls } from '../systems/KeyboardControls';
import { TUNING } from '../config/tuning';
export class MainMenu extends Scene {
    private ui!: Interface;
    private controls!: KeyboardControls;
    constructor() { super('MainMenu'); }
    create() {
        createPitch(this);
        const match = new Match(); new MatchView(this, match).update(match);
        this.cameras.main.setBounds(0, 0, 1440, 2180).setZoom(1.35).centerOn(720, 1090);
        this.ui = new Interface(); this.ui.menu();
        this.controls = new KeyboardControls(this); this.controls.clear();
        this.events.once('shutdown', () => this.ui.destroy());
    }
    update() {
        const input = this.controls.read();
        if (this.controls.just('F')) {
            if (this.scale.isFullscreen) this.scale.stopFullscreen(); else this.scale.startFullscreen();
        }
        if (this.controls.just('ENTER') || input.pressed) this.scene.start('Game', { halfSeconds: TUNING.halfSeconds });
    }
}
