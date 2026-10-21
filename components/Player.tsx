'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import E, { type NoteResult, type SaPick, type Token, type Tuning } from '@/lib/engine';
import { AudioEngine, type DroneTune, type Instrument } from '@/lib/audio';
import { decodeFile, micAvailable, startMic, type MicSession } from '@/lib/mic';
import {
  DEFAULTS, DEGREE_LETTERS, MELA_NO, SYL, TAALS,
  type Lesson, type Script, type Tradition,
} from '@/lib/content';
import { BeatRing, PitchGauge, SwaraWheel, TanpuraSvg } from './graphics';
import SaFinder from './SaFinder';

export interface AttemptInput {
  lesson_id: string;
  drill: boolean;
  source: 'mic' | 'upload';
  sa_note: number;
  sa_oct: number;
  scale: string;
  tuning: Tuning;
  bpm: number;
  taal: string;
  in_tune: number;
  total: number;
  notes: { verdict: NoteResult['verdict']; cents: number | null }[];
}

interface Props {
  lessons: Lesson[];
  assignedIds: string[];
  signedIn: boolean;
  initialLessonId?: string | null;
  saveAttempt?: (a: AttemptInput) => Promise<{ ok: boolean; error?: string }>;
}

type Phase = 'idle' | 'hear' | 'sing';
interface Scored { notes: NoteResult[]; inTuneCount: number }
interface Override { name: string; tokens: Token[] }

const VERDICT_MARK = { in: '✓', low: '↓', high: '↑', missed: '–' } as const;
const VERDICT_TEXT = { in: 'In tune', low: 'Low', high: 'High', missed: 'Missed' } as const;

