import { GameObjects, type Scene } from 'phaser';
import { FIELD, TEAMS } from '../config/tuning';
import type { Match } from '../simulation/Match';
import { DIRECTIONS } from './Assets';

export class MatchView {
    private sprites: GameObjects.Sprite[] = [];
    private shadows: GameObjects.Ellipse[] = [];
    private numbers: GameObjects.Text[] = [];
    private ball: GameObjects.Image;
    private ballShadow: GameObjects.Ellipse;
    private marker: GameObjects.Graphics;
    private chargeBar: GameObjects.Graphics;
    constructor(scene: Scene, match: Match) {
        for (const p of match.players) {
            this.shadows.push(scene.add.ellipse(0, 0, 25, 11, 0x122a2e, .33));
            this.sprites.push(scene.add.sprite(0, 0, `kit-${p.team}-${p.keeper ? 'gk' : 'out'}-south`, 0)
                .setOrigin(.5, .92).setScale(1.12));
            this.numbers.push(scene.add.text(0, 0, `${p.number}`, {
                fontFamily: 'monospace', fontSize: '13px', color: '#f6f1d8', stroke: '#163339', strokeThickness: 3,
            }).setOrigin(.5).setAlpha(.8));
        }
        this.ballShadow = scene.add.ellipse(0, 0, 15, 7, 0x142b2b, .45);
        this.ball = scene.add.image(0, 0, 'ball').setDisplaySize(15, 15);
        this.marker = scene.add.graphics(); this.chargeBar = scene.add.graphics();
    }
    update(match: Match) {
        for (const p of match.players) {
            const sprite = this.sprites[p.id], shadow = this.shadows[p.id], label = this.numbers[p.id];
            const angle = Math.atan2(p.facing.y, p.facing.x);
            const index = (Math.round(angle / (Math.PI / 4)) + 8) % 8;
            const sliding = p.slide > 0, saving = p.actionTime > 0 && p.action === 'save';
            const heading = p.actionTime > 0 && p.action === 'header';
            const kicking = p.actionTime > 0 && p.action === 'kick';
            const frame = sliding || saving ? 3 : kicking ? 5 : p.speed > 15 ? Math.floor(p.animationTime * 13) % 8 : 0;
            sprite.setTexture(`kit-${p.team}-${p.keeper ? 'gk' : 'out'}-${DIRECTIONS[index]}`, frame);
            let jump = heading ? Math.sin((.35 - p.actionTime) / .35 * Math.PI) * 24 : 0;
            if (match.phase === 'goal' && p.team === match.scorer) jump = Math.max(0, Math.sin(match.phaseTime * 8 + p.id)) * 13;
            sprite.setPosition(p.x, p.y - jump).setDepth(p.y + 2);
            sprite.setRotation(sliding || saving ? (p.facing.x >= 0 ? -1.15 : 1.15) : 0);
            sprite.setScale(sliding || saving ? 1.2 : 1.12, sliding || saving ? .82 : 1.12);
            sprite.setAlpha(p.recovery > .1 ? .65 : 1);
            shadow.setPosition(p.x + 3, p.y + 2).setDepth(p.y - 1);
            label.setPosition(p.x, p.y - 56 - jump).setDepth(p.y + 3);
            label.setVisible(p.id === match.controlled || p.keeper);
        }
        const b = match.ball;
        this.ball.setPosition(b.x, b.y - b.z * .7 - 5).setRotation(b.rotation).setDepth(b.y + 20 + b.z);
        this.ball.setScale((15 + Math.min(b.z, 100) * .015) / this.ball.width);
        this.ballShadow.setPosition(b.x + b.z * .1, b.y + 2).setDepth(b.y).setScale(1 + b.z / 250).setAlpha(Math.max(.14, .45 - b.z / 700));
        this.marker.clear(); this.chargeBar.clear();
        const p = match.active;
        const c = TEAMS[0].color;
        this.marker.fillStyle(c).fillTriangle(p.x - 8, p.y - 72, p.x + 8, p.y - 72, p.x, p.y - 62);
        this.marker.lineStyle(1.5, c, .7).strokeEllipse(p.x, p.y + 1, 33, 15).setDepth(FIELD.worldHeight + 110);
        if (match.charging) {
            this.chargeBar.fillStyle(0x132837, .9).fillRoundedRect(p.x - 25, p.y + 14, 50, 8, 3);
            this.chargeBar.fillStyle(match.charge > .4 ? 0xffd47b : c).fillRect(p.x - 23, p.y + 16, 46 * match.charge / .72, 4);
            this.chargeBar.setDepth(FIELD.worldHeight + 120);
        }
    }
}
