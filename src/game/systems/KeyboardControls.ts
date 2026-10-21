import { Input, type Scene } from 'phaser';
import type { Controls } from '../simulation/types';
import { normal } from '../simulation/math';

export class KeyboardControls {
    private keys: Record<string, Input.Keyboard.Key>;
    private down = new Set<string>();
    private up = new Set<string>();
    private actionDown = false;
    private actionUp = false;
    constructor(scene: Scene) {
        this.keys = scene.input.keyboard!.addKeys('UP,DOWN,LEFT,RIGHT,SPACE,X,Q,P,F,ENTER,ESC,R') as Record<string, Input.Keyboard.Key>;
        // Conservar ambos flancos aunque una pulsación muy breve entre en un solo frame.
        for (const [name, key] of Object.entries(this.keys)) {
            const onDown = () => {
                this.down.add(name);
                if ((name === 'SPACE' || name === 'X') && !this.otherAction(name).isDown) this.actionDown = true;
            };
            const onUp = () => {
                this.up.add(name);
                if ((name === 'SPACE' || name === 'X') && !this.otherAction(name).isDown) this.actionUp = true;
            };
            key.on('down', onDown); key.on('up', onUp);
            scene.events.once('shutdown', () => { key.off('down', onDown); key.off('up', onUp); });
        }
        scene.input.keyboard!.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE', 'X', 'Q', 'P', 'F', 'ENTER']);
    }
    read(): Controls {
        const input = { move: normal({ x: Number(this.keys.RIGHT.isDown) - Number(this.keys.LEFT.isDown),
            y: Number(this.keys.DOWN.isDown) - Number(this.keys.UP.isDown) }),
            pressed: this.actionDown, released: this.actionUp,
            held: this.keys.SPACE.isDown || this.keys.X.isDown, switchPlayer: this.just('Q') };
        this.actionDown = this.actionUp = false;
        return input;
    }
    private otherAction(name: string) { return this.keys[name === 'SPACE' ? 'X' : 'SPACE']; }
    private consume(set: Set<string>, key: string) { const exists = set.has(key); set.delete(key); return exists; }
    just(key: string) { return this.consume(this.down, key); }
    clear() {
        for (const key of Object.values(this.keys)) key.reset();
        this.down.clear(); this.up.clear(); this.actionDown = this.actionUp = false;
    }
}
