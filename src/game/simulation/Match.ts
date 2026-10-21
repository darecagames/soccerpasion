import { FIELD, TUNING } from '../config/tuning';
import { FootballAI } from './AI';
import { Ball } from './Ball';
import { createTeam, Player, type TeamId } from './Player';
import { clamp, distance, dot, length, normal, toward, type Vec } from './math';
import { emptyControls, type Controls, type MatchEvent, type Phase, type Restart, type RestartKind, type Stats } from './types';

const other = (team: TeamId): TeamId => team === 0 ? 1 : 0;
export class Match {
    players = [...createTeam(0), ...createTeam(1)];
    ball = new Ball(); ai = new FootballAI();
    score: [number, number] = [0, 0];
    stats: Stats = { shots: [0, 0], passes: [0, 0], saves: [0, 0] };
    phase: Phase = 'restart'; phaseTime = 0; half = 1; elapsed = 0; totalTime = 0;
    controlled = 9; charge = 0; charging = false;
    selectionLock = 0; selectionTimer = 0; passTarget = -1;
    restart!: Restart; message = 'SAQUE INICIAL'; events: MatchEvent[] = [];
    scorer: TeamId = 0; heldBy = -1; holdTime = 0;
    private seed: number;
    private aftertouchAim: Vec = { x: 0, y: 0 };
    constructor(public halfSeconds = TUNING.halfSeconds, seed = 7691) {
        this.seed = seed; this.startRestart('kickoff', 0, FIELD.cx, FIELD.cy);
    }
    random() { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296; }
    direction(team: TeamId) { return (team === 0 ? -1 : 1) * (this.half === 1 ? 1 : -1); }
    get active() { return this.players[this.controlled]; }
    get minute() { return Math.min(90, (this.half - 1) * 45 + this.elapsed / this.halfSeconds * 45); }
    get possession() { return this.closestPlayer(TUNING.ball.controlDistance); }
    closestPlayer(max = Infinity, team?: TeamId) {
        if (this.ball.z > 28) return undefined;
        let closest: Player | undefined, best = max;
        for (const p of this.players) {
            if (team !== undefined && p.team !== team) continue;
            if (p.recovery > .15) continue;
            const d = distance(p, this.ball);
            if (d < best) { best = d; closest = p; }
        }
        return closest;
    }
    canKick(p: Player) {
        return this.ball.z < 24 && distance(p, this.ball) < TUNING.ball.controlDistance + 3 &&
            p.recovery <= 0 && p.slide <= 0 && !(this.ball.kickLock > 0 && this.ball.lastPlayer === p.id);
    }
    emit(type: MatchEvent['type']) { this.events.push({ type }); }

