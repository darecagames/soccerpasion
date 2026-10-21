const assert = require('node:assert/strict');
const { Match } = require('../.test-build/simulation/Match.js');
const { Ball } = require('../.test-build/simulation/Ball.js');
const { Player } = require('../.test-build/simulation/Player.js');
const { FIELD, TUNING } = require('../.test-build/config/tuning.js');
const { emptyControls } = require('../.test-build/simulation/types.js');
const dt = TUNING.step;
let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`OK ${name}`); }
function advance(match, seconds, input = emptyControls()) { for (let t = 0; t < seconds; t += dt) { match.update(dt, input); match.events.length = 0; } }
function isolated() {
    const match = new Match(999);
    match.takeRestart();
    match.stats = { shots: [0, 0], passes: [0, 0], saves: [0, 0] };
    match.ai.update = () => {};
    for (const p of match.players) { p.x = 230 + p.id * 40; p.y = 1100; p.intent = { x: 0, y: 0 }; }
    return match;
}
test('22 futbolistas y dos porteros; formaciones y direcciones invertidas', () => {
    const m = new Match(); assert.equal(m.players.length, 22);
    assert.equal(m.players.filter(p => p.keeper).length, 2);
    assert.equal(m.direction(0), -1); assert.equal(m.direction(1), 1);
});
test('rozamiento, botes amortiguados y balón independiente del jugador', () => {
    const b = new Ball(); b.kick({ x: 1, y: 0 }, 600, 220, 9, 0);
    let maxZ = 0, bounced = false, wasFalling = false;
    for (let t = 0; t < 9; t += dt) {
        b.update(dt); maxZ = Math.max(maxZ, b.z);
        if (b.vz < 0) wasFalling = true;
        if (wasFalling && b.vz > 0) bounced = true;
        assert(b.z >= 0);
    }
    assert(maxZ > 25); assert(bounced); assert(Math.abs(b.vx) < .1); assert(b.x > FIELD.cx + 300);
});
test('velocidad diagonal normalizada y respuesta rápida', () => {
    const a = new Player(0, 0, 1, 'MF', { x: 600, y: 900 });
    const b = new Player(1, 0, 2, 'MF', { x: 600, y: 900 });
    a.x = b.x = 600; a.y = b.y = 900;
    a.intent = { x: 1, y: 0 }; b.intent = { x: 1, y: 1 };
    for (let i = 0; i < 40; i++) { a.update(dt); b.update(dt); }
    assert(Math.abs(a.speed - b.speed) < .001); assert(a.speed >= TUNING.player.speed * .99);
});
test('pase corto, carga de tiro y potencia variable', () => {
    const m = isolated(), p = m.active;
    m.ball.reset(p.x, p.y - 24); p.facing = { x: 0, y: -1 };
    m.update(dt, { ...emptyControls(), pressed: true, held: true });
    m.update(dt, { ...emptyControls(), released: true });
    assert.equal(m.stats.passes[0], 1);
    m.ball.reset(p.x, p.y - 24); p.touchCooldown = 0;
    m.shoot(p, { x: 0, y: -1 }, .2); const low = Math.hypot(m.ball.vx, m.ball.vy);
    m.shoot(p, { x: 0, y: -1 }, 1); assert(Math.hypot(m.ball.vx, m.ball.vy) > low + 250);
    m.ball.reset(p.x, p.y - 24);
    m.update(dt, { ...emptyControls(), pressed: true, held: true });
    advance(m, .3, { ...emptyControls(), held: true });
    m.update(dt, { ...emptyControls(), released: true });
    assert(m.stats.shots[0] >= 3);
});
test('aftertouch: curva lateral, elevación y ventana limitada', () => {
    const b = new Ball(); b.kick({ x: 0, y: -1 }, 850, 120, 9, 0, true);
    for (let i = 0; i < 30; i++) { b.applyAftertouch({ x: 1, y: 1 }, -1, dt); b.update(dt); }
    assert(b.vx > 40); assert(b.z > 25);
    for (let i = 0; i < 30; i++) b.update(dt);
    const spin = b.spin; b.applyAftertouch({ x: 1, y: 1 }, -1, dt); assert.equal(b.spin, spin);
    const down = new Ball(); down.kick({ x: 0, y: 1 }, 850, 120, 9, 0, true);
    for (let i = 0; i < 30; i++) { down.applyAftertouch({ x: 1, y: 0 }, 1, dt); down.update(dt); }
    assert(down.vx > 40, 'A/D conservan su sentido al cambiar de campo');
});
test('gol válido, balón alto por encima del larguero y cambio de saque', () => {
    const m = isolated();
    m.ball.reset(FIELD.cx + 50, FIELD.top + 20); m.ball.kick({ x: 0, y: -1 }, 900, 0, 9, 0);
    advance(m, .08); assert.deepEqual(m.score, [1, 0]); assert.equal(m.phase, 'goal');
    advance(m, 3); assert.equal(m.restart.kind, 'kickoff'); assert.equal(m.restart.team, 1);
    const high = isolated(); high.ball.reset(FIELD.cx, FIELD.top + 20); high.ball.z = 140;
    high.ball.kick({ x: 0, y: -1 }, 900, 0, 9, 0); advance(high, .08);
    assert.deepEqual(high.score, [0, 0]); assert.equal(high.restart.kind, 'goalkick');
});
test('banda, córner y saque de puerta según último contacto', () => {
    const cases = [
        [FIELD.left + 5, 700, { x: -1, y: 0 }, 0, 'throw', 1],
        [FIELD.left + 80, FIELD.top + 5, { x: 0, y: -1 }, 1, 'corner', 0],
        [FIELD.left + 80, FIELD.top + 5, { x: 0, y: -1 }, 0, 'goalkick', 1],
    ];
    for (const [x, y, dir, last, kind, team] of cases) {
        const m = isolated(); m.ball.reset(x, y); m.ball.kick(dir, 700, 0, last * 11 + 2, last);
        advance(m, .07); assert.equal(m.restart.kind, kind); assert.equal(m.restart.team, team);
        advance(m, 5.2); assert.equal(m.phase, 'playing');
    }
});
test('colisiones de poste y de futbolista a velocidad máxima', () => {
    const m = isolated(); m.ball.reset(FIELD.cx - FIELD.goalWidth / 2, FIELD.top + 40);
    m.ball.kick({ x: 0, y: -1 }, 1100, 0, 9, 0); advance(m, .07);
    assert.equal(m.phase, 'playing'); assert(m.ball.vy > 0);
    const n = isolated(); const defender = n.players[12]; defender.x = 700; defender.y = 700;
    n.ball.reset(700, 750); n.ball.kick({ x: 0, y: -1 }, 1100, 0, 9, 0);
    advance(n, .06); assert(n.ball.vy > -1000); assert.equal(n.ball.lastTeam, 1);
});
test('entrada con recuperación; portero puede blocar y sacar', () => {
    const m = isolated(), p = m.active;
    m.ball.reset(p.x, p.y - 80); m.update(dt, { ...emptyControls(), pressed: true });
    assert(p.slide > 0); advance(m, .36); assert(p.recovery > 0);
    const n = isolated(), gk = n.players[0]; gk.x = FIELD.cx; gk.y = FIELD.bottom - 50;
    n.ball.reset(FIELD.cx, gk.y - 35); n.ball.kick({ x: 0, y: 1 }, 500, 0, 20, 1);
    advance(n, .05); assert.equal(n.heldBy, 0); advance(n, .8); assert.equal(n.heldBy, -1);
    assert(n.stats.saves[0] > 0); assert(n.stats.passes[0] > 0 || n.ball.vy < 0);
});
test('partidos completos: IA activa, descanso, cambio de campo, sin NaN ni bloqueos', () => {
    for (const seed of [7, 42, 99]) {
        const m = new Match(40, seed); let halftime = false;
        for (let t = 0; t < 160 && m.phase !== 'finished'; t += dt) {
            m.update(dt); m.events.length = 0;
            if (m.phase === 'halftime') halftime = true;
            for (const entity of [...m.players, m.ball]) assert(Number.isFinite(entity.x) && Number.isFinite(entity.y));
        }
        assert.equal(m.phase, 'finished'); assert(halftime); assert.equal(m.direction(0), 1);
        assert(m.stats.passes[1] + m.stats.shots[1] > 2);
        console.log(`   seed ${seed}: ${m.score.join('-')}; pases ${m.stats.passes}; tiros ${m.stats.shots}`);
    }
});
function selectionScenario(defending = true) {
    const m = isolated(); m.controlled = 9; m.selectionLock = m.selectionTimer = 0; m.passTarget = -1;
    for (const p of m.players) { p.x = 200 + p.id * 35; p.y = 1700; }
    m.active.x = 720; m.active.y = 1100;
    m.players[1].x = 720; m.players[1].y = 650;
    m.ball.reset(720, 800); m.ball.lastTeam = defending ? 1 : 0;
    if (defending) { m.players[12].x = 735; m.players[12].y = 800; }
    return m;
}
test('defensa: conserva el jugador si otro solo está algo más cerca', () => {
    const m = selectionScenario(); m.update(dt); assert.equal(m.controlled, 9);
    // También conserva al defensor mientras el balón viaja libre tras un toque rival.
    const loose = selectionScenario(); loose.players[12].y = 1500;
    loose.ball.vy = -500; loose.update(dt); assert.equal(loose.controlled, 9);
});
test('defensa: cambia con compañero a distancia real de intervención', () => {
    const m = selectionScenario(); m.players[1].y = 755;
    m.update(dt); assert.equal(m.controlled, 1);
    assert(m.selectionLock >= TUNING.selection.defenseLock - dt);
    const near = selectionScenario(); near.active.y = 910; near.players[1].y = 770;
    near.update(dt); assert.equal(near.controlled, 9, 'no quitar control al defensor que ya puede intervenir');
});
test('ataque conserva selección previa, receptor del pase y cambio manual libre', () => {
    const attack = selectionScenario(false); attack.update(dt); assert.equal(attack.controlled, 1);
    const pass = selectionScenario(false); pass.passTarget = 2; pass.update(dt); assert.equal(pass.controlled, 2);
    const manual = selectionScenario(); manual.update(dt, { ...emptyControls(), switchPlayer: true });
    assert.equal(manual.controlled, 1);
    const intercepted = selectionScenario(); intercepted.passTarget = 2; intercepted.update(dt);
    assert.equal(intercepted.controlled, 9, 'un pase interceptado no fuerza selección lejana');
});
test('posesión entrega control inmediato pese a bloqueos, carga o receptor previsto', () => {
    for (const lock of ['defense', 'charge', 'aftertouch', 'manual']) {
        const m = selectionScenario(false), receiver = m.players[1];
        receiver.y = 775; m.selectionLock = 1.5; m.selectionTimer = .14; m.passTarget = 2;
        if (lock === 'charge') { m.charging = true; m.charge = .4; }
        if (lock === 'aftertouch') m.ball.aftertouch = .2;
        m.update(dt, { ...emptyControls(), move: { x: 1, y: 0 }, switchPlayer: lock === 'manual' });
        assert.equal(m.controlled, receiver.id, lock);
        assert(receiver.vx > 0, 'el receptor obedece al usuario en el mismo paso');
        assert.equal(m.charging, false); assert.equal(m.passTarget, -1);
    }
});
test('la IA no pasa ni dispara con el poseedor humano y un compañero próximo', () => {
    const m = selectionScenario(false), p = m.players[1]; p.y = 775;
    m.players[2].x = 740; m.players[2].y = 780; m.players[2].carryTime = 4;
    m.ai = new (require('../.test-build/simulation/AI.js').FootballAI)();
    m.update(dt);
    assert.equal(m.controlled, 1); assert.equal(m.stats.passes[0], 0); assert.equal(m.stats.shots[0], 0);
});
test('una recepción física transfiere control sin esperar al siguiente frame', () => {
    const m = selectionScenario(false), p = m.players[1];
    p.y = 780; m.ball.reset(720, 803); m.ball.vy = -700;
    m.ball.z = 25; m.ball.vz = -1800; m.selectionLock = 1;
    m.update(dt, { ...emptyControls(), move: { x: 1, y: 0 } });
    assert.equal(m.controlled, p.id); assert.equal(p.intent.x, 1);
});
test('un pase no devuelve inmediatamente el control al pasador', () => {
    const m = selectionScenario(false), p = m.active, receiver = m.players[1];
    m.ball.reset(p.x, p.y - 24); m.pass(p, receiver);
    m.controlled = receiver.id;
    m.update(dt); assert.equal(m.controlled, receiver.id);
});
test('todos comparten control alto; conducción sostenida y frenada conservan balón físico', () => {
    const m = isolated(), p = m.active;
    assert(m.players.every(q => q.ballControl === TUNING.player.ballControl));
    for (const q of m.players.filter(q => q !== p)) { q.x = 240; q.y = 300 + q.id * 55; }
    p.x = 720; p.y = 1600; p.facing = { x: 0, y: -1 };
    m.ball.reset(720, 1576);
    advance(m, 2, { ...emptyControls(), move: { x: 0, y: -1 } });
    assert.equal(m.controlled, p.id);
    assert(Math.hypot(m.ball.x - p.x, m.ball.y - p.y) < 45, 'no perder balón corriendo recto sin oposición');
    advance(m, .5);
    assert(Math.hypot(m.ball.vx, m.ball.vy) < 5, 'balón amortiguado al parar');
    m.ball.kick({ x: 1, y: 0 }, 700, 0, p.id, p.team);
    const before = p.x; advance(m, .15);
    assert(m.ball.x > before + 75, 'el balón sigue libre tras un golpeo');
});
test('control individual afecta al primer toque sin variar la velocidad del futbolista', () => {
    function receive(skill) {
        const m = isolated(), p = m.active; p.x = 720; p.y = 900; p.ballControl = skill;
        m.ball.reset(720, 928); m.ball.vy = -500;
        advance(m, .025);
        return Math.hypot(m.ball.vx, m.ball.vy);
    }
    assert(receive(.8) < receive(.2));
});
function diagonalScenario() {
    const m = isolated(), p = m.active;
    p.x = 720; p.y = 1200; p.facing = { x: 0, y: -1 };
    for (const q of m.players.filter(q => q !== p)) { q.x = 720; q.y = 1900; }
    m.ball.reset(p.x, p.y - 24);
    return m;
}
const diagonals = [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 }];
function assertDiagonal(m, dir) {
    assert(m.ball.vx * dir.x > 100 && m.ball.vy * dir.y > 100, JSON.stringify(dir));
    assert(Math.abs(Math.abs(m.ball.vx / m.ball.vy) - 1) < .025, 'trayectoria de 45 grados');
}
test('pase rápido en las cuatro diagonales usa la dirección del mismo paso', () => {
    for (const move of diagonals) {
        const m = diagonalScenario();
        m.update(dt, { ...emptyControls(), move, pressed: true, released: true });
        assert.equal(m.stats.passes[0], 1); assertDiagonal(m, move);
    }
});
test('tiro con carga en las cuatro diagonales permite apuntar al soltar', () => {
    for (const move of diagonals) {
        const m = diagonalScenario();
        m.update(dt, { ...emptyControls(), pressed: true, held: true });
        advance(m, .3, { ...emptyControls(), held: true });
        m.update(dt, { ...emptyControls(), move, released: true });
        assert.equal(m.stats.shots[0], 1); assertDiagonal(m, move);
    }
});
test('ayuda de pase respeta el sector diagonal y no elige un compañero lateral', () => {
    const { FootballAI } = require('../.test-build/simulation/AI.js');
    for (const dir of diagonals) {
        const m = diagonalScenario(), p = m.active;
        const aim = { x: dir.x / Math.SQRT2, y: dir.y / Math.SQRT2 };
        const lateral = m.players[1]; lateral.x = p.x + dir.x * 200; lateral.y = p.y;
        const ai = new FootballAI();
        assert.equal(ai.receiver(m, p, aim), undefined, 'no convertir diagonal en pase horizontal');
        const receiver = m.players[2]; receiver.x = p.x + dir.x * 250; receiver.y = p.y + dir.y * 250;
        assert.equal(ai.receiver(m, p, aim)?.id, receiver.id);
    }
});
test('mantener la diagonal no añade efecto; cambiar flechas después sí lo añade', () => {
    const m = diagonalScenario(), move = { x: 1, y: -1 };
    m.update(dt, { ...emptyControls(), pressed: true, held: true });
    advance(m, .3, { ...emptyControls(), held: true });
    m.update(dt, { ...emptyControls(), move, released: true });
    advance(m, .08, { ...emptyControls(), move });
    assertDiagonal(m, move); assert.equal(m.ball.spin, 0);
    m.update(dt, { ...emptyControls(), move: { x: 1, y: 0 } });
    assert(m.ball.spin > 0, 'aftertouch sigue disponible al cambiar la dirección');
});
test('saque manual respeta dirección diagonal aunque haya compañero horizontal', () => {
    const m = new Match(), p = m.active;
    const move = { x: 1, y: -1 };
    m.update(dt, { ...emptyControls(), move, pressed: true, released: true });
    assert.equal(m.phase, 'playing'); assertDiagonal(m, move);
    assert(p.actionTime > 0);
});
test('conducción prolongada: doce segundos con giros y sin pérdida automática', () => {
    const m = isolated(), p = m.active;
    for (const q of m.players.filter(q => q !== p)) { q.x = 240; q.y = 300 + q.id * 55; }
    p.x = 650; p.y = 1200; p.facing = { x: 1, y: 0 };
    m.ball.reset(674, 1200);
    const route = [{ x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }];
    let maxGap = 0;
    for (let lap = 0; lap < 4; lap++) for (const move of route) for (let i = 0; i < 96; i++) {
        m.update(dt, { ...emptyControls(), move });
        maxGap = Math.max(maxGap, Math.hypot(m.ball.x - p.x, m.ball.y - p.y));
        assert.equal(m.controlled, p.id);
    }
    assert(maxGap < TUNING.ball.controlDistance + 3, `distancia máxima al pie: ${maxGap}`);
    advance(m, .5); assert(Math.hypot(m.ball.vx, m.ball.vy) < 5);
});
console.log(`${passed} pruebas superadas.`);
