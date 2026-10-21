import { Scene } from 'phaser';
import { TUNING } from '../config/tuning';
import { Match } from '../simulation/Match';
import { emptyControls, type Controls } from '../simulation/types';
import { createPitch } from '../render/Pitch';
import { MatchView } from '../render/MatchView';
import { Interface } from '../render/Interface';
import { KeyboardControls } from '../systems/KeyboardControls';
import { ActionCamera } from '../systems/ActionCamera';
import { MatchAudio } from '../systems/Audio';
export class Game extends Scene {
    match!: Match;
    private view!: MatchView;
    private ui!: Interface;
    private controls!: KeyboardControls;
    private actionCamera!: ActionCamera;
    private audio!: MatchAudio;
    private accumulator = 0;
    private pending: Controls = emptyControls();
    private paused = false;
    constructor() { super('Game'); }
    create(data: { halfSeconds?: number }) {
        this.match = new Match(data.halfSeconds ?? TUNING.halfSeconds);
        this.accumulator = 0; this.pending = emptyControls(); this.paused = false;
        createPitch(this); this.view = new MatchView(this, this.match);
        this.controls = new KeyboardControls(this); this.controls.clear();
        this.actionCamera = new ActionCamera(this.cameras.main);
        this.actionCamera.update(this.match, 0, true);
        this.ui = new Interface(); this.ui.match();
        this.audio = new MatchAudio(); this.audio.unlock();
        const blur = () => {
            this.paused = true; this.controls.clear(); this.pending = emptyControls();
            this.match.charging = false; this.match.charge = 0;
        };
        this.game.events.on('blur', blur);
        this.events.once('shutdown', () => {
            this.ui.destroy(); this.audio.destroy(); this.game.events.off('blur', blur);
        });
    }
    update(_time: number, delta: number) {
        const input = this.controls.read();
        this.ui.showActionHeld(input.held);
        if (this.controls.just('P')) {
            this.paused = !this.paused; this.controls.clear(); this.pending = emptyControls();
            this.match.charging = false; this.match.charge = 0; this.audio.unlock();
        }
        if (this.controls.just('F')) {
            if (this.scale.isFullscreen) this.scale.stopFullscreen(); else this.scale.startFullscreen();
        }
        if (this.paused && this.controls.just('ESC')) { this.scene.start('MainMenu'); return; }
        if (!this.paused) {
            this.pending.move = input.move; this.pending.held = input.held;
            this.pending.pressed ||= input.pressed; this.pending.released ||= input.released;
            this.pending.switchPlayer ||= input.switchPlayer;
            this.accumulator += Math.min(delta / 1000, .1);
            while (this.accumulator >= TUNING.step) {
                this.match.update(TUNING.step, this.pending);
                this.pending.pressed = this.pending.released = this.pending.switchPlayer = false;
                this.accumulator -= TUNING.step;
            }
            this.actionCamera.update(this.match, delta / 1000);
        }
        this.view.update(this.match); this.ui.update(this.match, this.paused);
        for (const event of this.match.events.splice(0)) this.audio.play(event.type);
        if (this.match.phase === 'finished') this.scene.start('GameOver', {
            score: this.match.score, stats: this.match.stats, halfSeconds: this.match.halfSeconds,
        });
    }
}