    update(dt: number, input: Controls = emptyControls()) {
        if (this.phase === 'finished') return;
        this.totalTime += dt; this.phaseTime += dt;
        if (this.phase === 'goal') {
            this.ball.update(dt);
            if (this.phaseTime > 2.8) this.startRestart('kickoff', other(this.scorer), FIELD.cx, FIELD.cy);
            return;
        }
        if (this.phase === 'halftime') {
            if (this.phaseTime > 4.5) {
                this.half = 2; this.elapsed = 0;
                this.startRestart('kickoff', 1, FIELD.cx, FIELD.cy);
            }
            return;
        }
        if (this.phase === 'restart') {
            if (this.restart.team === 0) {
                if (length(input.move) > 0) this.active.facing = normal(input.move);
                this.actionInput(dt, input);
            }
            if (this.phase === 'restart' && this.phaseTime > (this.restart.team === 0 ? 5 : 1.3)) this.takeRestart();
            return;
        }
        this.elapsed += dt;
        if (this.elapsed >= this.halfSeconds) {
            this.elapsed = this.halfSeconds; this.phaseTime = 0; this.charging = false; this.charge = 0;
            this.phase = this.half === 1 ? 'halftime' : 'finished';
            this.message = this.half === 1 ? 'DESCANSO · CAMBIO DE CAMPO' : 'FINAL DEL PARTIDO';
            this.emit('whistle'); return;
        }
        this.selectPlayer(dt, input);
        this.active.intent = input.move;
        this.actionInput(dt, input);
        this.ai.update(this, dt);
        for (const p of this.players) p.update(dt);
        this.playerCollisions();
        if (this.heldBy >= 0) {
            const keeper = this.players[this.heldBy];
            this.ball.x = keeper.x; this.ball.y = keeper.y; this.ball.z = 24;
            this.ball.vx = this.ball.vy = this.ball.vz = 0;
            this.holdTime -= dt;
            if (this.holdTime <= 0) {
                const receiver = this.ai.receiver(this, keeper, { x: 0, y: this.direction(keeper.team) }, true);
                this.heldBy = -1;
                if (receiver) this.pass(keeper, receiver, true);
                else this.shoot(keeper, { x: .15, y: this.direction(keeper.team) }, .8, true);
            }
            return;
        }
        // Mantener las flechas del golpeo no debe curvarlo: el efecto empieza al cambiar dirección.
        if (this.ball.aftertouch > 0 && length(input.move) > 0 && dot(normal(input.move), this.aftertouchAim) < .99)
            this.ball.applyAftertouch(input.move, this.direction(0), dt);
        this.dribble(dt);
        const previousZ = this.ball.z;
        this.ball.update(dt);
        this.ballCollisions();
        // Una recepción/intercepción física también entrega el control en este mismo paso.
        this.claimHumanPossession(input.move);
        this.boundaries(previousZ);
    }

    private actionInput(dt: number, input: Controls) {
        const p = this.active;
        // El golpeo se procesa antes del movimiento: usar ya las flechas de este paso,
        // no la orientación del frame anterior (importante en diagonales y toques rápidos).
        if (length(input.move) > 0 && p.slide <= 0 && p.recovery <= 0) p.facing = normal(input.move);
        if (input.pressed) {
            if (this.phase === 'restart' || this.canKick(p)) {
                this.charging = true; this.charge = 0; this.selectionLock = 1.1;
            } else if (this.ball.z >= 22 && this.ball.z < 100 && distance(p, this.ball) < 64) {
                this.ball.kick(p.facing, 640, 125, p.id, p.team, true);
                this.aftertouchAim = { ...p.facing };
                p.action = 'header'; p.actionTime = .35; this.stats.shots[p.team]++; this.emit('kick');
            } else if (p.tackle()) this.emit('tackle');
        }
        if (this.charging) {
            this.charge = Math.min(TUNING.ball.chargeMax, this.charge + dt);
            if (input.released || this.charge >= TUNING.ball.chargeMax) {
                if (this.phase === 'restart') this.takeRestart(this.charge >= TUNING.ball.tapThreshold, true);
                else if (this.canKick(p)) {
                    if (this.charge < TUNING.ball.tapThreshold) this.pass(p, this.ai.receiver(this, p, p.facing));
                    else this.shoot(p, p.facing, this.charge / TUNING.ball.chargeMax);
                }
                this.charging = false; this.charge = 0;
            }
        }
    }

    pass(p: Player, receiver?: Player, loft = false) {
        const target = receiver ? { x: receiver.x + receiver.vx * .25, y: receiver.y + receiver.vy * .25 }
            : { x: p.x + p.facing.x * 310, y: p.y + p.facing.y * 310 };
        const d = distance(this.ball, target);
        const speed = clamp(420 + d * .55, 440, TUNING.ball.passSpeed + 170);
        const aim = receiver ? toward(this.ball, target) : p.facing;
        this.ball.kick(aim, speed, loft ? 290 : 0, p.id, p.team, p.team === 0 && p.id === this.controlled);
        this.finishKick(p); this.stats.passes[p.team]++;
        if (p.team === 0 && receiver) { this.passTarget = receiver.id; this.selectionLock = .24; }
    }
    shoot(p: Player, aim: Vec, power: number, clearance = false) {
        const speed = TUNING.ball.shotMin + (TUNING.ball.shotMax - TUNING.ball.shotMin) * clamp(power, 0, 1);
        this.ball.kick(aim, speed, clearance ? 360 : 100 + power * 85, p.id, p.team, p.id === this.controlled);
        this.finishKick(p); if (!clearance) this.stats.shots[p.team]++;
    }
    private finishKick(p: Player) {
        if (p.team === 0 && p.id === this.controlled) this.aftertouchAim = { ...p.facing };
        p.action = 'kick'; p.actionTime = .22; p.touchCooldown = .35; p.carryTime = 0;
        this.emit('kick');
    }

