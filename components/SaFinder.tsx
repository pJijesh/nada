'use client';

import { useEffect, useRef, useState } from 'react';
import E, { type Frame, type SaPick, type SaSuggestion } from '@/lib/engine';
import type { AudioEngine } from '@/lib/audio';
import { decodeFile, micAvailable, noteName, startMic, type MicSession } from '@/lib/mic';

const LISTEN_SECS = 10;

function label(p: SaPick) { return E.NOTE_NAMES[p.note] + p.oct; }

export default function SaFinder({ audio, disabled, onBusy, onUse }: {
  audio: AudioEngine;
  disabled: boolean;
  onBusy: (busy: boolean) => void;
  onUse: (p: SaPick) => void;
}) {
  const [status, setStatus] = useState('');
  const [warn, setWarn] = useState(false);
  const [result, setResult] = useState<SaSuggestion | null>(null);
  const [running, setRunning] = useState(false);
  const mic = useRef<MicSession | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const src = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => () => {
    mic.current?.stop();
    if (timer.current) clearTimeout(timer.current);
    try { src.current?.stop(); } catch { /* ignore */ }
  }, []);

  const say = (m: string, w = false) => { setStatus(m); setWarn(w); };
  const finish = (frames: Frame[]) => {
    setRunning(false); onBusy(false);
    const r = E.suggestSa(frames);
    setResult(r);
    if (!r.ok) {
      say(r.reason === 'narrow'
        ? `The range was too narrow (${Math.round(r.span ?? 0)} semitones). Sing a clear slide from your lowest note to your highest.`
        : 'Not enough singing was heard. Sing for a few seconds, from low to high.', true);
    } else {
      say(`Your range sounded like ${noteName(r.lowHz!)} to ${noteName(r.highHz!)}, about ${Math.round(r.span!)} semitones.`);
    }
  };
  const fromSamples = (samples: Float32Array, sr: number) => finish(E.trackPitch(samples, sr));

  const sing = async () => {
    setResult(null);
    if (!micAvailable()) { say('The microphone is not available in this browser. Use Demo voice or Upload recording.', true); return; }
    if (!audio.ensure()) { say('This browser has no Web Audio.', true); return; }
    audio.stopDrone();
    setRunning(true); onBusy(true);
    say('Allow the microphone, then sing from your lowest comfortable note up to your highest.');
    const frames: Frame[] = [];
    try {
      mic.current = await startMic(audio, (fr) => {
        frames.push(fr);
        const left = Math.ceil(LISTEN_SECS - fr.t);
        if (fr.t >= LISTEN_SECS) {
          mic.current?.stop(); mic.current = null; finish(frames); return;
        }
        say((fr.f ? `Hearing ${noteName(fr.f)}. ` : 'Listening. ') + `${left} seconds left. Low note, slide up, high note.`);
      });
    } catch {
      setRunning(false); onBusy(false);
      say('The microphone is blocked. Allow it in the browser, or use Demo voice or Upload recording.', true);
    }
  };

  const demo = () => {
    setResult(null);
    if (!audio.ensure()) { say('This browser has no Web Audio.', true); return; }
    const d = E.demoRange(123.47, 370.0, 22050);
    src.current = audio.playSamples(d.samples, d.sr, audio.now);
    setRunning(true); onBusy(true);
    say('A practice voice sings from a low note up to a high one.');
    timer.current = setTimeout(() => fromSamples(d.samples, d.sr), (d.samples.length / d.sr) * 1000 + 200);
  };

  const upload = async (file?: File) => {
    if (!file) return;
    setResult(null);
    if (!audio.ensure()) { say('This browser cannot decode audio.', true); return; }
    say('Reading the recording…');
    try {
      const { samples, sr } = await decodeFile(audio, file, 40);
      fromSamples(samples, sr);
    } catch {
      say('That file could not be read as audio. Try an MP3, M4A or WAV recording.', true);
    }
  };

  const cancel = () => {
    mic.current?.stop(); mic.current = null;
    if (timer.current) clearTimeout(timer.current);
    try { src.current?.stop(); } catch { /* ignore */ }
    setRunning(false); onBusy(false); say('Stopped.');
  };

  const busy = disabled || running;
  return (
    <section className="card" id="find-sa" aria-labelledby="saFindTitle">
      <h3 id="saFindTitle">Find my Sa</h3>
      <p className="sub" style={{ margin: '0 0 12px' }}>
        Sing from your lowest comfortable note up to your highest, with a slide in between.
        The Sa it suggests puts your range around the middle octave.
      </p>
      <div className="actions" style={{ marginTop: 0 }}>
        <button className="btn" style={{ padding: '7px 14px' }} disabled={busy} onClick={sing}>Sing low to high</button>
        <button className="btn quiet" style={{ padding: '7px 14px' }} disabled={busy} onClick={demo}>Demo voice</button>
        <span className="btn quiet fileBtn" style={{ padding: '7px 14px', opacity: busy ? 0.45 : 1 }}>
          Upload recording
          <input type="file" accept="audio/*" disabled={busy} aria-label="Upload a recording of your range"
            onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ''; }} />
        </span>
        {running && <button className="btn quiet" style={{ padding: '7px 14px' }} onClick={cancel}>Stop</button>}
      </div>
      <p className={'status' + (warn ? ' warn' : '')} role="status" aria-live="polite" style={{ marginTop: 10 }}>{status}</p>
      {result?.ok && result.best && result.alts && (
        <div>
          <p className="summary" style={{ marginTop: 10 }}>
            Suggested Sa: <strong>{label(result.best)}</strong> · {result.best.hz.toFixed(1)} Hz
          </p>
          <div className="row">
            <button className="btn primary" style={{ padding: '6px 14px' }} onClick={() => onUse(result.best!)}>Use {label(result.best)}</button>
            {result.alts.map((a) => (
              <button key={label(a)} className="btn quiet" style={{ padding: '6px 14px' }} onClick={() => onUse(a)}>Try {label(a)}</button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
