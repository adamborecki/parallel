// Synthesized demo material — drum bus, vocal phrase, full mix.
// All loops are 4 bars at 110 BPM, generated in-browser so there are zero
// network requests and we can ship to GitHub Pages with no CDN audio.

const TEMPO = 110;
const LOOP_BARS = 4;
const LOOP_SEC = (60 / TEMPO) * 4 * LOOP_BARS;

export const SOURCES = [
  { id: 'drums', label: 'Drum Bus' },
  { id: 'vocal', label: 'Vocal' },
  { id: 'mix', label: 'Full Mix' },
];

export function buildBuffers(ctx) {
  const sr = ctx.sampleRate;
  const length = Math.floor(LOOP_SEC * sr);

  return {
    drums: makeBuffer(ctx, 2, length, (data, ch) => synthDrumBus(data, sr, length, TEMPO, ch)),
    vocal: makeBuffer(ctx, 2, length, (data, ch) => synthVocalLead(data, sr, length, ch)),
    mix:   makeBuffer(ctx, 2, length, (data, ch) => {
      synthDrumBus(data, sr, length, TEMPO, ch, 0.62);
      synthBass(data, sr, length, TEMPO, 0.3);
      synthPad(data, sr, length, ch, 0.18);
    }),
  };
}

function makeBuffer(ctx, channels, length, fillFn) {
  const buffer = ctx.createBuffer(channels, length, ctx.sampleRate);
  for (let ch = 0; ch < channels; ch++) fillFn(buffer.getChannelData(ch), ch);
  return buffer;
}

function synthDrumBus(data, sr, length, tempo, channel, gain = 1) {
  const beatSamples = Math.floor((60 / tempo) * sr);
  const eighth = Math.floor(beatSamples / 2);
  const totalBeats = Math.floor(length / beatSamples);

  synthKickPattern(data, sr, length, tempo, gain * 0.88);
  synthSnarePattern(data, sr, length, tempo, gain * 0.55);

  for (let i = 0; i < totalBeats * 2; i++) {
    synthHat(data, sr, length, i * eighth, 0.045, gain * (i % 2 === 0 ? 0.1 : 0.14));
  }
  addStereoRoom(data, sr, length, channel, 0.05 * gain, 0.18);
}

function synthKickPattern(data, sr, length, tempo, gain) {
  const beatSamples = Math.floor((60 / tempo) * sr);
  const totalBeats = Math.floor(length / beatSamples);
  for (let beat = 0; beat < totalBeats; beat++) {
    const start = beat * beatSamples;
    synthKick(data, sr, length, start, 0.18, 0.98 * gain, 0.32);
    if (beat % 4 === 2) {
      synthKick(data, sr, length, start + Math.floor(beatSamples * 0.72), 0.12, 0.35 * gain, 0.28);
    }
  }
}

function synthKick(data, sr, length, start, decaySec, gain, clickGain) {
  const decaySamples = Math.floor(decaySec * sr);
  let phase = 0;
  for (let i = 0; i < decaySamples && start + i < length; i++) {
    const t = i / sr;
    const env = Math.exp(-t * 9);
    const freq = 48 + 150 * Math.exp(-t * 30);
    phase += freq / sr;
    const tone = Math.sin(2 * Math.PI * phase) * env;
    const click = i < 70 ? (Math.random() - 0.5) * Math.exp(-i / 18) * clickGain : 0;
    data[start + i] += (tone + click) * gain;
  }
}

function synthSnarePattern(data, sr, length, tempo, gain) {
  const beatSamples = Math.floor((60 / tempo) * sr);
  const totalBeats = Math.floor(length / beatSamples);
  for (let beat = 0; beat < totalBeats; beat++) {
    if (beat % 2 !== 1) continue;
    synthSnare(data, sr, length, beat * beatSamples, 0.17, gain);
  }
}

function synthSnare(data, sr, length, start, decaySec, gain) {
  const decaySamples = Math.floor(decaySec * sr);
  let phase = 0;
  let lp = 0;
  for (let i = 0; i < decaySamples && start + i < length; i++) {
    const t = i / sr;
    const env = Math.exp(-t * 12);
    phase += 185 / sr;
    const body = Math.sin(2 * Math.PI * phase) * 0.35;
    const noise = (Math.random() - 0.5) * 0.9;
    lp += 0.18 * (noise - lp);
    const crack = noise - lp;
    data[start + i] += (body + crack * 0.65) * env * gain;
  }
}

