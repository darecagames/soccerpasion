// Sonidos originales sintetizados localmente; sin archivos ni servicios externos.
export class MatchAudio {
    private ctx?: AudioContext;
    enabled = true;
    unlock() { this.ctx ??= new AudioContext(); void this.ctx.resume(); }
    play(type: 'kick' | 'tackle' | 'save' | 'goal' | 'whistle') {
        if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
        const ctx = this.ctx, time = ctx.currentTime;
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        const duration = type === 'whistle' ? .24 : type === 'goal' ? .6 : .075;
        osc.type = type === 'whistle' ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(type === 'whistle' ? 1800 : type === 'goal' ? 440 : 140, time);
        osc.frequency.exponentialRampToValueAtTime(type === 'goal' ? 880 : type === 'whistle' ? 1600 : 42, time + duration);
        gain.gain.setValueAtTime(type === 'whistle' ? .045 : .07, time);
        gain.gain.exponentialRampToValueAtTime(.001, time + duration);
        osc.start(time); osc.stop(time + duration);
    }
    destroy() { void this.ctx?.close(); }
}
