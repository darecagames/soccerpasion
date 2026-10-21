import type { Scene } from 'phaser';
import { TEAMS } from '../config/tuning';

export const DIRECTIONS = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
export function loadAssets(scene: Scene) {
    for (const dir of DIRECTIONS) scene.load.image(`source-${dir}`, `assets/players/${dir}.png`);
    scene.load.image('ball', 'assets/ball.png');
}
const rgb = (hex: string) => [1, 3, 5].map(n => parseInt(hex.slice(n, n + 2), 16));

// Adaptación de paleta en tiempo de carga sobre los dibujos CC0 originales.
// Conserva cada píxel y cada fotograma de las ocho animaciones; no dibuja muñecos geométricos.
export function prepareKits(scene: Scene) {
    for (let team = 0; team < 2; team++) for (const keeper of [false, true]) for (const dir of DIRECTIONS) {
        const key = `kit-${team}-${keeper ? 'gk' : 'out'}-${dir}`;
        if (scene.textures.exists(key)) continue;
        const original = scene.textures.get(`source-${dir}`).getSourceImage() as HTMLImageElement;
        const texture = scene.textures.createCanvas(key, original.width, original.height)!;
        const ctx = texture.context;
        ctx.drawImage(original, 0, 0);
        const pixels = ctx.getImageData(0, 0, original.width, original.height);
        const kit = TEAMS[team];
        const shirt = rgb(keeper ? kit.keeper : kit.shirt), shorts = rgb(keeper ? '#313553' : kit.shorts);
        const socks = rgb(keeper ? kit.keeper : kit.socks);
        const skin = rgb(team === 0 ? '#e3b184' : '#ba825b');
        const back = dir.includes('north');
        for (let y = 0; y < original.height; y++) for (let x = 0; x < original.width; x++) {
            const i = (y * original.width + x) * 4;
            if (pixels.data[i + 3] === 0) continue;
            const localX = x % 32;
            let color = shirt;
            if (y < 6 || back && y < 12) color = rgb('#292936');
            else if (y < 14) color = skin;
            else if (y < 29 && (localX < 10 || localX > 22)) color = skin;
            else if (y >= 43) color = rgb('#192336');
            else if (y >= 36) color = socks;
            else if (y >= 29) color = shorts;
            const shade = pixels.data[i] < 50 ? .63 : 1;
            pixels.data[i] = color[0] * shade;
            pixels.data[i + 1] = color[1] * shade;
            pixels.data[i + 2] = color[2] * shade;
        }
        ctx.putImageData(pixels, 0, 0); texture.refresh();
        for (let frame = 0; frame < 8; frame++) texture.add(frame, 0, frame * 32, 0, 32, 48);
    }
}
