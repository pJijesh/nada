import { BOL, type TaalDef, type Tradition } from './content';

export type Instrument = 'harmonium' | 'violin' | 'sine';
export type DroneTune = 'P' | 'M' | 'N';

/** All Web Audio synthesis for Sur: tanpura, harmonium / violin, tabla and the tala keeper. */
export class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private droneGain!: GainNode;
  private noise!: AudioBuffer;
  private voices: (OscillatorNode | AudioBufferSourceNode)[] = [];
  private tanBufs: AudioBuffer[] = [];
  private droneTimer: ReturnType<typeof setInterval> | null = null;
  private nextPluck = 0;
  private pluckIdx = 0;
  private droneVol = 0.55;
  droneOn = false;
  /** Called a little before each string is heard, so the picture can match. */
  onPluck: ((string: number, delayMs: number) => void) | null = null;

  ensure(): boolean {
    if (typeof window === 'undefined') return false;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return false;
      const ctx = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor();
      this.master.connect(comp);
      comp.connect(ctx.destination);
      this.droneGain = ctx.createGain();
      this.droneGain.gain.value = this.droneVol;
      this.droneGain.connect(this.master);
      const len = Math.floor(ctx.sampleRate * 0.25);
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      let seed = 99;
      for (let i = 0; i < len; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; d[i] = seed / 2147483648 - 1; }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return true;
  }

  get now(): number { return this.ctx ? this.ctx.currentTime : 0; }
  get sampleRate(): number { return this.ctx ? this.ctx.sampleRate : 44100; }
  get destination(): AudioNode { return this.master; }

  private osc(type: OscillatorType, freq: number, detune: number, dest: AudioNode, gain: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type; o.frequency.value = freq; o.detune.value = detune;
    const g = ctx.createGain(); g.gain.value = gain;
    o.connect(g); g.connect(dest);
    return o;
  }

  playNote(freq: number, t: number, dur: number, vol: number, inst: Instrument) {
    const ctx = this.ctx!;
    const out = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.connect(out); out.connect(this.master);
    const nodes: OscillatorNode[] = [];
    let atk = 0.04, rel = 0.07;
    if (inst === 'harmonium') {
      lp.frequency.value = 2300; lp.Q.value = 0.7;
      nodes.push(this.osc('sawtooth', freq, -5, lp, 0.3), this.osc('sawtooth', freq, 5, lp, 0.3), this.osc('square', freq / 2, 0, lp, 0.16));
    } else if (inst === 'violin') {
      lp.frequency.value = 3100; lp.Q.value = 0.9; atk = 0.08; rel = 0.1;
      const a = this.osc('sawtooth', freq, 0, lp, 0.42), b = this.osc('sawtooth', freq, 7, lp, 0.18);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 5.3;
      const lg = ctx.createGain();
      lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(9, t + Math.min(0.35, dur * 0.5));
      lfo.connect(lg); lg.connect(a.detune); lg.connect(b.detune);
      nodes.push(a, b, lfo);
    } else {
      lp.frequency.value = 6000; lp.Q.value = 0.5;
      nodes.push(this.osc('sine', freq, 0, lp, 0.5));
    }
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(vol, t + atk);
    out.gain.setValueAtTime(vol, Math.max(t + atk, t + dur - rel));
    out.gain.linearRampToValueAtTime(0, t + dur + rel);
    nodes.forEach((n) => { n.start(t); n.stop(t + dur + rel + 0.05); this.voices.push(n); });
  }

  stopVoices() {
    this.voices.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } });
    this.voices = [];
  }

  /** Play a mono buffer (a demo singer) through the master bus. Returns the source so it can be stopped. */
  playSamples(samples: Float32Array, sr: number, when: number): AudioBufferSourceNode {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, samples.length, sr);
    buf.getChannelData(0).set(samples);
    const g = ctx.createGain(); g.gain.value = 0.9; g.connect(this.master);
    const src = ctx.createBufferSource();
    src.buffer = buf; src.connect(g); src.start(when);
    this.voices.push(src);
    return src;
  }

  /* ---- tanpura: Karplus-Strong strings rendered once per Sa and tuning ---- */
  private ks(freq: number, sr: number, secs: number, seed: number): Float32Array {
    const N = Math.max(2, Math.round(sr / freq - 0.5));
    const len = Math.floor(sr * secs);
    const out = new Float32Array(len);
    const buf = new Float32Array(N);
    let r = seed;
    for (let i = 0; i < N; i++) { r = (r * 1664525 + 1013904223) >>> 0; buf[i] = r / 2147483648 - 1; }
    let prev = 0;
    for (let i = 0; i < N; i++) { prev = 0.55 * prev + 0.45 * buf[i]; buf[i] = prev; }
    let idx = 0;
    const decay = 0.9968;
    for (let i = 0; i < len; i++) {
      const nx = idx + 1 === N ? 0 : idx + 1;
      const v = (buf[idx] + buf[nx]) * 0.5 * decay;
      out[i] = buf[idx]; buf[idx] = v; idx = nx;
    }
    let peak = 0;
    for (let i = 0; i < len; i++) { out[i] = Math.tanh(out[i] * 2.4); if (Math.abs(out[i]) > peak) peak = Math.abs(out[i]); }
    const fade = Math.floor(sr * 0.4);
    for (let i = 0; i < len; i++) {
      const f = i > len - fade ? (len - i) / fade : 1;
      out[i] = (out[i] / (peak || 1)) * 0.7 * f;
    }
    return out;
  }

  private buildTanpura(saHz: number, tune: DroneTune) {
    const ctx = this.ctx!;
    const first = { P: 0.75, M: 2 / 3, N: 15 / 16 }[tune] * saHz;
    this.tanBufs = [first, saHz, saHz, saHz / 2].map((hz, i) => {
      const data = this.ks(hz, ctx.sampleRate, 5.2, 7 + i * 31);
      const b = ctx.createBuffer(1, data.length, ctx.sampleRate);
      b.getChannelData(0).set(data);
      return b;
    });
  }

  private schedulePlucks() {
    const ctx = this.ctx;
    if (!this.droneOn || !ctx) return;
    while (this.nextPluck < ctx.currentTime + 0.5) {
      const i = this.pluckIdx % 4;
      const src = ctx.createBufferSource();
      src.buffer = this.tanBufs[i];
      const g = ctx.createGain(); g.gain.value = i === 3 ? 0.9 : 0.8;
      src.connect(g); g.connect(this.droneGain);
      const when = Math.max(this.nextPluck, ctx.currentTime + 0.02);
      src.start(when);
      this.onPluck?.(i, (when - ctx.currentTime) * 1000);
      this.pluckIdx++;
      this.nextPluck = when + 1.05;
    }
  }

  startDrone(saHz: number, tune: DroneTune, vol: number) {
    if (!this.ensure()) return false;
    const ctx = this.ctx!;
    this.buildTanpura(saHz, tune);
    this.droneOn = true; this.droneVol = vol;
    this.pluckIdx = 0; this.nextPluck = ctx.currentTime + 0.05;
    this.droneGain.gain.cancelScheduledValues(ctx.currentTime);
    this.droneGain.gain.setValueAtTime(vol, ctx.currentTime);
    this.schedulePlucks();
    if (this.droneTimer) clearInterval(this.droneTimer);
    this.droneTimer = setInterval(() => this.schedulePlucks(), 120);
    return true;
  }

  stopDrone() {
    this.droneOn = false;
    if (this.droneTimer) clearInterval(this.droneTimer);
    this.droneTimer = null;
    if (this.ctx) {
      this.droneGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.droneGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
    }
  }

  setDroneVolume(v: number) {
    this.droneVol = v;
    if (this.ctx && this.droneOn) this.droneGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  /* ---- rhythm ---- */
  private hitNoise(t: number, freq: number, q: number, dur: number, vol: number) {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource(); s.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t); s.stop(t + dur + 0.02);
    this.voices.push(s);
  }

  private tone(t: number, f0: number, f1: number | null, dur: number, vol: number, type: OscillatorType = 'sine') {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + Math.min(0.14, dur));
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
    this.voices.push(o);
  }

  private dayanFreq(saHz: number) {
    let f = saHz;
    while (f < 150) f *= 2;
    while (f > 300) f /= 2;
    return f;
  }

  tablaHit(bol: string, t: number, saHz: number) {
    const def = BOL[bol] || {};
    if (def.b) { this.tone(t, 150, 78, 0.42, 0.7); this.hitNoise(t, 220, 1.2, 0.05, 0.25); }
    if (def.d) {
      const f = this.dayanFreq(saHz);
      const dec = def.d === 'open' ? 0.5 : def.d === 'ring' ? 0.34 : 0.13;
      const amps = def.d === 'tap' ? [0.35, 0.2, 0.1] : [0.5, 0.28, 0.14];
      [1, 2, 3].forEach((m, i) => this.tone(t, f * m, f * m, dec * (i ? 0.7 : 1), amps[i]));
      this.hitNoise(t, 3200, 1.5, 0.018, def.d === 'tap' ? 0.4 : 0.22);
    }
  }

  talaHit(act: string, t: number) {
    if (act === 'clap') this.hitNoise(t, 1700, 0.9, 0.08, 0.8);
    else if (act === 'finger') { this.tone(t, 950, 950, 0.04, 0.22, 'triangle'); this.hitNoise(t, 2600, 2, 0.02, 0.1); }
    else this.tone(t, 520, 520, 0.05, 0.12, 'triangle');
  }

  scheduleRhythm(trad: Tradition, taal: TaalDef, t0: number, count: number, beat: number, saHz: number) {
    for (let j = 0; j < count; j++) {
      const t = t0 + j * beat;
      const k = j % taal.beats;
      if (trad === 'hindustani') this.tablaHit(taal.bols![k], t, saHz);
      else this.talaHit(taal.acts![k], t);
    }
  }
}
