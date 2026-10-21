import type { Cameras } from 'phaser';
import { FIELD, TUNING } from '../config/tuning';
import { clamp } from '../simulation/math';
import type { Match } from '../simulation/Match';

export class ActionCamera {
    constructor(private camera: Cameras.Scene2D.Camera) {
        camera.setBounds(0, 0, FIELD.worldWidth, FIELD.worldHeight).setZoom(TUNING.camera.zoom);
        camera.centerOn(FIELD.cx, FIELD.cy);
    }
    update(match: Match, dt: number, snap = false) {
        const b = match.ball, p = match.active;
        const x = clamp(b.x * .85 + p.x * .15 + b.vx * .08, 600, 840);
        const y = b.y * .88 + p.y * .12 + b.vy * TUNING.camera.lookAhead;
        const factor = snap ? 1 : 1 - Math.exp(-TUNING.camera.smoothing * dt);
        const centerX = this.camera.scrollX + this.camera.width / 2;
        const centerY = this.camera.scrollY + this.camera.height / 2;
        this.camera.centerOn(centerX + (x - centerX) * factor, centerY + (y - centerY) * factor);
    }
}
