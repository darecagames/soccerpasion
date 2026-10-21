import { FIELD, TUNING } from '../config/tuning';
import { length, normal, type Vec } from './math';
import type { TeamId } from './Player';

export class Ball implements Vec {
    x = FIELD.cx; y = FIELD.cy; z = 0;
    vx = 0; vy = 0; vz = 0; spin = 0;
    previous: Vec = { x: FIELD.cx, y: FIELD.cy };
    lastTeam: TeamId = 0; lastPlayer = -1;
    kickLock = 0; aftertouch = 0; kickDirection: Vec = { x: 0, y: -1 };
    rotation = 0;
    reset(x = FIELD.cx, y = FIELD.cy) {
        this.x = x; this.y = y; this.z = this.vx = this.vy = this.vz = this.spin = 0;
        this.kickLock = this.aftertouch = 0; this.lastPlayer = -1;
        this.previous = { x, y };
    }
    kick(aim: Vec, speed: number, lift: number, player: number, team: TeamId, human = false) {
        const dir = normal(aim);
        this.vx = dir.x * speed; this.vy = dir.y * speed; this.vz = lift;
        this.spin = 0; this.kickDirection = dir;
        this.lastPlayer = player; this.lastTeam = team; this.kickLock = 0.19;
        this.aftertouch = human ? TUNING.ball.aftertouchWindow : 0;
    }
    applyAftertouch(input: Vec, attack: number, dt: number) {
        if (this.aftertouch <= 0) return;
        const strength = this.aftertouch / TUNING.ball.aftertouchWindow;
        // Izquierda/derecha mantienen su sentido en pantalla tras cambiar de campo.
        const side = this.kickDirection.y > .1 ? -1 : 1;
        this.spin += input.x * side * strength * TUNING.ball.curve * dt * 9;
        if (input.y * attack < -0.1) this.vz += 1150 * strength * dt;
        else if (input.y * attack > 0.1) this.vz -= 1700 * strength * dt;
    }
    update(dt: number) {
        this.previous = { x: this.x, y: this.y };
        this.kickLock = Math.max(0, this.kickLock - dt);
        this.aftertouch = Math.max(0, this.aftertouch - dt);
        const angle = this.spin * dt;
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const vx = this.vx * cos - this.vy * sin;
        this.vy = this.vx * sin + this.vy * cos; this.vx = vx;
        this.spin *= Math.exp(-2.9 * dt);
        const speed = length({ x: this.vx, y: this.vy });
        const nextSpeed = this.z > 0.1 ? speed * Math.exp(-TUNING.ball.airDrag * dt)
            : Math.max(0, speed - TUNING.ball.grassDrag * dt);
        const ratio = speed ? nextSpeed / speed : 0;
        this.vx *= ratio; this.vy *= ratio;
        this.x += this.vx * dt; this.y += this.vy * dt;
        if (this.z > 0 || this.vz > 0) {
            this.vz -= TUNING.ball.gravity * dt;
            this.z += this.vz * dt;
            if (this.z < 0) {
                this.z = 0;
                this.vz = Math.abs(this.vz) > 65 ? -this.vz * TUNING.ball.bounce : 0;
                this.vx *= .87; this.vy *= .87;
            }
        }
        this.rotation += nextSpeed * dt / 10;
    }
}
