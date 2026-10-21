import { FIELD, TUNING } from '../config/tuning';
import { clamp, distance, dot, normal, segmentDistance, toward, type Vec } from './math';
import type { Match } from './Match';
import type { Player } from './Player';

export class FootballAI {
    update(match: Match, dt: number) {
        const ball = match.ball;
        const carrier = match.closestPlayer(42);
        for (const team of [0, 1] as const) {
            const squad = match.players.filter(p => p.team === team && !p.keeper);
            const predicted = { x: ball.x + ball.vx * .22, y: ball.y + ball.vy * .22 };
            const pressers = [...squad].sort((a, b) => distance(a, predicted) - distance(b, predicted));
            const direction = match.direction(team);
            const hasBall = carrier?.team === team;
            for (const p of match.players.filter(p => p.team === team)) {
                if (p.keeper) { this.goalkeeper(match, p, dt); continue; }
                if (p.id === match.controlled) continue;
                p.decision -= dt;
                if (p.decision > 0) continue;
                p.decision = TUNING.ai.decisionInterval + (p.number % 3) * .012;
                const d = distance(p, ball);
                if (match.canKick(p) && (!carrier || carrier.team !== p.team || carrier.id === p.id)) {
                    p.carryTime += TUNING.ai.decisionInterval;
                    const goal = { x: FIELD.cx, y: direction < 0 ? FIELD.top : FIELD.bottom };
                    const goalDistance = Math.abs(goal.y - p.y);
                    const nearestOpponent = Math.min(...match.players.filter(q => q.team !== team).map(q => distance(p, q)));
                    if (p.carryTime > .18 && goalDistance < TUNING.ai.shotDistance && Math.abs(p.x - FIELD.cx) < 330) {
                        const corner = match.random() > .5 ? 1 : -1;
                        const aim = toward(p, { x: FIELD.cx + corner * (80 + match.random() * 20), y: goal.y });
                        match.shoot(p, aim, .65 + match.random() * .3);
                        continue;
                    }
                    const receiver = this.receiver(match, p, toward(p, goal), true);
                    if (receiver && p.carryTime > .35 && (nearestOpponent < 105 || p.carryTime > 1.65)) {
                        match.pass(p, receiver); continue;
                    }
                    // Conducir hacia un carril libre, conservando el avance vertical.
                    let avoidX = 0;
                    for (const q of match.players.filter(q => q.team !== team)) {
                        if (distance(p, q) < 130 && (q.y - p.y) * direction > 0)
                            avoidX += (p.x > q.x ? 1 : -1) * .65;
                    }
                    p.intent = normal({ x: clamp((goal.x - p.x) / 600 + avoidX, -.85, .85), y: direction });
                } else {
                    p.carryTime = 0;
                    let target: Vec;
                    const rank = pressers.indexOf(p);
                    if (rank === 0 || (!hasBall && rank === 1 && d < 250)) {
                        target = { x: clamp(predicted.x, FIELD.left + 20, FIELD.right - 20),
                            y: clamp(predicted.y, FIELD.top + 20, FIELD.bottom - 20) };
                        if (!hasBall && carrier && carrier.team !== team && d < 60 && d > 27 &&
                            ball.z < 16 && match.random() < .25) p.tackle();
                    } else {
                        const baseY = FIELD.cy + (p.home.y - FIELD.cy) * -direction;
                        const advance = (ball.y - FIELD.cy) * .36 + direction * (hasBall ? 130 : -35);
                        target = { x: clamp(p.home.x + (ball.x - FIELD.cx) * .23, FIELD.left + 65, FIELD.right - 65),
                            y: clamp(baseY + advance, FIELD.top + 140, FIELD.bottom - 140) };
                        // Ofrecer una salida diagonal al poseedor; no amontonarse sobre él.
                        if (hasBall && p.role === 'FW') target.y = clamp(ball.y + direction * 190,
                            FIELD.top + 110, FIELD.bottom - 110);
                        if (!hasBall && carrier && p.role === 'DF') {
                            const danger = match.players.filter(q => q.team !== team && !q.keeper)
                                .sort((a, b) => distance(a, target) - distance(b, target))[0];
                            if (danger && distance(danger, target) < 220) {
                                target.x = target.x * .45 + danger.x * .55;
                                target.y = target.y * .45 + (danger.y - direction * 38) * .55;
                            }
                        }
                    }
                    p.intent = distance(p, target) > 13 ? toward(p, target) : { x: 0, y: 0 };
                }
            }
        }
    }

    receiver(match: Match, p: Player, facing: Vec, tactical = false): Player | undefined {
        const options = match.players.filter(q => q.team === p.team && q !== p && !q.keeper);
        let best: Player | undefined, bestScore = -Infinity;
        for (const q of options) {
            const d = distance(p, q);
            const alignment = dot(toward(p, q), facing);
            if (d < 65 || d > 700 || alignment < (tactical ? -.4 : Math.cos(TUNING.ball.passAimHalfAngle))) continue;
            const opponents = match.players.filter(o => o.team !== p.team);
            const lane = Math.min(...opponents.map(o => segmentDistance(o, p, q)));
            const space = Math.min(...opponents.map(o => distance(o, q)));
            const score = alignment * 220 - d * .2 + Math.min(lane, 100) * 1.2 + Math.min(space, 160) * .35
                + (q.y - p.y) * match.direction(p.team) * (tactical ? .24 : .03);
            if (score > bestScore) { best = q; bestScore = score; }
        }
        return best;
    }

    private goalkeeper(match: Match, p: Player, dt: number) {
        p.decision -= dt;
        if (p.decision > 0 && p.keeperTarget) {
            p.intent = distance(p, p.keeperTarget) > 8 ? toward(p, p.keeperTarget) : { x: 0, y: 0 };
            return;
        }
        p.decision = TUNING.ai.reaction;
        const direction = match.direction(p.team);
        const line = direction < 0 ? FIELD.bottom : FIELD.top;
        const ball = match.ball;
        const depth = Math.abs(line - ball.y);
        let targetX = FIELD.cx + clamp((ball.x - FIELD.cx) * .38, -130, 130);
        let targetY = line + direction * clamp(28 + (1740 - depth) * .025, 28, 95);
        const incoming = ball.vy * direction < -60;
        if (incoming && depth < 620) {
            const arrival = (p.y - ball.y) / ball.vy;
            if (arrival > 0 && arrival < 1.1) {
                // Anticipación imperfecta: una colocación reconocible sin adivinar cada tiro.
                targetX = clamp(ball.x + ball.vx * arrival * .7, FIELD.cx - 150, FIELD.cx + 150);
                if (arrival < .34 && Math.abs(targetX - p.x) > 35 && p.actionTime <= 0) {
                    p.action = 'save'; p.actionTime = .45;
                    p.vx = Math.sign(targetX - p.x) * TUNING.ai.keeperDiveSpeed;
                }
            }
        }
        if (distance(p, ball) < 200 && ball.z < 25 && Math.abs(ball.x - FIELD.cx) < 245 && depth < 250 && !incoming) {
            targetX = ball.x; targetY = ball.y;
        }
        p.keeperTarget = { x: targetX, y: targetY };
        p.intent = distance(p, p.keeperTarget) > 8 ? toward(p, p.keeperTarget) : { x: 0, y: 0 };
        if (match.canKick(p) && ball.kickLock <= 0) {
            const receiver = this.receiver(match, p, { x: 0, y: direction }, true);
            if (receiver) match.pass(p, receiver, true);
            else match.shoot(p, { x: .2, y: direction }, .8, true);
        }
    }
}
