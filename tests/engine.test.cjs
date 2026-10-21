const assert = require('assert');
const E = require('../lib/engine.js');

let pass = 0;
function t(name, fn) { fn(); pass++; console.log('ok  ' + name); }
const near = (a, b, tol, msg) => assert(Math.abs(a - b) <= tol, (msg || '') + ' got ' + a + ' want ' + b + ' ±' + tol);

t('saFreq matches known pitches', () => {
  near(E.saFreq(9, 4), 440, 0.001);
  near(E.saFreq(2, 3), 146.83, 0.01);
});

t('noteFreq: Pa is 3/2 of Sa in just intonation, 2^(7/12) in equal', () => {
  const sa = 146.83, semis = E.SCALES.hindustani.Bilawal;
  const pa = E.parseLine('P')[0];
  near(E.noteFreq(pa, sa, semis, 'just'), sa * 1.5, 0.001);
  near(E.noteFreq(pa, sa, semis, 'equal'), sa * Math.pow(2, 7 / 12), 0.001);
  const nLow = E.parseLine('N-')[0];
  near(E.noteFreq(nLow, sa, semis, 'just'), sa * 15 / 16, 0.001);
});

t('parseLine reads octave marks and rejects bad tokens', () => {
  const l = E.parseLine('N- R G S+');
  assert.deepStrictEqual(l.map(x => x.o), [-1, 0, 0, 1]);
  assert.throws(() => E.parseLine('S X'));
});

t('variant labels', () => {
  assert.strictEqual(E.variantLabel('hindustani', 3, 6), 'tivra');
  assert.strictEqual(E.variantLabel('hindustani', 1, 1), 'komal');
  assert.strictEqual(E.variantLabel('hindustani', 1, 2), '');
  assert.strictEqual(E.variantLabel('carnatic', 1, 1), 'R1');
  assert.strictEqual(E.variantLabel('carnatic', 6, 11), 'N3');
  assert.strictEqual(E.variantLabel('carnatic', 0, 0), '');
});

t('every scale has seven ascending degrees starting at Sa', () => {
  ['hindustani', 'carnatic'].forEach(tr => Object.keys(E.SCALES[tr]).forEach(k => {
    const s = E.SCALES[tr][k];
    assert.strictEqual(s.length, 7, k);
    assert.strictEqual(s[0], 0, k);
    assert.strictEqual(s[4], 7, k + ' Pa');
    for (let i = 1; i < 7; i++) assert(s[i] > s[i - 1], k);
  }));
});

t('foldCents wraps octaves', () => {
  near(E.foldCents(220, 110), 0, 0.001);
  near(E.foldCents(110 * Math.pow(2, 30 / 1200), 220), 30, 0.001);
  near(E.foldCents(220 * Math.pow(2, -45 / 1200), 220), -45, 0.001);
});

function sine(f, sr, secs) {
  const a = new Float32Array(Math.floor(sr * secs));
  for (let i = 0; i < a.length; i++) a[i] = 0.4 * Math.sin(2 * Math.PI * f * i / sr);
  return a;
}

t('yin finds a clean sine', () => {
  const r = E.yin(sine(220, 12000, 0.08), 12000, 70, 900, 0.2);
  assert(r);
  near(r.f, 220, 1.5);
});

[22050, 44100, 48000].forEach(sr => {
  t('trackPitch recovers 196 Hz at ' + sr + ' Hz sample rate', () => {
    const fr = E.trackPitch(sine(196, sr, 1.0), sr);
    const voiced = fr.filter(x => x.f).map(x => x.f);
    assert(voiced.length > fr.length * 0.9, 'voiced share');
    near(E.median(voiced), 196, 2);
  });
});

t('silence has no onset and scores all missed', () => {
  const fr = E.trackPitch(new Float32Array(48000), 48000);
  assert.strictEqual(E.firstOnset(fr, 5), null);
  const r = E.scoreLine(fr, [200, 220], 1);
  assert(r.notes.every(n => n.verdict === 'missed'));
});