    private claimHumanPossession(move: Vec) {
        if (this.heldBy >= 0) return false;
        const carrier = this.possession;
        if (!carrier || carrier.team !== 0 || carrier.keeper || !this.canKick(carrier)) return false;
        if (this.controlled !== carrier.id) {
            this.active.intent = { x: 0, y: 0 };
            this.active.decision = 0;
            this.controlled = carrier.id;
            // La carga y el efecto pertenecían al golpeo del futbolista anterior.
            this.charging = false; this.charge = 0; this.ball.aftertouch = 0;
        }
        carrier.intent = move;
        carrier.carryTime = 0;
        this.passTarget = -1;
        return true;
    }

    private selectPlayer(dt: number, input: Controls) {
        this.selectionLock = Math.max(0, this.selectionLock - dt);
        this.selectionTimer -= dt;
        // La posesión manda sobre los bloqueos defensivos, Q y el receptor previsto del pase.
        // canKick descarta al pasador mientras el balón acaba de salir de su pie.
        if (this.claimHumanPossession(input.move)) return;
        if (input.switchPlayer) this.selectionLock = 0;
        if (!input.switchPlayer && (this.selectionLock > 0 || this.charging || this.ball.aftertouch > 0 || this.selectionTimer > 0)) return;
        this.selectionTimer = .14;
        const carrier = this.possession;
        const defending = carrier ? carrier.team === 1 : this.ball.lastTeam === 1;
        const target = { x: this.ball.x + this.ball.vx * .22, y: this.ball.y + this.ball.vy * .22 };
        const selectionTarget = defending && !input.switchPlayer ? this.ball : target;
        const candidates = this.players.filter(p => p.team === 0 && !p.keeper && p.recovery <= .1)
            .sort((a, b) => distance(a, selectionTarget) - distance(b, selectionTarget));
        const next = input.switchPlayer ? candidates.find(p => p.id !== this.controlled) : candidates[0];
        if (defending) this.passTarget = -1;
        if (this.passTarget >= 0 && !input.switchPlayer) {
            this.controlled = this.passTarget; this.passTarget = -1; this.selectionLock = .7; return;
        }
        const defense = TUNING.selection;
        const autoSwitch = next && (defending
            ? this.active.slide <= 0 && this.active.recovery <= 0 &&
                distance(next, this.ball) <= defense.defenseRadius &&
                distance(this.active, this.ball) > defense.defenseReleaseDistance &&
                distance(next, this.ball) + defense.defenseAdvantage < distance(this.active, this.ball)
            : distance(this.active, this.ball) > 105 && distance(next, target) + 55 < distance(this.active, target));
        if (next && (input.switchPlayer || autoSwitch)) {
            this.active.intent = { x: 0, y: 0 }; this.controlled = next.id;
            this.selectionLock = input.switchPlayer ? 1.5 : defending ? defense.defenseLock : .5;
        }
    }

