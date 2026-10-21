import E from './engine';
import type { AudioEngine } from './audio';

export interface MicSession { stop: () => void }

export function micAvailable(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

/**
 * Opens the microphone and calls onFrame about every 20 ms with the detected pitch.
 * `origin` is the audio-clock time that frame time 0 refers to (default: when the mic opened).
 */
export async function startMic(
  audio: AudioEngine,
  onFrame: (frame: { t: number; f: number; rms: number }) => void,
  origin?: () => number
): Promise<MicSession> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  const ctx = audio.ctx!;
  const src = ctx.createMediaStreamSource(stream);
  const an = ctx.createAnalyser();
  an.fftSize = 2048;
  src.connect(an);
  const buf = new Float32Array(2048);
  const t0 = ctx.currentTime;
  const timer = setInterval(() => {
    an.getFloatTimeDomainData(buf);
    const r = E.trackFrame(buf, ctx.sampleRate);
    const o = origin ? origin() : t0;
    onFrame({ t: ctx.currentTime - o, f: r.f, rms: r.rms });
  }, 20);
  return {
    stop() {
      clearInterval(timer);
      try { src.disconnect(); } catch { /* ignore */ }
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}

/** Decode an uploaded audio file to mono samples (first `maxSecs` seconds). */
export async function decodeFile(audio: AudioEngine, file: File, maxSecs: number) {
  const ab = await file.arrayBuffer();
  const decoded: AudioBuffer = await new Promise((ok, no) => audio.ctx!.decodeAudioData(ab, ok, no));
  const ch = decoded.getChannelData(0).subarray(0, Math.floor(decoded.sampleRate * maxSecs));
  return { samples: ch, sr: decoded.sampleRate };
}

export function noteName(hz: number): string {
  const names = E.NOTE_NAMES;
  return names[((Math.round(69 + (12 * Math.log(hz / 440)) / Math.LN2) % 12) + 12) % 12];
}
