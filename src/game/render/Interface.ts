import { FIELD, TEAMS } from '../config/tuning';
import type { Match } from '../simulation/Match';
import type { Stats } from '../simulation/types';

export class Interface {
    root: HTMLDivElement;
    private score?: HTMLElement;
    private clock?: HTMLElement;
    private phase?: HTMLElement;
    private player?: HTMLElement;
    private banner?: HTMLElement;
    private radar?: CanvasRenderingContext2D;
    private actionKey?: HTMLElement;
    constructor() {
        this.root = document.createElement('div'); this.root.className = 'interface';
        document.getElementById('game-container')!.append(this.root);
    }
    destroy() { this.root.remove(); }
    menu() {
        this.root.className = 'interface menu-screen simple-menu';
        this.root.innerHTML = `
            <div class="menu-copy"><div class="eyebrow">FÚTBOL ARCADE · 11 CONTRA 11</div>
            <h1>SOCCER<br><em>PASIÓN</em></h1>
            <div class="start-command"><span class="start-pointer">▶</span> START</div>
            <small>INTRO O ESPACIO PARA EMPEZAR</small></div>
            <div class="menu-note">EL BALÓN VUELVE A RODAR.</div>`;
    }
    match() {
        this.root.className = 'interface match-interface';
        this.root.innerHTML = `<div class="brand">SOCCER<span>PASIÓN</span><small>PARTIDO AMISTOSO</small></div>
            <div class="scoreboard"><div class="team home">PAS <i></i></div><div class="score" id="score">0 <b>:</b> 0</div><div class="team away"><i></i> BRA</div>
            <div class="clock" id="clock">1T &nbsp; 00:00</div></div>
            <div class="live"><i></i> LA PASIÓN <span>11 v 11</span></div>
            <div class="phase-toast" id="phase"></div>
            <div class="player-panel" id="player"></div>
            <div class="match-keys"><span><kbd>↑ ↓ ← →</kbd> MOVER</span><span><kbd id="action-key">ESPACIO / X</kbd> TOQUE: PASE · MANTENER: TIRO</span><span><kbd>Q</kbd> CAMBIO</span><span><kbd>P</kbd> PAUSA</span><span><kbd>F</kbd> FULL</span></div>
            <div class="radar"><div>VISTA TÁCTICA <i>4–4–2</i></div><canvas width="184" height="272"></canvas></div>
            <div class="center-banner" id="banner"></div>`;
        this.score = this.root.querySelector('#score')!; this.clock = this.root.querySelector('#clock')!;
        this.phase = this.root.querySelector('#phase')!; this.player = this.root.querySelector('#player')!;
        this.banner = this.root.querySelector('#banner')!;
        this.radar = this.root.querySelector('canvas')!.getContext('2d')!;
        this.actionKey = this.root.querySelector('#action-key')!;
    }
    showActionHeld(held: boolean) { this.actionKey?.classList.toggle('key-held', held); }
    update(match: Match, paused: boolean) {
        this.score!.innerHTML = `${match.score[0]} <b>:</b> ${match.score[1]}`;
        const minute = match.minute;
        this.clock!.textContent = `${match.half}T  ${String(Math.floor(minute)).padStart(2, '0')}:${String(Math.floor(minute % 1 * 60)).padStart(2, '0')}`;
        const role = { GK: 'PORTERO', DF: 'DEFENSA', MF: 'CENTROCAMPISTA', FW: 'DELANTERO' }[match.active.role];
        this.player!.innerHTML = `<strong>${String(match.active.number).padStart(2, '0')}</strong><div>${role}<b>ATLÉTICO PASIÓN</b><small>ATACAS HACIA ${match.direction(0) < 0 ? 'ARRIBA ↑' : 'ABAJO ↓'}</small></div>`;
        this.phase!.classList.toggle('visible', match.phase === 'restart' || match.ball.aftertouch > 0);
        if (match.phase === 'restart') this.phase!.innerHTML = `<b>${match.message}</b> · ${TEAMS[match.restart.team].short}
            <small>${match.restart.team === 0 ? 'ESPACIO / X para sacar · FLECHAS para orientar' : 'El rival prepara el saque'}</small>`;
        else if (match.ball.aftertouch > 0) this.phase!.innerHTML = '<b>EFECTO</b> · ← / →: CURVA · ATRÁS: ELEVAR · ADELANTE: RASO';
        this.banner!.className = 'center-banner';
        if (paused) {
            this.banner!.classList.add('shown', 'pause-banner');
            this.banner!.innerHTML = '<small>TIEMPO MUERTO</small><h2>PAUSA</h2><p><kbd>P</kbd> CONTINUAR &nbsp; <kbd>ESC</kbd> VOLVER AL MENÚ</p>';
        } else if (match.phase === 'goal') {
            this.banner!.classList.add('shown');
            this.banner!.innerHTML = `<small>${TEAMS[match.scorer].name}</small><h2>¡GOOOL!</h2><p>${match.score[0]} — ${match.score[1]}</p>`;
        } else if (match.phase === 'halftime') {
            this.banner!.classList.add('shown');
            this.banner!.innerHTML = '<small>45 MINUTOS</small><h2>DESCANSO</h2><p>CAMBIO DE CAMPO · PREPÁRATE PARA LA SEGUNDA PARTE</p>';
        }
        this.drawRadar(match);
    }
    private drawRadar(match: Match) {
        const c = this.radar!;
        c.clearRect(0, 0, 184, 272);
        const x = (v: number) => 9 + (v - FIELD.left) / FIELD.width * 166;
        const y = (v: number) => 6 + (v - FIELD.top) / FIELD.height * 260;
        c.strokeStyle = '#b7d3ba55'; c.lineWidth = 1;
        c.strokeRect(9, 6, 166, 260); c.beginPath(); c.moveTo(9, 136); c.lineTo(175, 136); c.stroke();
        c.beginPath(); c.arc(92, 136, 22, 0, Math.PI * 2); c.stroke();
        for (const top of [true, false]) c.strokeRect(48, top ? 6 : 224, 89, 42);
        for (const p of match.players) {
            c.fillStyle = p.keeper ? '#e7cb7c' : p.team === 0 ? '#63d4ec' : '#ff8067';
            const size = p.id === match.controlled ? 6 : 4;
            if (p.id === match.controlled) { c.strokeStyle = '#ffffff'; c.strokeRect(x(p.x) - 5, y(p.y) - 5, 10, 10); }
            c.fillRect(x(p.x) - size / 2, y(p.y) - size / 2, size, size);
        }
        c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x(match.ball.x), y(match.ball.y), 2.7, 0, Math.PI * 2); c.fill();
    }
    result(score: [number, number], stats: Stats) {
        this.root.className = 'interface result-screen';
        this.root.innerHTML = `<div class="edition"><i></i> SOCCERPASIÓN · PARTIDO AMISTOSO</div>
            <div class="result-content"><div class="eyebrow">90 MINUTOS · FINAL DEL PARTIDO</div>
            <h2>${score[0] > score[1] ? 'LA VICTORIA ES TUYA.' : score[0] < score[1] ? 'ESTO NO ACABA AQUÍ.' : 'TABLAS EN LA PASIÓN.'}</h2>
            <div class="result-score"><div><div class="crest passion">P</div><h3>ATLÉTICO PASIÓN</h3></div><strong>${score[0]} <em>–</em> ${score[1]}</strong><div><div class="crest brasa">B</div><h3>DEPORTIVO BRASA</h3></div></div>
            <div class="stat-row"><b>${stats.shots[0]}</b><span>DISPAROS</span><b>${stats.shots[1]}</b></div>
            <div class="stat-row"><b>${stats.passes[0]}</b><span>PASES INTENTADOS</span><b>${stats.passes[1]}</b></div>
            <div class="stat-row"><b>${stats.saves[0]}</b><span>PARADAS</span><b>${stats.saves[1]}</b></div>
            <div class="result-actions"><span><kbd>INTRO / R</kbd> REVANCHA</span><span><kbd>ESC</kbd> MENÚ PRINCIPAL</span></div></div>`;
    }
}
