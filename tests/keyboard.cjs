// Usa las Key reales de Phaser; no presupone que las flechas ya llegaron como vector.
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const Key = require('../node_modules/phaser/src/input/keyboard/keys/Key.js');
const KeyCodes = require('../node_modules/phaser/src/input/keyboard/keys/KeyCodes.js');
const { KeyboardControls } = require('../.test-build/systems/KeyboardControls');
const { Match } = require('../.test-build/simulation/Match');
function keyboard() {
    const keys = {};
    const scene = { events: new EventEmitter().setMaxListeners(0), input: { keyboard: {
        addKeys(names) {
            for (const name of names.split(',')) keys[name] = new Key(null, KeyCodes[name]);
            return keys;
        }, addCapture() {},
    } } };
    const controls = new KeyboardControls(scene);
    let time = 1;
    return { controls, scene,
        down(name) { keys[name].onDown({ timeStamp: time++, keyCode: KeyCodes[name] }); },
        up(name) { keys[name].onUp({ timeStamp: time++, keyCode: KeyCodes[name] }); },
    };
}
for (const vertical of ['UP', 'DOWN']) for (const horizontal of ['LEFT', 'RIGHT']) for (const action of ['SPACE', 'X']) {
    const k = keyboard(), m = new Match(999); m.takeRestart(); m.ai.update = () => {};
    const p = m.active, x = horizontal === 'LEFT' ? -1 : 1, y = vertical === 'UP' ? -1 : 1;
    for (const q of m.players) { q.x = 240; q.y = 300 + q.id * 50; }
    p.x = 720; p.y = 1200; p.facing = { x: x / Math.SQRT2, y: y / Math.SQRT2 };
    m.ball.reset(p.x + p.facing.x * 24, p.y + p.facing.y * 24);
    m.stats.shots = [0, 0];
    k.down(vertical); k.down(horizontal); k.down(action);
    for (let i = 0; i < 36; i++) {
        const input = k.controls.read();
        assert(input.move.x * x > .7 && input.move.y * y > .7 && input.held);
        assert.equal(input.pressed, i === 0);
        m.update(1 / 120, input);
    }
    k.up(action); const release = k.controls.read();
    assert(release.released && !release.held); m.update(1 / 120, release);
    assert.equal(m.stats.shots[0], 1, `${vertical}+${horizontal}+${action}`);
    assert(m.ball.vx * x > 100 && m.ball.vy * y > 100);
    assert(Math.abs(Math.abs(m.ball.vx / m.ball.vy) - 1) < .025);
    k.scene.events.emit('shutdown');
}
{
    const k = keyboard(); k.down('UP'); k.down('RIGHT'); k.down('SPACE'); k.up('SPACE');
    const input = k.controls.read();
    assert(input.pressed && input.released && !input.held);
    assert(input.move.x > .7 && input.move.y < -.7);
}
{
    const k = keyboard(); k.down('SPACE'); assert(k.controls.read().pressed);
    k.down('X'); assert(!k.controls.read().pressed, 'dos teclas no deben reiniciar la carga');
    k.up('SPACE'); let input = k.controls.read(); assert(input.held && !input.released);
    k.up('X'); input = k.controls.read(); assert(!input.held && input.released);
    k.controls.clear(); assert(!k.controls.read().pressed);
}
console.log('10 comprobaciones de teclado superadas: 4 diagonales × 2 teclas, toque rápido y acción combinada.');
