export interface Vec { x: number; y: number }
export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export const length = (v: Vec) => Math.hypot(v.x, v.y);
export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export const normal = (v: Vec): Vec => {
    const n = length(v); return n > 0.001 ? { x: v.x / n, y: v.y / n } : { x: 0, y: 0 };
};
export const toward = (a: Vec, b: Vec) => normal({ x: b.x - a.x, y: b.y - a.y });
export const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y;
export const approach = (from: number, to: number, amount: number) => from + clamp(to - from, -amount, amount);
export function segmentDistance(p: Vec, a: Vec, b: Vec) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    return distance(p, { x: a.x + dx * t, y: a.y + dy * t });
}