function synthHat(data, sr, length, start, decaySec, gain) {
  const decaySamples = Math.floor(decaySec * sr);
  let lp = 0;
  for (let i = 0; i < decaySamples && start + i < length; i++) {
    const env = Math.exp(-i / (sr * decaySec * 0.45));
    const noise = (Math.random() - 0.5);
    lp += 0.78 * (noise - lp);
    const hp = noise - lp;
    data[start + i] += hp * env * gain;
  }
}

function synthBass(data, sr, length, tempo, gain) {
  const beatSec = 60 / tempo;
  const barSec = beatSec * 4;
  const notes = [55, 55, 73.42, 65.41];
  let lp = 0;
  const cutoff = 550;
  const rc = 1 / (2 * Math.PI * cutoff);
  const dt = 1 / sr;
  const alpha = dt / (rc + dt);

  for (let i = 0; i < length; i++) {
    const t = i / sr;
    const bar = Math.floor(t / barSec) % notes.length;
    const freq = notes[bar];
    const phase = (freq * t) % 1;
    const subPhase = ((freq / 2) * t) % 1;
    const saw = (2 * phase - 1) * 0.6 + (2 * subPhase - 1) * 0.25;
    const pulse = Math.sign(Math.sin(2 * Math.PI * freq * t * 0.5)) * 0.1;
    const env = 0.68 + 0.32 * Math.exp(-(((t / (beatSec / 2)) % 1)) * 2.2);
    const sample = (saw + pulse) * env * gain;
    lp += alpha * (sample - lp);
    data[i] += lp;
  }
}

function synthPad(data, sr, length, channel, gain) {
  const chord = [220, 261.63, 329.63, 392];
  const detune = channel === 0 ? 1.0 : 1.004;
  for (let i = 0; i < length; i++) {
    const t = i / sr;
    let sum = 0;
    for (const freq of chord) {
      const f = freq * detune;
      sum += Math.sin(2 * Math.PI * f * t) * 0.14;
      sum += Math.sin(2 * Math.PI * f * 2 * t) * 0.03;
    }
    const lfo = 0.65 + 0.35 * Math.sin(2 * Math.PI * 0.11 * t + (channel === 0 ? 0 : 0.7));
    data[i] += sum * lfo * gain;
  }
}

function synthVocalLead(data, sr, length, channel) {
  const phrases = [
    { start: 0.18, dur: 0.82, root: 220 },
    { start: 1.28, dur: 0.56, root: 246.94 },
    { start: 2.18, dur: 1.04, root: 261.63 },
    { start: 4.05, dur: 0.68, root: 220 },
    { start: 5.05, dur: 0.62, root: 293.66 },
    { start: 6.0,  dur: 1.18, root: 261.63 },
  ];

  for (const phrase of phrases) {
    const start = Math.floor(phrase.start * sr);
    const dur = Math.floor(phrase.dur * sr);
    let noiseLp = 0;
    for (let i = 0; i < dur && start + i < length; i++) {
      const t = i / sr;
      const attack = Math.min(1, t / 0.03);
      const release = Math.min(1, (phrase.dur - t) / 0.08);
      const syllable = 0.58 + 0.42 * Math.abs(Math.sin(2 * Math.PI * 2.7 * t));
      const f1 = Math.sin(2 * Math.PI * phrase.root * t) * 0.42;
      const f2 = Math.sin(2 * Math.PI * phrase.root * 2.1 * t) * 0.16;
      const air = (Math.random() - 0.5) * 0.18;
      noiseLp += 0.08 * (air - noiseLp);
      const stereo = channel === 0 ? 0.985 : 1.015;
      const tone = (f1 + f2 + noiseLp * 0.9) * attack * release * syllable * stereo;
      data[start + i] += tone * 0.58;
    }
  }
}

function addStereoRoom(data, sr, length, channel, gain, rate) {
  let state = 0;
  for (let i = 0; i < length; i++) {
    const t = i / sr;
    const noise = (Math.random() - 0.5) * gain;
    state += 0.02 * (noise - state);
    const mod = 0.72 + 0.28 * Math.sin(2 * Math.PI * rate * t + (channel === 0 ? 0 : 0.9));
    data[i] += state * mod;
  }
}
