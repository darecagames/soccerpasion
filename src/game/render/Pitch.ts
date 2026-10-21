import type { Scene } from 'phaser';
import { FIELD } from '../config/tuning';

export function createPitch(scene: Scene) {
    const key = 'stadium';
    if (!scene.textures.exists(key)) {
        // Decorado estático a media resolución para conservar el grano pixel art.
        const tex = scene.textures.createCanvas(key, FIELD.worldWidth / 2, FIELD.worldHeight / 2)!;
        const c = tex.context;
        c.scale(.5, .5);
        c.fillStyle = '#102b31'; c.fillRect(0, 0, FIELD.worldWidth, FIELD.worldHeight);
        let seed = 51;
        const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
        // Gradas, pasillos y espectadores; una sola textura, sin coste por espectador.
        for (let row = 0; row < 9; row++) {
            for (let y = 80; y < FIELD.worldHeight - 60; y += 14) {
                for (const x of [12 + row * 12, FIELD.worldWidth - 20 - row * 12]) {
                    c.fillStyle = ['#456072', '#73867a', '#b7ad87', '#c46a56', '#3e8fa1', '#253849'][Math.floor(random() * 6)];
                    c.fillRect(x, y, 7, 7); c.fillStyle = '#182c38'; c.fillRect(x, y + 7, 8, 4);
                }
            }
        }
        c.fillStyle = '#294c46'; c.fillRect(132, 125, 1176, 1935);
        c.fillStyle = '#3d8658'; c.fillRect(155, 155, 1130, 1870);
        const stripe = FIELD.height / 16;
        for (let i = 0; i < 16; i++) {
            c.fillStyle = i % 2 ? '#3a8957' : '#40935d';
            c.fillRect(FIELD.left, FIELD.top + i * stripe, FIELD.width, stripe + 1);
        }
        for (let i = 0; i < 36000; i++) {
            const x = FIELD.left + random() * FIELD.width, y = FIELD.top + random() * FIELD.height;
            c.fillStyle = random() > .5 ? '#ffffff08' : '#102c230c'; c.fillRect(x, y, 2, 2);
        }
        c.strokeStyle = '#d6e8c5'; c.lineWidth = 3;
        c.strokeRect(FIELD.left, FIELD.top, FIELD.width, FIELD.height);
        const line = (x1: number, y1: number, x2: number, y2: number) => {
            c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
        };
        line(FIELD.left, FIELD.cy, FIELD.right, FIELD.cy);
        c.beginPath(); c.ellipse(FIELD.cx, FIELD.cy, 144, 144, 0, 0, Math.PI * 2); c.stroke();
        c.fillStyle = '#e6edce'; c.beginPath(); c.arc(FIELD.cx, FIELD.cy, 4, 0, Math.PI * 2); c.fill();
        for (const top of [true, false]) {
            const y = top ? FIELD.top : FIELD.bottom, sign = top ? 1 : -1;
            c.strokeRect(FIELD.cx - FIELD.boxWidth / 2, top ? y : y - FIELD.boxDepth, FIELD.boxWidth, FIELD.boxDepth);
            c.strokeRect(FIELD.cx - 155, top ? y : y - 100, 310, 100);
            c.beginPath(); c.arc(FIELD.cx, y + sign * 198, 4, 0, Math.PI * 2); c.fill();
            c.beginPath(); c.arc(FIELD.cx, y + sign * 198, 120, top ? .76 : Math.PI + .76, top ? Math.PI - .76 : Math.PI * 2 - .76); c.stroke();
            const gy = top ? y - FIELD.goalDepth : y;
            c.fillStyle = '#122f32'; c.fillRect(FIELD.cx - 120 + 10, gy + 8, 240, FIELD.goalDepth);
            c.fillStyle = '#bdcdc148'; c.fillRect(FIELD.cx - 115, gy, 230, FIELD.goalDepth);
            c.strokeStyle = '#d3dfcd60'; c.lineWidth = 1.5;
            for (let nx = FIELD.cx - 115; nx <= FIELD.cx + 115; nx += 12) line(nx, gy, nx, gy + FIELD.goalDepth);
            for (let ny = gy; ny <= gy + FIELD.goalDepth; ny += 10) line(FIELD.cx - 115, ny, FIELD.cx + 115, ny);
            c.strokeStyle = '#edf3dd'; c.lineWidth = 6;
            c.strokeRect(FIELD.cx - 115, gy, 230, FIELD.goalDepth);
            c.strokeStyle = '#d6e8c5'; c.lineWidth = 3;
            for (const x of [FIELD.left, FIELD.right]) {
                c.beginPath(); c.arc(x, y, 23, x === FIELD.left ? (top ? 0 : -Math.PI / 2) : (top ? Math.PI / 2 : Math.PI),
                    x === FIELD.left ? (top ? Math.PI / 2 : 0) : (top ? Math.PI : Math.PI * 1.5)); c.stroke();
                c.fillStyle = '#f5d87a'; c.fillRect(x - 2, y - 23, 3, 25);
                c.fillStyle = '#f37b54'; c.fillRect(x + 1, y - 23, 14, 9);
            }
        }
        // Vallas publicitarias originales.
        c.font = 'bold 13px monospace'; c.textAlign = 'center';
        for (let i = 0; i < 10; i++) {
            const y = FIELD.top + 75 + i * 166;
            for (const x of [142, 1298]) {
                c.save(); c.translate(x, y); c.rotate(x < FIELD.cx ? -Math.PI / 2 : Math.PI / 2);
                c.fillStyle = i % 2 ? '#ddcba4' : '#1b3645'; c.fillRect(-65, -9, 130, 18);
                c.fillStyle = i % 2 ? '#283c43' : '#72d5c8'; c.fillText(i % 2 ? 'EL JUEGO BONITO' : 'SOCCERPASIÓN', 0, 5); c.restore();
            }
        }
        tex.refresh();
    }
    scene.add.image(0, 0, key).setOrigin(0).setScale(2).setDepth(-100);
    // Travesaños elevados sobre los jugadores: perspectiva cenital inclinada.
    const net = scene.add.graphics().setDepth(FIELD.worldHeight + 100);
    net.lineStyle(5, 0xf0f2df, .95);
    for (const y of [FIELD.top - 36, FIELD.bottom + 24]) {
        net.lineBetween(FIELD.cx - 115, y, FIELD.cx + 115, y);
        net.lineStyle(2, 0xb4c8be, .6);
        net.lineBetween(FIELD.cx - 115, y + 3, FIELD.cx + 115, y + 3);
        net.lineStyle(5, 0xf0f2df, .95);
    }
}
