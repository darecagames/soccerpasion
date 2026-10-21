import { FIELD, TUNING } from '../config/tuning';
import { approach, clamp, length, normal, type Vec } from './math';

export type TeamId = 0 | 1;
export class Player implements Vec {
    x = FIELD.cx; y = FIELD.cy; vx = 0; vy = 0;
    facing: Vec = { x: 0, y: -1 };
    intent: Vec = { x: 0, y: 0 };
    home: Vec;
    ballControl: number = TUNING.player.ballControl;
    slide = 0; recovery = 0; slideCooldown = 0; touchCooldown = 0;
    actionTime = 0; action: 'kick' | 'header' | 'save' | '' = '';
    decision = 0; carryTime = 0; animationTime = 0;
    keeperTarget?: Vec;
    constructor(public id: number, public team: TeamId, public number: number,
        public role: 'GK' | 'DF' | 'MF' | 'FW', home: Vec) { this.home = home; }
    get keeper() { return this.role === 'GK'; }
    get speed() { return Math.hypot(this.vx, this.vy); }
    reset(direction: number) {
        this.x = this.home.x;
        this.y = FIELD.cy + (this.home.y - FIELD.cy) * -direction;
        this.vx = this.vy = this.slide = this.recovery = this.touchCooldown = this.actionTime = 0;
        this.slideCooldown = this.carryTime = this.decision = 0;
        this.facing = { x: 0, y: direction };
        this.intent = { x: 0, y: 0 };
    }
    tackle() {
        if (this.slideCooldown > 0 || this.recovery > 0) return false;
        this.slide = TUNING.player.slideDuration;
        this.slideCooldown = TUNING.player.slideCooldown;
        const aim = length(this.intent) ? normal(this.intent) : this.facing;
        this.facing = aim;
        this.vx = aim.x * TUNING.player.slideSpeed;
        this.vy = aim.y * TUNING.player.slideSpeed;
        return true;
    }
    update(dt: number) {
        this.touchCooldown = Math.max(0, this.touchCooldown - dt);
        this.slideCooldown = Math.max(0, this.slideCooldown - dt);
        this.actionTime = Math.max(0, this.actionTime - dt);
        this.recovery = Math.max(0, this.recovery - dt);
        if (this.slide > 0) {
            this.slide -= dt;
            this.vx *= Math.exp(-1.1 * dt); this.vy *= Math.exp(-1.1 * dt);
            if (this.slide <= 0) this.recovery = TUNING.player.recovery;
        } else {
            const input = normal(this.intent);
            const speed = this.keeper ? TUNING.ai.keeperSpeed : TUNING.player.speed;
            const factor = this.recovery > 0 ? 0.18 : 1;
            const accel = length(input) ? TUNING.player.acceleration : TUNING.player.deceleration;
            // Limitar la aceleración vectorial evita diagonales más rápidas.
            const delta = { x: input.x * speed * factor - this.vx, y: input.y * speed * factor - this.vy };
            const scale = Math.min(1, accel * dt / (length(delta) || 1));
            this.vx = approach(this.vx, this.vx + delta.x, Math.abs(delta.x * scale));
            this.vy = approach(this.vy, this.vy + delta.y, Math.abs(delta.y * scale));
            if (length(input) > 0) this.facing = input;
        }
        this.x = clamp(this.x + this.vx * dt, FIELD.left + 13, FIELD.right - 13);
        this.y = clamp(this.y + this.vy * dt, FIELD.top + 10, FIELD.bottom - 10);
        this.animationTime += dt * this.speed / 190;
    }
}

// Las posiciones se expresan como si el equipo atacase hacia arriba.
const formation: [number, number, Player['role']][] = [
    [.5, .955, 'GK'], [.16, .77, 'DF'], [.38, .8, 'DF'], [.62, .8, 'DF'], [.84, .77, 'DF'],
    [.16, .57, 'MF'], [.39, .6, 'MF'], [.61, .6, 'MF'], [.84, .57, 'MF'],
    [.39, .35, 'FW'], [.61, .35, 'FW'],
];
export function createTeam(team: TeamId) {
    return formation.map(([x, y, role], index) => new Player(team * 11 + index, team, index + 1, role,
        { x: FIELD.left + x * FIELD.width, y: FIELD.top + y * FIELD.height }));
}