    private dribble(dt: number) {
        const b = this.ball;
        if (b.z > 19 || b.kickLock > 0) return;
        const p = this.closestPlayer(TUNING.ball.controlDistance);
        if (!p || p.slide > 0 || p.recovery > 0) return;
        const control = clamp(p.ballControl, 0, 1);
        if (length(p.intent) < .1 && b.lastPlayer === p.id && length({ x: b.vx, y: b.vy }) < 360) {
            // Frenada por contacto con el pie: amortiguar la velocidad relativa mientras
            // el jugador desacelera, sin esperar al próximo toque de carrera.
            const damping = Math.exp(-(15 + control * 60) * dt);
            b.vx = p.vx + (b.vx - p.vx) * damping;
            b.vy = p.vy + (b.vy - p.vy) * damping;
            return;
        }
        if (p.speed < 30) {
            // Amortiguar el balón junto al pie al detenerse, sin mover su posición.
            if (distance(p, b) < 30 && length({ x: b.vx, y: b.vy }) < 360) {
                const damping = Math.exp(-(5 + control * 16) * dt);
                b.vx *= damping; b.vy *= damping;
            }
            return;
        }
        if (p.touchCooldown > 0) return;
        const retainedTouch = b.lastPlayer === p.id && length({ x: b.vx, y: b.vy }) < 400;
        if (!retainedTouch && dot(p.facing, toward(p, b)) < -.35 - control * .5 && distance(p, b) > 23) return;
        const offset = { x: b.x - p.x, y: b.y - p.y };
        const forward = dot(offset, p.facing);
        const push = (p.speed > TUNING.player.speed * .93 ? 84 : 54) * (1 - control * .65) * TUNING.ball.dribblePushScale;
        // Si el balón ya va adelantado, acortar el siguiente toque en vez de alejarlo más.
        const speed = Math.max(p.speed * .65, p.speed + push - Math.max(0, forward - 24) * (2 + control * 8));
        const lateral = { x: offset.x - p.facing.x * forward, y: offset.y - p.facing.y * forward };
        const steer = 1 + control * 6;
        // Impulso físico: el balón continúa por su cuenta hasta el siguiente contacto.
        b.vx = p.facing.x * speed - lateral.x * steer;
        b.vy = p.facing.y * speed - lateral.y * steer;
        b.lastTeam = p.team; b.lastPlayer = p.id; b.spin *= .4;
        p.touchCooldown = TUNING.ball.touchInterval * (1.3 - control * .65);
    }

    private playerCollisions() {
        for (let i = 0; i < this.players.length; i++) for (let j = i + 1; j < this.players.length; j++) {
            const a = this.players[i], b = this.players[j];
            const d = distance(a, b), min = TUNING.player.radius * 2;
            if (d >= min) continue;
            const n = d > .001 ? toward(a, b) : { x: 1, y: 0 };
            const push = (min - d) * .5;
            a.x -= n.x * push; a.y -= n.y * push; b.x += n.x * push; b.y += n.y * push;
            if (a.team !== b.team) {
                if (a.slide > 0 && b.slide <= 0) { b.recovery = .5; b.vx += a.vx * .3; b.vy += a.vy * .3; }
                if (b.slide > 0 && a.slide <= 0) { a.recovery = .5; a.vx += b.vx * .3; a.vy += b.vy * .3; }
            }
        }
    }