export default function Player({ lessons, assignedIds, signedIn, initialLessonId, saveAttempt }: Props) {
  const [audio] = useState(() => new AudioEngine());

  const initial = lessons.find((l) => l.id === initialLessonId);
  const [trad, setTrad] = useState<Tradition>(initial?.tradition ?? 'hindustani');
  const [lineId, setLineId] = useState<string>(initial?.id ?? lessons.find((l) => l.tradition === (initial?.tradition ?? 'hindustani'))?.id ?? '');
  const [saNote, setSaNote] = useState(2);
  const [saOct, setSaOct] = useState(3);
  const [scale, setScale] = useState(DEFAULTS[trad].scale);
  const [tuning, setTuning] = useState<Tuning>('just');
  const [script, setScript] = useState<Script>('latin');
  const [inst, setInst] = useState<Instrument>(DEFAULTS[trad].inst);
  const [taal, setTaal] = useState(DEFAULTS[trad].taal);
  const [bpm, setBpm] = useState(60);
  const [beatOn, setBeatOn] = useState(true);
  const [keepOn, setKeepOn] = useState(false);
  const [droneOn, setDroneOn] = useState(false);
  const [droneTune, setDroneTune] = useState<DroneTune>('P');
  const [droneVol, setDroneVol] = useState(55);
  const [override, setOverride] = useState<Override | null>(null);
  const [results, setResults] = useState<Scored | null>(null);
  const [saveMsg, setSaveMsg] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [saBusy, setSaBusy] = useState(false);
  const [status, setStatus] = useState('Press Hear the line. The drone starts first and the line plays in your Sa.');
  const [warn, setWarn] = useState(false);
  const [activeChip, setActiveChip] = useState<number | null>(null);
  const [activeBeat, setActiveBeat] = useState<number | null>(null);
  const [gauge, setGauge] = useState<{ syl: string; cents: number } | null>(null);
  const [plucks, setPlucks] = useState([0, 0, 0, 0]);

  /* ---------- derived ---------- */
  const tradLessons = useMemo(() => lessons.filter((l) => l.tradition === trad), [lessons, trad]);
  const line = tradLessons.find((l) => l.id === lineId) ?? tradLessons[0];
  const scaleName = line?.scale ?? scale;
  const semis = E.SCALES[trad][scaleName] ?? E.SCALES[trad][DEFAULTS[trad].scale];
  const saHz = E.saFreq(saNote, saOct);
  const beat = 60 / bpm;
  const taalDef = TAALS[trad][taal] ?? Object.values(TAALS[trad])[0];
  const tokens = useMemo(() => override?.tokens ?? (line ? E.parseLine(line.notes) : []), [override, line]);
  const freqs = useMemo(() => tokens.map((k) => E.noteFreq(k, saHz, semis, tuning)), [tokens, saHz, semis, tuning]);

  const live = useRef({ trad, saHz, semis, tuning, beat, taalDef, tokens, freqs, inst, beatOn, keepOn, droneTune, droneVol, bpm, taal, saNote, saOct, scaleName, line, override });
  live.current = { trad, saHz, semis, tuning, beat, taalDef, tokens, freqs, inst, beatOn, keepOn, droneTune, droneVol, bpm, taal, saNote, saOct, scaleName, line, override };

  const say = useCallback((m: string, w = false) => { setStatus(m); setWarn(w); }, []);

  /* ---------- helpers ---------- */
  const syllable = (k: Token) => ({
    syl: SYL[trad][script][k.d],
    lab: E.variantLabel(trad, k.d, semis[k.d]),
  });
  const noteLabel = (k: Token) => { const x = syllable(k); return x.syl + (x.lab ? ' ' + x.lab : ''); };

  /* ---------- timers and cleanup ---------- */
  const raf = useRef(0);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mic = useRef<MicSession | null>(null);
  const runId = useRef(0);
  const later = (fn: () => void, ms: number) => { timeouts.current.push(setTimeout(fn, ms)); };

  const stopAll = useCallback((message?: string) => {
    runId.current++;
    cancelAnimationFrame(raf.current);
    timeouts.current.forEach(clearTimeout); timeouts.current = [];
    mic.current?.stop(); mic.current = null;
    audio.stopVoices();
    setActiveChip(null); setActiveBeat(null); setGauge(null);
    setPhase('idle');
    if (message) say(message);
  }, [audio, say]);

  useEffect(() => {
    audio.onPluck = (i, delay) => {
      timeouts.current.push(setTimeout(() => setPlucks((p) => p.map((n, k) => (k === i ? n + 1 : n))), Math.max(0, delay)));
    };
    return () => {
      runId.current++;
      cancelAnimationFrame(raf.current);
      timeouts.current.forEach(clearTimeout);
      mic.current?.stop();
      audio.onPluck = null;
      audio.stopVoices();
      audio.stopDrone();
    };
  }, [audio]);

  /* ---------- remembered preferences ---------- */
  const loaded = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('sur:prefs');
      if (raw && !initial) {
        const p = JSON.parse(raw);
        if (p.trad === 'hindustani' || p.trad === 'carnatic') {
          setTrad(p.trad);
          setScale(DEFAULTS[p.trad as Tradition].scale);
          setTaal(DEFAULTS[p.trad as Tradition].taal);
          setInst(DEFAULTS[p.trad as Tradition].inst);
          setLineId(lessons.find((l) => l.tradition === p.trad)?.id ?? '');
        }
      }
      if (raw) {
        const p = JSON.parse(raw);
        if (Number.isInteger(p.saNote) && p.saNote >= 0 && p.saNote < 12) setSaNote(p.saNote);
        if ([2, 3, 4].includes(p.saOct)) setSaOct(p.saOct);
        if (p.tuning === 'just' || p.tuning === 'equal') setTuning(p.tuning);
        if (p.script === 'latin' || p.script === 'deva') setScript(p.script);
      }
    } catch { /* storage unavailable */ }
    loaded.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try { localStorage.setItem('sur:prefs', JSON.stringify({ trad, saNote, saOct, tuning, script })); } catch { /* ignore */ }
  }, [trad, saNote, saOct, tuning, script]);

  /* ---------- drone ---------- */
  const startDrone = useCallback(() => {
    const c = live.current;
    if (!audio.startDrone(c.saHz, c.droneTune, c.droneVol / 100)) { say('This browser has no Web Audio, so no sound can play.', true); return false; }
    setDroneOn(true);
    return true;
  }, [audio, say]);
  const stopDrone = useCallback(() => { audio.stopDrone(); setDroneOn(false); }, [audio]);

  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    if (!audio.droneOn) return;
    audio.stopDrone();
    const t = setTimeout(() => { audio.startDrone(live.current.saHz, live.current.droneTune, live.current.droneVol / 100); }, 260);
    return () => clearTimeout(t);
  }, [saNote, saOct, droneTune, audio]);

  /* ---------- visual follow ---------- */
  const runVisual = (t0: number, n: number, id: number, onDone: () => void) => {
    const nb = live.current.taalDef.beats;
    const b = live.current.beat;
    const loop = () => {
      if (runId.current !== id) return;
      const now = audio.now - t0;
      const idx = Math.floor(now / b);
      if (now < 0) { setActiveChip(null); setActiveBeat(null); }
      else if (idx < n) { setActiveChip(idx); setActiveBeat(idx % nb); }
      else { setActiveChip(null); setActiveBeat(null); onDone(); return; }
      raf.current = requestAnimationFrame(loop);
    };
    cancelAnimationFrame(raf.current);
    loop();
  };

  /* ---------- scoring and saving ---------- */
  const applyScore = async (res: { t0: number | null; notes: NoteResult[]; inTuneCount: number }, source: 'mic' | 'upload' | 'demo') => {
    if (res.t0 == null) {
      setResults(null); setSaveMsg('');
      say('No singing was heard. Check that the recording has a clear voice, then try again.', true);
      return;
    }
    setResults({ notes: res.notes, inTuneCount: res.inTuneCount });
    const label = source === 'mic' ? 'Scored from your microphone.' : source === 'upload' ? 'Scored your recording.' : 'Scored the demo singer.';
    say(`${label} ${res.inTuneCount} of ${res.notes.length} in tune.`);
    if (source === 'demo') { setSaveMsg('Demo attempts are not saved.'); return; }
    if (!signedIn) { setSaveMsg('Sign in to save your progress.'); return; }
    const c = live.current;
    if (!saveAttempt || !c.line) return;
    setSaveMsg('Saving…');
    const r = await saveAttempt({
      lesson_id: c.line.id, drill: !!c.override, source,
      sa_note: c.saNote, sa_oct: c.saOct, scale: c.scaleName, tuning: c.tuning, bpm: c.bpm, taal: c.taal,
      in_tune: res.inTuneCount, total: res.notes.length,
      notes: res.notes.map((n) => ({ verdict: n.verdict, cents: n.cents == null ? null : Math.round(n.cents) })),
    });
    setSaveMsg(r.ok ? 'Saved to your progress.' : `Could not save: ${r.error ?? 'unknown error'}`);
  };

  /* ---------- actions ---------- */
  const hear = () => {
    if (!audio.ensure()) { say('This browser has no Web Audio, so no sound can play.', true); return; }
    const c = live.current;
    stopAll();
    const id = runId.current;
    if (!audio.droneOn) startDrone();
    setResults(null); setSaveMsg('');
    const t0 = audio.now + 0.5;
    c.freqs.forEach((hz, i) => audio.playNote(hz, t0 + i * c.beat, c.beat * 0.93, 0.5, c.inst));
    if (c.beatOn) audio.scheduleRhythm(c.trad, c.taalDef, t0, c.freqs.length, c.beat, c.saHz);
    setPhase('hear'); say('Listen to the line. Next, sing it back.');
    runVisual(t0, c.freqs.length, id, () => { setPhase('idle'); say('Your turn. Sing it back with the microphone, upload a recording, or play the demo attempt.'); });
  };

  const sing = async () => {
    if (!micAvailable()) { say('The microphone is not available in this browser. Use Demo attempt or Upload recording.', true); return; }
    if (!audio.ensure()) { say('This browser has no Web Audio, so no sound can play.', true); return; }
    stopAll();
    const id = runId.current;
    const c = live.current;
    setPhase('sing'); setResults(null); setSaveMsg('');
    say('Allow the microphone, then sing along when the line lights up.');
    const frames: { t: number; f: number; rms: number }[] = [];
    let tGuide = 0, started = false, n = 0;
    try {
      mic.current = await startMic(audio, (fr) => {
        if (!started) return;
        frames.push(fr);
        if (++n % 3 === 0) {
          if (fr.f) {
            const nn = E.nearestScaleNote(fr.f, c.saHz, c.semis, c.tuning);
            setGauge({ syl: SYL[c.trad][script][nn.deg], cents: nn.cents });
          } else setGauge(null);
        }
      }, () => tGuide);
    } catch {
      if (runId.current === id) { setPhase('idle'); say('The microphone is blocked. Allow it in the browser, or use Demo attempt or Upload recording.', true); }
      return;
    }
    if (runId.current !== id) { mic.current?.stop(); mic.current = null; return; }
    const tStart = audio.now + 0.3;
    tGuide = tStart + 3 * c.beat;
    for (let i = 0; i < 3; i++) {
      if (c.trad === 'hindustani') audio.tablaHit('Na', tStart + i * c.beat, c.saHz); else audio.talaHit('clap', tStart + i * c.beat);
    }
    if (c.keepOn) {
      if (c.beatOn) audio.scheduleRhythm(c.trad, c.taalDef, tGuide, c.freqs.length, c.beat, c.saHz);
      if (!audio.droneOn) startDrone();
    } else if (audio.droneOn) stopDrone();
    started = true;
    say('Count in, then sing each swara as it lights up.');
    runVisual(tGuide, c.freqs.length, id, () => {
      say('Scoring…');
      later(() => {
        if (runId.current !== id) return;
        mic.current?.stop(); mic.current = null;
        setPhase('idle'); setGauge(null);
        void applyScore(E.scoreLine(frames, c.freqs, c.beat), 'mic');
      }, 900);
    });
  };

  const demoAttempt = () => {
    if (!audio.ensure()) { say('This browser has no Web Audio, so no sound can play.', true); return; }
    stopAll();
    const id = runId.current;
    const c = live.current;
    setResults(null); setSaveMsg('');
    const d = E.demoAttempt(c.freqs, c.beat, 22050, 0.6);
    const t0 = audio.now + 0.3;
    audio.playSamples(d.samples, d.sr, t0);
    if (!audio.droneOn) startDrone();
    setPhase('sing'); say('A practice singer is singing the line, with a flat, a sharp and a missed swara built in.');
    runVisual(t0 + d.lead, c.freqs.length, id, () => {
      say('Scoring…');
      later(() => {
        if (runId.current !== id) return;
        setPhase('idle');
        void applyScore(E.scoreLine(E.trackPitch(d.samples, d.sr), c.freqs, c.beat), 'demo');
      }, 500);
    });
  };

  const uploadFile = async (file?: File) => {
    if (!file) return;
    if (!audio.ensure()) { say('This browser cannot decode audio.', true); return; }
    const c = live.current;
    say('Reading the recording…'); setResults(null); setSaveMsg('');
    try {
      const { samples, sr } = await decodeFile(audio, file, c.freqs.length * c.beat + 12);
      await applyScore(E.scoreLine(E.trackPitch(samples, sr), c.freqs, c.beat), 'upload');
    } catch {
      say('That file could not be read as audio. Try an MP3, M4A or WAV recording.', true);
    }
  };

  const drill = () => {
    if (!results) return;
    const seen = new Set<string>();
    const picked: Token[] = [];
    results.notes.forEach((x, i) => {
      if (x.verdict === 'in') return;
      const k = tokens[i];
      const key = `${k.d}:${k.o}`;
      if (!seen.has(key)) { seen.add(key); picked.push(k); }
    });
    if (!picked.length) return;
    setOverride({ name: 'Drill: ' + picked.map(noteLabel).join(', '), tokens: picked });
    setResults(null); setSaveMsg('');
    say('A short line with only the swaras that slipped. Hear it, then sing it back.');
  };
  const backToFull = () => { setOverride(null); setResults(null); setSaveMsg(''); say('Back to the full line.'); };

  const changeTradition = (t: Tradition) => {
    stopAll();
    setTrad(t); setOverride(null); setResults(null); setSaveMsg('');
    setLineId(lessons.find((l) => l.tradition === t)?.id ?? '');
    setScale(DEFAULTS[t].scale); setTaal(DEFAULTS[t].taal); setInst(DEFAULTS[t].inst);
    say(`Press Hear the line. The ${t === 'hindustani' ? 'tanpura' : 'tambura'} starts first and the line plays in your Sa.`);
  };
  const resetResults = () => { setResults(null); setSaveMsg(''); };
  const useSa = (p: SaPick) => {
    setSaNote(p.note); setSaOct(p.oct); resetResults();
    say(`Sa is now ${E.NOTE_NAMES[p.note]}${p.oct} (${p.hz.toFixed(1)} Hz). Press Hear the line.`);
  };

  const busy = phase !== 'idle' || saBusy;
  const scaleLabel = trad === 'carnatic' && MELA_NO[scaleName] ? `${MELA_NO[scaleName]} ${scaleName}` : scaleName;
  const locked = !!line?.scale;
  const activeDeg = activeChip != null && tokens[activeChip] ? tokens[activeChip].d : -1;
  const assigned = tradLessons.filter((l) => assignedIds.includes(l.id));
  const groups = Array.from(new Set(tradLessons.map((l) => l.grp)));

  if (!line) return <p className="empty">No lessons are available yet.</p>;

  return (
    <div id="app" data-trad={trad}>
      <div className="tabs" role="tablist" aria-label="Tradition" style={{ marginBottom: 20 }}>
        {(['hindustani', 'carnatic'] as Tradition[]).map((t) => (
          <button key={t} role="tab" aria-selected={trad === t} onClick={() => changeTradition(t)}>
            {t === 'hindustani' ? 'Hindustani' : 'Carnatic'}
          </button>
        ))}
      </div>

      <div className="layout">
        <div className="col">
          <section className="card" aria-labelledby="lineTitle">
            <div className="stage">
              <div className="tanpura" aria-hidden="true"><TanpuraSvg plucks={plucks} /></div>
              <div className="titles">
                <h3>{trad === 'hindustani' ? 'Hindustani riyaz' : 'Carnatic riyaz'}</h3>
                <h2 id="lineTitle">{override ? override.name : line.name}</h2>
                <p className="sub">
                  {scaleLabel} · Sa {E.NOTE_NAMES[saNote]} · {saHz.toFixed(1)} Hz · {taalDef.name} · {bpm} beats a minute
                </p>
                <ol className="steps"><li>Hear the line</li><li>Sing it back</li><li>See which swaras slipped</li></ol>
              </div>
              <div className="wheel" aria-hidden="false">
                <SwaraWheel semis={semis} label={scaleName} letters={DEGREE_LETTERS} active={activeDeg}
                  sub={trad === 'carnatic' && MELA_NO[scaleName] ? `mela ${MELA_NO[scaleName]}` : 'Sa at the top'} />
              </div>
            </div>

            <div className="field" style={{ margin: '18px 0 0' }}>
              <label htmlFor="lineSel">Line to practise</label>
              <select id="lineSel" value={line.id} disabled={busy}
                onChange={(e) => { setLineId(e.target.value); setOverride(null); resetResults(); }}>
                {assigned.length > 0 && (
                  <optgroup label="Assigned to you">
                    {assigned.map((l) => <option key={'a' + l.id} value={l.id}>{l.name}</option>)}
                  </optgroup>
                )}
                {groups.map((g) => (
                  <optgroup key={g} label={g}>
                    {tradLessons.filter((l) => l.grp === g).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="chips" role="list" aria-label="Swaras in this line">
              {tokens.map((k, i) => {
                const r = results?.notes[i];
                const x = syllable(k);
                return (
                  <div key={i} role="listitem" className={'chip' + (activeChip === i ? ' active' : '') + (r ? ' r-' + r.verdict : '')}
                    aria-label={`${x.syl}${x.lab ? ' ' + x.lab : ''}${k.o ? (k.o > 0 ? ' upper octave' : ' lower octave') : ''}${r ? ', ' + VERDICT_TEXT[r.verdict].toLowerCase() : ''}`}>
                    <span className="up">{k.o > 0 ? '•' : ''}</span>
                    <span className={'sy' + (script === 'deva' ? ' deva' : '')}>{x.syl}</span>
                    <span className="lb">{x.lab}</span>
                    {k.o < 0 && <span className="lo">•</span>}
                    {r && <span className="mk" aria-hidden="true">{VERDICT_MARK[r.verdict]}</span>}
                  </div>
                );
              })}
            </div>

            <div className="actions">
              <button className="btn primary" disabled={busy} onClick={hear}>Hear the line</button>
              <button className="btn" disabled={busy} onClick={() => void sing()}>Sing it back</button>
              <button className="btn quiet" disabled={busy} onClick={demoAttempt}>Demo attempt</button>
              <span className="btn quiet fileBtn" style={{ opacity: busy ? 0.45 : 1 }}>
                Upload recording
                <input type="file" accept="audio/*" disabled={busy} aria-label="Upload a recording of your singing"
                  onChange={(e) => { void uploadFile(e.target.files?.[0]); e.target.value = ''; }} />
              </span>
              <button className="btn quiet" disabled={phase === 'idle'} onClick={() => stopAll('Stopped.')}>Stop</button>
            </div>
            <p className={'status' + (warn ? ' warn' : '')} role="status" aria-live="polite">{status}</p>

            <div className="gauge">
              <div className="read">
                <span>{gauge ? gauge.syl : phase === 'sing' ? 'Listening' : 'Mic off'}</span>
                <small>{gauge ? `${gauge.cents > 0 ? '+' : ''}${Math.round(gauge.cents)} cents` : ' '}</small>
              </div>
              <PitchGauge cents={gauge ? gauge.cents : null} />
            </div>
          </section>

          <section className="card" aria-labelledby="resTitle">
            <h3 id="resTitle">Listen</h3>
            {!results ? (
              <p className="empty">Scores appear here after you sing, upload a recording or play the demo attempt. Each swara is marked in tune, low, high or missed, within 30 cents.</p>
            ) : (
              <div>
                {(() => {
                  const slipped: string[] = [], missed: string[] = [];
                  results.notes.forEach((x, i) => {
                    if (x.verdict === 'low' || x.verdict === 'high')
                      slipped.push(`${noteLabel(tokens[i])} ${x.verdict === 'low' ? 'flat' : 'sharp'} ${Math.abs(Math.round(x.cents ?? 0))} cents`);
                    if (x.verdict === 'missed') missed.push(noteLabel(tokens[i]));
                  });
                  return (
                    <p className="summary">
                      <strong>{results.inTuneCount} of {results.notes.length}</strong> swaras in tune.
                      {slipped.length > 0 && ` Off pitch: ${slipped.join(', ')}.`}
                      {missed.length > 0 && ` Missed: ${missed.join(', ')}.`}
                      {results.inTuneCount === results.notes.length && ' A clean run.'}
                    </p>
                  );
                })()}
                <div className="tbl">
                  <table>
                    <thead><tr><th>#</th><th>Swara</th><th>Target</th><th>Sung</th><th>Cents</th><th>Result</th></tr></thead>
                    <tbody>
                      {results.notes.map((x, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td><td>{noteLabel(tokens[i])}</td><td>{x.target.toFixed(1)} Hz</td>
                          <td>{x.sung ? `${x.sung.toFixed(1)} Hz` : '–'}</td>
                          <td>{x.cents != null ? `${x.cents > 0 ? '+' : ''}${Math.round(x.cents)}` : '–'}</td>
                          <td className={'v-' + x.verdict}>{VERDICT_TEXT[x.verdict]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {saveMsg && (
              <p className="sub" style={{ marginTop: 10 }} role="status">
                {saveMsg}{!signedIn && saveMsg.startsWith('Sign in') && <> <Link href="/login?next=/practice">Sign in</Link></>}
              </p>
            )}
            {(override || (results && results.notes.some((n) => n.verdict !== 'in'))) && (
              <div className="actions">
                {results && results.notes.some((n) => n.verdict !== 'in') && <button className="btn" onClick={drill}>Drill the slips</button>}
                {override && <button className="btn quiet" onClick={backToFull}>Back to the full line</button>}
              </div>
            )}
          </section>
        </div>

        <aside className="col" aria-label="Setup">
          <section className="card">
            <h3>Sa and scale</h3>
            <div className="field">
              <span className="lab">Sa</span>
              <div className="row">
                <select aria-label="Sa note" value={saNote} onChange={(e) => { setSaNote(+e.target.value); resetResults(); }}>
                  {E.NOTE_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}
                </select>
                <select aria-label="Sa octave" value={saOct} onChange={(e) => { setSaOct(+e.target.value); resetResults(); }}>
                  <option value={2}>lower voice</option><option value={3}>middle voice</option><option value={4}>higher voice</option>
                </select>
                <span className="hz">{saHz.toFixed(1)} Hz</span>
              </div>
              <div className="row">
                <button className="btn quiet" style={{ padding: '6px 14px' }} onClick={() => { if (audio.ensure()) audio.playNote(saHz, audio.now + 0.05, 1.4, 0.5, inst); }}>Hear Sa</button>
              </div>
            </div>
            <div className="field">
              <label htmlFor="scaleSel">{(trad === 'hindustani' ? 'Thaat' : 'Mela') + (locked ? ' (set by the raga)' : '')}</label>
              <select id="scaleSel" value={scaleName} disabled={locked} onChange={(e) => { setScale(e.target.value); resetResults(); }}>
                {Object.keys(E.SCALES[trad]).map((k) => <option key={k} value={k}>{trad === 'carnatic' ? `${MELA_NO[k]} ${k}` : k}</option>)}
              </select>
            </div>
            <div className="field">
              <span className="lab">Notation</span>
              <div className="seg" role="group" aria-label="Notation script">
                <button aria-pressed={script === 'latin'} onClick={() => setScript('latin')}>Latin</button>
                <button aria-pressed={script === 'deva'} onClick={() => setScript('deva')}>देवनागरी</button>
              </div>
            </div>
            <div className="field">
              <label htmlFor="tuningSel">Tuning</label>
              <select id="tuningSel" value={tuning} onChange={(e) => { setTuning(e.target.value as Tuning); resetResults(); }}>
                <option value="just">Just intonation</option><option value="equal">Equal temperament</option>
              </select>
            </div>
          </section>

          <SaFinder audio={audio} disabled={phase !== 'idle'} onBusy={setSaBusy} onUse={useSa} />

          <section className="card">
            <h3>Sound</h3>
            <div className="field">
              <label htmlFor="instSel">Plays the line</label>
              <select id="instSel" value={inst} onChange={(e) => setInst(e.target.value as Instrument)}>
                <option value="harmonium">Harmonium</option><option value="violin">Violin</option><option value="sine">Plain tone</option>
              </select>
            </div>
            <div className="field">
              <span className="lab">{trad === 'hindustani' ? 'Tanpura' : 'Tambura'}</span>
              <div className="row">
                <button className={'btn' + (droneOn ? ' primary' : '')} style={{ padding: '6px 14px' }} aria-pressed={droneOn}
                  onClick={() => { if (droneOn) stopDrone(); else startDrone(); }}>{droneOn ? 'Tanpura on' : 'Tanpura off'}</button>
                <div className="seg" role="group" aria-label="First string tuning">
                  {(['P', 'M', 'N'] as DroneTune[]).map((t) => (
                    <button key={t} aria-pressed={droneTune === t} onClick={() => setDroneTune(t)}>{{ P: 'Pa', M: 'Ma', N: 'Ni' }[t]}</button>
                  ))}
                </div>
              </div>
              <input type="range" min={0} max={100} value={droneVol} aria-label="Drone volume"
                onChange={(e) => { setDroneVol(+e.target.value); audio.setDroneVolume(+e.target.value / 100); }} />
            </div>
            <hr className="divider" />
            <div className="field">
              <label htmlFor="taalSel">{trad === 'hindustani' ? 'Taal' : 'Tala'}</label>
              <select id="taalSel" value={taal} onChange={(e) => setTaal(e.target.value)}>
                {Object.entries(TAALS[trad]).map(([k, t]) => <option key={k} value={k}>{t.name}</option>)}
              </select>
            </div>
            <div className="ringwrap">
              <div aria-hidden="true"><BeatRing taal={taalDef} active={activeBeat} /></div>
              <p className="legend">{taalDef.legend}</p>
            </div>
            <div className="field" style={{ marginTop: 14 }}>
              <label htmlFor="bpm">Tempo <span className="hz">{bpm} beats a minute</span></label>
              <input id="bpm" type="range" min={40} max={120} value={bpm} onChange={(e) => setBpm(+e.target.value)} />
            </div>
            <div className="field">
              <label className="check"><input type="checkbox" checked={beatOn} onChange={(e) => setBeatOn(e.target.checked)} /> <span>Play the beat while the line is played</span></label>
              <label className="check"><input type="checkbox" checked={keepOn} onChange={(e) => setKeepOn(e.target.checked)} /> <span>Keep drone and beat on while I sing. Use headphones, or the microphone will hear them.</span></label>
            </div>
          </section>
        </aside>
      </div>
      <p className="foot">Synthesised sound for now. Scoring checks pitch only, not timing, and does not yet allow for gamakas or meend.</p>
    </div>
  );
}