function demoRun(sr, saHz, scale, lineStr, tuning, beat) {
  const semis = E.SCALES.hindustani[scale];
  const toks = E.parseLine(lineStr);
  const hz = toks.map(k => E.noteFreq(k, saHz, semis, tuning));
  const d = E.demoAttempt(hz, beat, sr);
  const frames = E.trackPitch(d.samples, d.sr);
  return { hz, res: E.scoreLine(frames, hz, beat) };
}

[22050, 44100].forEach(sr => {
  t('demo attempt scores as designed at ' + sr + ' Hz', () => {
    const { res } = demoRun(sr, 146.83, 'Bilawal', 'S R G M P D N S+', 'just', 1.0);
    assert(res.t0 != null);
    near(res.t0, 0.6, 0.15, 'onset');
    const v = res.notes.map(n => n.verdict);
    assert.deepStrictEqual(v, ['in', 'in', 'low', 'in', 'in', 'high', 'missed', 'in']);
    near(res.notes[2].cents, -38, 10, 'low cents');
    near(res.notes[5].cents, 45, 10, 'high cents');
    assert.strictEqual(res.inTuneCount, 5);
  });
});

t('demo works for a 12-note line and a fast tempo', () => {
  const { res } = demoRun(22050, 164.81, 'Kalyan', 'S R G R G M G M P M P D', 'equal', 0.6);
  assert.strictEqual(res.notes.length, 12);
  assert.strictEqual(res.notes[2].verdict, 'low');
  assert.strictEqual(res.notes[6].verdict, 'missed');
});

t('singing an octave lower is still scored by pitch class', () => {
  const semis = E.SCALES.hindustani.Bilawal;
  const sa = 220;
  const hz = E.parseLine('S R G M').map(k => E.noteFreq(k, sa, semis, 'just'));
  const lower = hz.map(f => f / 2);
  const d = E.demoAttempt(lower, 1.0, 22050);
  const frames = E.trackPitch(d.samples, d.sr);
  const res = E.scoreLine(frames, hz, 1.0);
  // demo deviations for indices 0..3 are +4, -3, -38, +6
  assert.deepStrictEqual(res.notes.map(n => n.verdict), ['in', 'in', 'low', 'in']);
});

t('nearestScaleNote reports degree and cents', () => {
  const semis = E.SCALES.hindustani.Bilawal;
  const sa = 146.83;
  const f = sa * 5 / 4 * 2 * Math.pow(2, 20 / 1200); // Ga, one octave up, 20 cents sharp
  const n = E.nearestScaleNote(f, sa, semis, 'just');
  assert.strictEqual(n.deg, 2);
  near(n.cents, 20, 0.5);
});

t('Sa finder: 130 to 392 Hz voice suggests a Sa about four semitones above the low note', () => {
  const d = E.demoRange(130.81, 392.0, 22050); // C3 to G4
  const r = E.suggestSa(E.trackPitch(d.samples, d.sr));
  assert(r.ok);
  near(r.lowHz, 130.81, 4);
  near(r.highHz, 392, 10);
  assert.strictEqual(E.NOTE_NAMES[r.best.note], 'E'); // C + 4 semitones
  assert.strictEqual(r.best.oct, 3);
  assert.strictEqual(r.alts.length, 2);
});

t('Sa finder rejects silence and a one-note hum', () => {
  assert.strictEqual(E.suggestSa(E.trackPitch(new Float32Array(44100 * 3), 44100)).ok, false);
  const fr = E.trackPitch(sine(220, 22050, 3.0), 22050);
  const r = E.suggestSa(fr);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'narrow');
});

t('Sa finder is stable across sample rates', () => {
  [22050, 44100].forEach(sr => {
    const d = E.demoRange(110, 330, sr);
    const r = E.suggestSa(E.trackPitch(d.samples, d.sr));
    assert(r.ok, 'ok at ' + sr);
    assert.strictEqual(E.NOTE_NAMES[r.best.note], 'C♯'); // A2 + 4 semitones
  });
});

console.log('\n' + pass + ' checks passed');
