import type { Vec } from './math';
import type { TeamId } from './Player';
export interface Controls {
    move: Vec; pressed: boolean; released: boolean; held: boolean; switchPlayer: boolean;
}
export const emptyControls = (): Controls => ({ move: { x: 0, y: 0 }, pressed: false,
    released: false, held: false, switchPlayer: false });
export type Phase = 'restart' | 'playing' | 'goal' | 'halftime' | 'finished';
export type RestartKind = 'kickoff' | 'throw' | 'corner' | 'goalkick';
export interface Restart { kind: RestartKind; team: TeamId; x: number; y: number; taker: number; }
export interface MatchEvent { type: 'kick' | 'tackle' | 'save' | 'goal' | 'whistle'; }
export interface Stats { shots: [number, number]; passes: [number, number]; saves: [number, number]; }
