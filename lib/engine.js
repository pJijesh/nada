/* Riyaz prototype engine: pure functions for pitch maths, YIN tracking and scoring.
   Runs in the browser and in Node (for tests). */
(function (root) {
  'use strict';

  var NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  var JI = [1, 16 / 15, 9 / 8, 6 / 5, 5 / 4, 4 / 3, 45 / 32, 3 / 2, 8 / 5, 5 / 3, 9 / 5, 15 / 8];
  var DEGREES = ['S', 'R', 'G', 'M', 'P', 'D', 'N'];

  // Semitones above Sa for the seven degrees of each scale.
  var SCALES = {
    hindustani: {
      Bilawal: [0, 2, 4, 5, 7, 9, 11],
      Kalyan: [0, 2, 4, 6, 7, 9, 11],
      Khamaj: [0, 2, 4, 5, 7, 9, 10],
      Bhairav: [0, 1, 4, 5, 7, 8, 11],
      Kafi: [0, 2, 3, 5, 7, 9, 10]
    },
    carnatic: {
      Mayamalavagowla: [0, 1, 4, 5, 7, 8, 11],
      Shankarabharanam: [0, 2, 4, 5, 7, 9, 11],
      Kharaharapriya: [0, 2, 3, 5, 7, 9, 10],
      Kalyani: [0, 2, 4, 6, 7, 9, 11],
      Hanumatodi: [0, 1, 3, 5, 7, 8, 10]
    }
  };

  var CARNATIC_VARIANT = {
    R: { 1: 'R1', 2: 'R2' },
    G: { 3: 'G2', 4: 'G3' },
    M: { 5: 'M1', 6: 'M2' },
    D: { 8: 'D1', 9: 'D2' },
    N: { 10: 'N2', 11: 'N3' }
  };
  var KOMAL_AT = { R: 1, G: 3, D: 8, N: 10 };

  function saFreq(noteIndex, octave) {
    var midi = 12 * (octave + 1) + noteIndex;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function ratioFor(semi, tuning) {
    return tuning === 'equal' ? Math.pow(2, semi / 12) : JI[semi];
  }

  // tok = {d: degree index 0..6, o: -1 | 0 | 1}
  function noteFreq(tok, saHz, semis, tuning) {
    return saHz * ratioFor(semis[tok.d], tuning) * Math.pow(2, tok.o);
  }

  function parseLine(str) {
    var out = [];
    String(str).trim().split(/\s+/).forEach(function (t) {
      if (!t) return;
      var d = DEGREES.indexOf(t.charAt(0));
      if (d < 0) throw new Error('Bad swara token: ' + t);
      var o = 0;
      if (t.charAt(1) === '-') o = -1;
      else if (t.charAt(1) === '+') o = 1;
      out.push({ d: d, o: o });
    });
    return out;
  }

  // Small label under a swara: komal / tivra for Hindustani, R1..N3 for Carnatic.
  function variantLabel(tradition, degIndex, semi) {
    var deg = DEGREES[degIndex];
    if (tradition === 'carnatic') {
      return (CARNATIC_VARIANT[deg] && CARNATIC_VARIANT[deg][semi]) || '';
    }
    if (deg === 'M') return semi === 6 ? 'tivra' : '';
    if (KOMAL_AT[deg] !== undefined && semi === KOMAL_AT[deg]) return 'komal';
    return '';
  }

  function foldCents(freq, target) {
    var c = 1200 * Math.log(freq / target) / Math.LN2;
    return c - 1200 * Math.round(c / 1200);
  }

  function median(arr) {
    if (!arr.length) return NaN;
    var a = arr.slice().sort(function (x, y) { return x - y; });
    var m = a.length >> 1;
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }

  function decimate(buf, k) {
    if (k <= 1) return buf;
    var n = Math.floor(buf.length / k);
    var out = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var s = 0, b = i * k;
      for (var j = 0; j < k; j++) s += buf[b + j];
      out[i] = s / k;
    }
    return out;
  }

  // YIN fundamental estimate. Returns {f, prob} or null.
  function yin(buf, sr, minF, maxF, thresh) {
    minF = minF || 70; maxF = maxF || 900; thresh = thresh || 0.2;
    var tauMax = Math.floor(sr / minF);
    var tauMin = Math.max(2, Math.floor(sr / maxF));
    var W = buf.length - tauMax - 1;
    if (W < 64) return null;
    var d = new Float32Array(tauMax + 2);
    var tau, j, diff, sum;
    for (tau = 1; tau <= tauMax; tau++) {
      sum = 0;
      for (j = 0; j < W; j++) { diff = buf[j] - buf[j + tau]; sum += diff * diff; }
      d[tau] = sum;
    }
    var cm = new Float32Array(tauMax + 2);
    cm[0] = 1;
    var run = 0;
    for (tau = 1; tau <= tauMax; tau++) {
      run += d[tau];
      cm[tau] = run > 0 ? d[tau] * tau / run : 1;
    }
    var best = -1;
    for (tau = tauMin; tau <= tauMax; tau++) {
      if (cm[tau] < thresh) {
        while (tau + 1 <= tauMax && cm[tau + 1] < cm[tau]) tau++;
        best = tau;
        break;
      }
    }
    if (best < 0) return null;
    var s0 = cm[best - 1], s1 = cm[best], s2 = best + 1 <= tauMax ? cm[best + 1] : s1;
    var denom = 2 * (2 * s1 - s2 - s0);
    var refined = denom !== 0 ? best + (s2 - s0) / denom : best;
    if (!(refined > 0)) return null;
    return { f: sr / refined, prob: 1 - s1 };
  }

  var RMS_GATE = 0.006;

  function rmsOf(buf, n) {
    var s = 0;
    n = Math.min(n, buf.length);
    for (var i = 0; i < n; i++) s += buf[i] * buf[i];
    return Math.sqrt(s / Math.max(1, n));
  }

  // One analysis frame (used live from an AnalyserNode). Returns {f, rms}; f = 0 when unvoiced.
  function trackFrame(buf, sr) {
    var k = Math.max(1, Math.round(sr / 12000));
    var ds = decimate(buf, k);
    var srd = sr / k;
    var rms = rmsOf(ds, ds.length);
    if (rms < RMS_GATE) return { f: 0, rms: rms };
    var r = yin(ds, srd, 70, 900, 0.2);
    if (!r || r.prob < 0.8) return { f: 0, rms: rms };
    return { f: r.f, rms: rms };
  }

  // Whole recording -> frames [{t, f, rms}] every ~20 ms.
  function trackPitch(samples, sr) {
    var k = Math.max(1, Math.round(sr / 12000));
    var ds = decimate(samples, k);
    var srd = sr / k;
    var tauMax = Math.floor(srd / 70);
    var frameLen = tauMax + 380;
    var hop = Math.max(1, Math.round(0.02 * srd));
    var frames = [];
    for (var s = 0; s + frameLen <= ds.length; s += hop) {
      var frame = ds.subarray(s, s + frameLen);
      var t = (s + frameLen / 2) / srd;
      var rms = rmsOf(frame, 380);
      var f = 0;
      if (rms >= RMS_GATE) {
        var r = yin(frame, srd, 70, 900, 0.2);
        if (r && r.prob >= 0.8) f = r.f;
      }
      frames.push({ t: t, f: f, rms: rms });
    }
    return frames;
  }

  function firstOnset(frames, minRun) {
    minRun = minRun || 5;
    for (var i = 0; i + minRun <= frames.length; i++) {
      var ok = true;
      for (var j = 0; j < minRun; j++) if (!frames[i + j].f) { ok = false; break; }
      if (ok) return frames[i].t;
    }
    return null;
  }

  // Score each expected note. Pitch only; timing is not scored.
  function scoreLine(frames, expectedHz, beat, opts) {
    opts = opts || {};
    var inTune = opts.inTune != null ? opts.inTune : 30;
    var minVoiced = opts.minVoiced != null ? opts.minVoiced : 0.5;
    var t0 = opts.t0 != null ? opts.t0 : firstOnset(frames, 5);
    var notes = expectedHz.map(function (target) {
      return { target: target, verdict: 'missed', cents: null, sung: null };
    });
    if (t0 == null) return { t0: null, notes: notes, inTuneCount: 0 };
    var count = 0;
    notes.forEach(function (n, i) {
      var a = t0 + i * beat + 0.25 * beat;
      var b = t0 + i * beat + 0.85 * beat;
      var total = 0, cents = [];
      for (var k = 0; k < frames.length; k++) {
        var fr = frames[k];
        if (fr.t < a || fr.t > b) continue;
        total++;
        if (fr.f) cents.push(foldCents(fr.f, n.target));
      }
      if (!total || cents.length / total < minVoiced) return;
      var c = median(cents);
      n.cents = c;
      n.sung = n.target * Math.pow(2, c / 1200);
      if (Math.abs(c) <= inTune) { n.verdict = 'in'; count++; }
      else n.verdict = c < 0 ? 'low' : 'high';
    });
    return { t0: t0, notes: notes, inTuneCount: count };
  }

  // Nearest note of the scale (any octave) for the live gauge.
  function nearestScaleNote(freq, saHz, semis, tuning) {
    var best = null;
    for (var d = 0; d < 7; d++) {
      var base = saHz * ratioFor(semis[d], tuning);
      var oct = Math.round(Math.log(freq / base) / Math.LN2);
      var cand = base * Math.pow(2, oct);
      var c = 1200 * Math.log(freq / cand) / Math.LN2;
      if (!best || Math.abs(c) < Math.abs(best.cents)) best = { deg: d, hz: cand, cents: c };
    }
    return best;
  }

  // Synthetic "singer" with known mistakes, so Listen can be shown without a microphone.
  var DEMO_DEV = [4, -3, -38, 6, 2, 45, null, -5]; // cents; null = missed note
  function demoDeviation(i) { return DEMO_DEV[i % DEMO_DEV.length]; }

  function demoAttempt(expectedHz, beat, sr, lead) {
    sr = sr || 22050;
    lead = lead != null ? lead : 0.6;
    var n = expectedHz.length;
    var total = lead + n * beat + 0.5;
    var len = Math.floor(total * sr);
    var out = new Float32Array(len);
    var phase = 0, seed = 12345;
    var glide = 0.05, prevCents = null, prevTarget = null;
    for (var i = 0; i < len; i++) {
      var t = i / sr;
      var rel = t - lead;
      var idx = Math.floor(rel / beat);
      var amp = 0, freq = expectedHz[0];
      if (rel >= 0 && idx < n) {
        var dev = demoDeviation(idx);
        var local = rel - idx * beat;
        var targetHz = expectedHz[idx] * Math.pow(2, (dev || 0) / 1200);
        freq = targetHz;
        if (idx > 0 && local < glide) {
          var pd = demoDeviation(idx - 1);
          var prevHz = expectedHz[idx - 1] * Math.pow(2, (pd || 0) / 1200);
          var x = local / glide;
          freq = prevHz * Math.pow(targetHz / prevHz, x);
        }
        if (dev !== null) {
          var env = Math.min(1, local / 0.04) * Math.min(1, (beat - local) / 0.06);
          amp = Math.max(0, env) * 0.3;
        }
      }
      var vib = Math.pow(2, 12 * Math.sin(2 * Math.PI * 5.5 * t) / 1200);
      phase += 2 * Math.PI * freq * vib / sr;
      var v = 0;
      for (var h = 1; h <= 6; h++) v += Math.sin(h * phase) / h;
      seed = (seed * 1664525 + 1013904223) >>> 0;
      var noise = (seed / 4294967296 - 0.5) * 0.02;
      out[i] = amp > 0 ? amp * v + noise * (amp / 0.3) : 0;
    }
    return { samples: out, sr: sr, lead: lead };
  }

  // ---- Sa finder -------------------------------------------------------
  // The singer sings from their lowest comfortable note up to their highest.
  // We take the 8th and 92nd percentile of voiced pitch as the comfortable
  // range, then place the low end of it LOW_BELOW_SA semitones under Sa, so the
  // madhya octave sits inside the range with room for the lower octave.
  var LOW_BELOW_SA = 4;
  function percentile(sorted, p) {
    var i = (sorted.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
  }
  function midiOf(hz) { return 69 + 12 * Math.log(hz / 440) / Math.LN2; }
  function suggestSa(frames) {
    var m = [];
    for (var i = 0; i < frames.length; i++) if (frames[i].f) m.push(midiOf(frames[i].f));
    var voicedSecs = m.length * 0.02;
    if (voicedSecs < 1) return { ok: false, reason: 'too-short', voicedSecs: voicedSecs };
    m.sort(function (a, b) { return a - b; });
    var low = percentile(m, 0.08), high = percentile(m, 0.92), span = high - low;
    if (span < 7) return { ok: false, reason: 'narrow', span: span, voicedSecs: voicedSecs };
    var saMidi = Math.round(low + LOW_BELOW_SA);
    var pick = function (mi) {
      var oct = Math.floor(mi / 12) - 1;
      oct = Math.max(2, Math.min(4, oct));
      var note = ((mi % 12) + 12) % 12;
      return { note: note, oct: oct, hz: saFreq(note, oct) };
    };
    return {
      ok: true, span: span, voicedSecs: voicedSecs,
      lowHz: 440 * Math.pow(2, (low - 69) / 12), highHz: 440 * Math.pow(2, (high - 69) / 12),
      best: pick(saMidi), alts: [pick(saMidi - 1), pick(saMidi + 1)]
    };
  }

  // Synthetic voice for the Sa finder: holds lowHz, glides up, holds highHz.
  function demoRange(lowHz, highHz, sr) {
    sr = sr || 22050;
    var hold = 1.6, glide = 1.4, total = hold * 2 + glide + 0.4, lead = 0.3;
    var len = Math.floor((total + lead) * sr), out = new Float32Array(len), phase = 0;
    for (var i = 0; i < len; i++) {
      var t = i / sr - lead, f = lowHz, amp = 0.3;
      if (t < 0 || t > total - 0.4) amp = 0;
      else if (t < hold) f = lowHz;
      else if (t < hold + glide) f = lowHz * Math.pow(highHz / lowHz, (t - hold) / glide);
      else f = highHz;
      var vib = Math.pow(2, 10 * Math.sin(2 * Math.PI * 5.2 * t) / 1200);
      phase += 2 * Math.PI * f * vib / sr;
      var v = 0;
      for (var h = 1; h <= 5; h++) v += Math.sin(h * phase) / h;
      out[i] = amp * v;
    }
    return { samples: out, sr: sr };
  }

  var api = {
    suggestSa: suggestSa, demoRange: demoRange,
    NOTE_NAMES: NOTE_NAMES, JI: JI, DEGREES: DEGREES, SCALES: SCALES,
    saFreq: saFreq, noteFreq: noteFreq, parseLine: parseLine, variantLabel: variantLabel,
    foldCents: foldCents, median: median, decimate: decimate, yin: yin,
    trackFrame: trackFrame, trackPitch: trackPitch, firstOnset: firstOnset,
    scoreLine: scoreLine, nearestScaleNote: nearestScaleNote,
    demoAttempt: demoAttempt, demoDeviation: demoDeviation
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RiyazEngine = api;
})(typeof window !== 'undefined' ? window : this);
