export type Tuning = 'just' | 'equal';
export interface Token { d: number; o: number }
export interface Frame { t: number; f: number; rms: number }
export interface NoteResult { target: number; verdict: 'in' | 'low' | 'high' | 'missed'; cents: number | null; sung: number | null }
export interface ScoreResult { t0: number | null; notes: NoteResult[]; inTuneCount: number }
export interface SaPick { note: number; oct: number; hz: number }
export interface SaSuggestion {
  ok: boolean; reason?: 'too-short' | 'narrow'; span?: number; voicedSecs?: number;
  lowHz?: number; highHz?: number; best?: SaPick; alts?: SaPick[];
}
export interface Engine {
  NOTE_NAMES: string[];
  SCALES: { hindustani: Record<string, number[]>; carnatic: Record<string, number[]> };
  saFreq(noteIndex: number, octave: number): number;
  noteFreq(tok: Token, saHz: number, semis: number[], tuning: Tuning): number;
  parseLine(s: string): Token[];
  variantLabel(tradition: string, degIndex: number, semi: number): string;
  trackFrame(buf: Float32Array, sr: number): { f: number; rms: number };
  trackPitch(samples: Float32Array, sr: number): Frame[];
  scoreLine(frames: Frame[], expectedHz: number[], beat: number, opts?: { inTune?: number; minVoiced?: number; t0?: number }): ScoreResult;
  nearestScaleNote(freq: number, saHz: number, semis: number[], tuning: Tuning): { deg: number; hz: number; cents: number };
  demoAttempt(expectedHz: number[], beat: number, sr?: number, lead?: number): { samples: Float32Array; sr: number; lead: number };
  demoRange(lowHz: number, highHz: number, sr?: number): { samples: Float32Array; sr: number };
  suggestSa(frames: Frame[]): SaSuggestion;
}
declare const engine: Engine;
export default engine;