    private ballCollisions() {
        const b = this.ball;
        for (const p of this.players) {
            if (b.lastPlayer === p.id && b.kickLock > 0) continue;
            const d = distance(p, b);
            if (p.keeper && b.z < 52 && d < (p.actionTime > 0 && p.action === 'save' ? 34 : 23)) {
                const ownLine = this.direction(p.team) < 0 ? FIELD.bottom : FIELD.top;
                if (Math.abs(p.y - ownLine) < FIELD.boxDepth && Math.abs(p.x - FIELD.cx) < FIELD.boxWidth / 2) {
                    this.stats.saves[p.team]++; this.emit('save');
                    b.lastTeam = p.team; b.lastPlayer = p.id;
                    if (length({ x: b.vx, y: b.vy }) < 860 && b.z < 35) {
                        this.heldBy = p.id; this.holdTime = .65; b.kickLock = .3;
                    } else {
                        b.kick({ x: clamp((b.x - p.x) / 25, -1, 1), y: this.direction(p.team) },
                            430, 170, p.id, p.team); p.action = 'save'; p.actionTime = .4;
                    }
                    return;
                }
            }
            if (b.z > (p.action === 'header' && p.actionTime > 0 ? 90 : 28)) continue;
            const radius = p.slide > 0 ? 29 : TUNING.player.radius + TUNING.ball.radius;
            if (d >= radius) continue;
            const n = d > .01 ? toward(p, b) : p.facing;
            b.x = p.x + n.x * (radius + .3); b.y = p.y + n.y * (radius + .3);
            if (p.slide > 0) {
                b.kick(p.facing, 530, 55, p.id, p.team); continue;
            }
            // Al girar con el balón propio, rodear el pie en vez de tratar cada
            // roce como una recepción nueva que frena el balón y lo deja atrás.
            if (b.lastPlayer === p.id && p.touchCooldown > 0 && p.speed > 30 && b.z < 12 &&
                length({ x: b.vx, y: b.vy }) < 400 && dot(n, p.facing) < .25) {
                const tangent = { x: -n.y, y: n.x };
                const side = dot(tangent, p.facing) >= 0 ? 1 : -1;
                const turnSpeed = 90 + clamp(p.ballControl, 0, 1) * 100;
                b.vx = p.vx + tangent.x * side * turnSpeed;
                b.vy = p.vy + tangent.y * side * turnSpeed;
                continue;
            }
            const incoming = dot({ x: b.vx - p.vx, y: b.vy - p.vy }, n);
            if (incoming < 0) {
                const control = clamp(p.ballControl, 0, 1);
                if (b.z < 12 && length({ x: b.vx, y: b.vy }) < 560 + control * 300) {
                    // Primer toque amortiguado; los tiros muy fuertes rebotan.
                    const retain = .42 - control * .3;
                    const inherit = .35 + control * .25;
                    b.vx = b.vx * retain + p.vx * inherit; b.vy = b.vy * retain + p.vy * inherit;
                    b.kickLock = 0; // Una recepción no es un golpeo: permite control y pase inmediatos.
                } else { b.vx -= 1.45 * incoming * n.x; b.vy -= 1.45 * incoming * n.y; }
                b.lastTeam = p.team; b.lastPlayer = p.id; b.aftertouch = 0;
            }
        }
        if (b.z <= FIELD.goalHeight) {
            for (const y of [FIELD.top, FIELD.bottom]) for (const x of [FIELD.cx - FIELD.goalWidth / 2, FIELD.cx + FIELD.goalWidth / 2]) {
                const post = { x, y }, d = distance(b, post), radius = 13;
                if (d < radius) {
                    const n = d > .001 ? toward(post, b) : { x: 1, y: 0 };
                    b.x = x + n.x * radius; b.y = y + n.y * radius;
                    const incoming = dot({ x: b.vx, y: b.vy }, n);
                    if (incoming < 0) { b.vx -= 1.8 * incoming * n.x; b.vy -= 1.8 * incoming * n.y; b.aftertouch = 0; }
                }
            }
        }
    }

    private boundaries(previousZ: number) {
        const b = this.ball, r = TUNING.ball.radius;
        // Elegir el primer borde cruzado, incluso en una salida diagonal por la esquina.
        const crossed: { t: number; axis: 'x' | 'y'; side: number }[] = [];
        for (const [axis, min, max] of [['x', FIELD.left - r, FIELD.right + r], ['y', FIELD.top - r, FIELD.bottom + r]] as const) {
            const side = b[axis] < min ? min : b[axis] > max ? max : undefined;
            if (side !== undefined) crossed.push({ axis, side,
                t: clamp((side - b.previous[axis]) / (b[axis] - b.previous[axis] || 1), 0, 1) });
        }
        crossed.sort((a, c) => a.t - c.t);
        const edge = crossed[0]; if (!edge) return;
        if (edge.axis === 'x') {
            const y = clamp(b.previous.y + (b.y - b.previous.y) * edge.t, FIELD.top + 35, FIELD.bottom - 35);
            this.startRestart('throw', other(b.lastTeam), edge.side < FIELD.cx ? FIELD.left + 8 : FIELD.right - 8, y);
            return;
        }
        const x = b.previous.x + (b.x - b.previous.x) * edge.t;
        const z = previousZ + (b.z - previousZ) * edge.t;
        const top = edge.side < FIELD.cy;
        const attacking: TeamId = this.direction(0) === (top ? -1 : 1) ? 0 : 1;
        if (Math.abs(x - FIELD.cx) < FIELD.goalWidth / 2 - r && z + r < FIELD.goalHeight) {
            this.score[attacking]++; this.scorer = attacking;
            this.phase = 'goal'; this.phaseTime = 0; this.message = '¡GOOOL!';
            this.charging = false; this.charge = 0; b.vx *= .16; b.vy *= .08; b.aftertouch = 0;
            this.emit('goal'); return;
        }
        // Traviesa: devuelve el balón al terreno cuando cruza a la altura del larguero.
        if (Math.abs(x - FIELD.cx) < FIELD.goalWidth / 2 && Math.abs(z - FIELD.goalHeight) < r + 4) {
            b.y = top ? FIELD.top + r : FIELD.bottom - r; b.vy *= -.78; b.vz *= -.35; return;
        }
        if (b.lastTeam !== attacking) this.startRestart('corner', attacking,
            x < FIELD.cx ? FIELD.left + 12 : FIELD.right - 12, top ? FIELD.top + 12 : FIELD.bottom - 12);
        else this.startRestart('goalkick', other(attacking), FIELD.cx + (x < FIELD.cx ? -110 : 110),
            top ? FIELD.top + 100 : FIELD.bottom - 100);
    }

