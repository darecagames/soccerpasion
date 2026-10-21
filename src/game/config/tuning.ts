// Unidades de simulación: píxeles del mundo y segundos. Ajustar aquí las sensaciones.
export const FIELD = {
    left: 180, right: 1260, top: 220, bottom: 1960,
    width: 1080, height: 1740, cx: 720, cy: 1090,
    goalWidth: 230, goalHeight: 62, goalDepth: 64,
    boxWidth: 580, boxDepth: 280, worldWidth: 1440, worldHeight: 2180,
};

export const TUNING = {
    step: 1 / 120,
    halfSeconds: 120, // Dos tiempos de dos minutos reales; reloj de 0 a 90.
    player: { speed: 200, acceleration: 1850, deceleration: 2200, radius: 14,
        ballControl: 0.95, // Escala propia 0–1; mismo control alto para los 22 futbolistas.
        slideSpeed: 335, slideDuration: 0.34, recovery: 0.4, slideCooldown: 1.15 },
    ball: { radius: 7, gravity: 690, bounce: 0.48, grassDrag: 160, airDrag: 0.18,
        controlDistance: 42, touchInterval: 0.12, touchSpeed: 295, dribblePushScale: 0.7,
        passSpeed: 620, shotMin: 710, shotMax: 1100,
        passAimHalfAngle: Math.PI / 8, // Asistencia dentro del sector de dirección elegido.
        chargeMax: 0.72, tapThreshold: 0.19, aftertouchWindow: 0.3, curve: 3.2 },
    ai: { decisionInterval: 0.15, pressureRadius: 200, keeperSpeed: 160, keeperDiveSpeed: 350,
        shotDistance: 470, reaction: 0.25 },
    camera: { zoom: 1.23, smoothing: 4.2, lookAhead: 0.19 },
    selection: { defenseRadius: 70, defenseReleaseDistance: 140,
        defenseAdvantage: 90, defenseLock: 1 },
};

export const TEAMS = [
    { name: 'ATLÉTICO PASIÓN', short: 'PAS', color: 0x46d6ee, dark: 0x113653,
        shirt: '#51d5ed', shorts: '#e9f1e7', socks: '#154865', keeper: '#f8ce55' },
    { name: 'DEPORTIVO BRASA', short: 'BRA', color: 0xff7159, dark: 0x702c42,
        shirt: '#f16b54', shorts: '#28324e', socks: '#f3dfbf', keeper: '#bf99ee' },
] as const;