    startRestart(kind: RestartKind, team: TeamId, x: number, y: number) {
        this.phase = 'restart'; this.phaseTime = 0; this.charging = false; this.charge = 0;
        this.passTarget = -1; this.heldBy = -1;
        this.ball.reset(x, y); this.ball.lastTeam = team;
        for (const p of this.players) {
            p.intent = { x: 0, y: 0 }; p.vx = p.vy = 0; p.slide = p.recovery = 0;
            if (kind === 'kickoff') {
                const dir = this.direction(p.team); p.reset(dir);
                if (!p.keeper) p.y = dir < 0 ? Math.max(p.y, FIELD.cy + 145) : Math.min(p.y, FIELD.cy - 145);
            } else {
                if (distance(p, { x, y }) < 105) {
                    const n = toward({ x, y }, p); p.x = clamp(x + n.x * 120, FIELD.left + 30, FIELD.right - 30);
                    p.y = clamp(y + n.y * 120, FIELD.top + 30, FIELD.bottom - 30);
                }
            }
        }
        const candidates = this.players.filter(p => p.team === team && (kind === 'goalkick' ? p.keeper : !p.keeper));
        const taker = kind === 'kickoff' ? this.players[team * 11 + 9]
            : candidates.sort((a, b) => distance(a, { x, y }) - distance(b, { x, y }))[0];
        const dir = this.direction(team);
        taker.x = x; taker.y = clamp(y - dir * 25, FIELD.top + 10, FIELD.bottom - 10);
        taker.facing = kind === 'throw' ? normal({ x: x < FIELD.cx ? 1 : -1, y: dir * .35 })
            : kind === 'corner' ? normal({ x: x < FIELD.cx ? 1 : -1, y: -dir * .4 }) : { x: 0, y: dir };
        if (kind === 'kickoff') {
            const support = this.players[team * 11 + 10]; support.x = x + 115; support.y = y - dir * 35;
        }
        if (team === 0) this.controlled = taker.id;
        this.restart = { kind, team, x, y, taker: taker.id };
        this.message = { kickoff: 'SAQUE DE CENTRO', throw: 'SAQUE DE BANDA', corner: 'SAQUE DE ESQUINA', goalkick: 'SAQUE DE PUERTA' }[kind];
        this.emit('whistle');
    }
    takeRestart(powerful = false, directed = false) {
        const r = this.restart, p = this.players[r.taker];
        this.phase = 'playing'; this.phaseTime = 0;
        if (powerful) this.shoot(p, p.facing, Math.max(.4, this.charge / TUNING.ball.chargeMax), r.kind === 'goalkick');
        else {
            const receiver = this.ai.receiver(this, p, p.facing, !directed || r.team !== 0);
            this.pass(p, receiver, r.kind === 'corner' || r.kind === 'throw' || r.kind === 'goalkick');
        }
        this.selectionLock = .32; this.charging = false; this.charge = 0;
    }
}
