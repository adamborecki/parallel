const TEMPO = 110;
const LOOP_BARS = 4;
const LOOP_SEC = (60 / TEMPO) * 4 * LOOP_BARS;

export const SOURCES = [
  { id: 'drums', label: '🥁 Drum Bus' },
  { id: 'vocal', label: '🎙️ Vocal' },
  { id: 'mix', label: '🎚️ Full Mix' },
  { id: 'room', label: '🏙️ Room Crush' },
];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.processor = null;
    this.buffers = {};
    this.sourceId = 'drums';
    this.sourceNode = null;
    this.playing = false;
    this.loop = true;
    this.blend = 0.42;
    this.bypass = false;
    this.wetSolo = false;
    this.meterListeners = [];
    this.playbackListeners = [];
  }

  async init(onProgress) {
    onProgress?.('Creating audio context...');
    this.ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });

    onProgress?.('Loading parallel compressor...');
    await this.ctx.audioWorklet.addModule('js/parallel-processor.js');

    onProgress?.('Synthesizing demo material...');
    this._buildBuffers();

    onProgress?.('Building signal graph...');
    this._buildGraph();

    onProgress?.('Ready');
  }

  _buildGraph() {
    const ctx = this.ctx;

    this.processor = new AudioWorkletNode(ctx, 'parallel-compressor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
    });
    this.processor.port.onmessage = (event) => {
      if (event.data?.type === 'meter') {
        for (const listener of this.meterListeners) listener(event.data);
      }
    };

    this.dryAnalyser = ctx.createAnalyser();
    this.wetAnalyser = ctx.createAnalyser();
    this.blendAnalyser = ctx.createAnalyser();
    for (const analyser of [this.dryAnalyser, this.wetAnalyser, this.blendAnalyser]) {
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.8;
    }

    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.outputLimiter = ctx.createDynamicsCompressor();
    this.outputLimiter.threshold.value = -3;
    this.outputLimiter.knee.value = 4;
    this.outputLimiter.ratio.value = 18;
    this.outputLimiter.attack.value = 0.003;
    this.outputLimiter.release.value = 0.12;

    this.master = ctx.createGain();
    this.master.gain.value = 0.75;

    this.dryAnalyser.connect(this.dryGain);
    this.processor.connect(this.wetAnalyser);
    this.wetAnalyser.connect(this.wetGain);
    this.dryGain.connect(this.blendAnalyser);
    this.wetGain.connect(this.blendAnalyser);
    this.blendAnalyser.connect(this.outputLimiter);
    this.outputLimiter.connect(this.master);
    this.master.connect(ctx.destination);

    this._refreshOutputMix();
  }

  _buildBuffers() {
    const sr = this.ctx.sampleRate;
    const length = Math.floor(LOOP_SEC * sr);

    this.buffers.drums = this._makeBuffer(2, length, (data, ch) => {
      synthDrumBus(data, sr, length, TEMPO, ch);
    });
    this.buffers.vocal = this._makeBuffer(2, length, (data, ch) => {
      synthVocalLead(data, sr, length, ch);
    });
    this.buffers.mix = this._makeBuffer(2, length, (data, ch) => {
      synthDrumBus(data, sr, length, TEMPO, ch, 0.62);
      synthBass(data, sr, length, TEMPO, 0.3);
      synthPad(data, sr, length, ch, 0.18);
    });
    this.buffers.room = this._makeBuffer(2, length, (data, ch) => {
      synthRoomMic(data, sr, length, TEMPO, ch);
    });
  }

  _makeBuffer(channels, length, fillFn) {
    const buffer = this.ctx.createBuffer(channels, length, this.ctx.sampleRate);
    for (let channel = 0; channel < channels; channel++) {
      fillFn(buffer.getChannelData(channel), channel);
    }
    return buffer;
  }

  async play() {
    if (this.playing) return;
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this._startSource(0);
    this.playing = true;
    this._emitPlaybackChange();
  }

  stop() {
    if (!this.playing) return;
    this._stopSource();
    this.playing = false;
    this._emitPlaybackChange();
  }

  async togglePlay() {
    if (this.playing) this.stop();
    else await this.play();
  }

  setSource(sourceId) {
    if (!this.buffers[sourceId]) return;
    this.sourceId = sourceId;
    if (this.playing) {
      this._stopSource();
      this._startSource(0);
    }
  }

  _startSource(when = 0) {
    const ctx = this.ctx;
    const node = ctx.createBufferSource();
    node.buffer = this.buffers[this.sourceId];
    node.loop = this.loop;
    node.onended = () => {
      if (this.sourceNode !== node) return;
      this.sourceNode = null;
      this.playing = false;
      this._emitPlaybackChange();
    };
    node.connect(this.dryAnalyser);
    node.connect(this.processor);
    node.start(when || ctx.currentTime);
    this.sourceNode = node;
  }

  _stopSource() {
    const node = this.sourceNode;
    try { node?.stop(); } catch {}
    try { node?.disconnect(); } catch {}
    this.sourceNode = null;
  }

  setLoop(on) {
    this.loop = on;
    if (this.sourceNode) this.sourceNode.loop = on;
  }

  setMasterVolume(value) {
    this.master.gain.setTargetAtTime(value, this.ctx.currentTime, 0.02);
  }

  setParam(name, value) {
    const param = this.processor?.parameters.get(name);
    if (param) param.setTargetAtTime(value, this.ctx.currentTime, 0.01);
  }

  setBlend(value) {
    this.blend = Math.max(0, Math.min(1, value));
    this._refreshOutputMix();
  }

  getBlend() {
    return this.blend;
  }

  setBypass(on) {
    this.bypass = !!on;
    const param = this.processor?.parameters.get('bypass');
    if (param) param.setValueAtTime(this.bypass ? 1 : 0, this.ctx.currentTime);
    this._refreshOutputMix();
  }

  setWetSolo(on) {
    this.wetSolo = !!on;
    this._refreshOutputMix();
  }

  _refreshOutputMix() {
    if (!this.ctx || !this.dryGain || !this.wetGain) return;
    const time = this.ctx.currentTime;
    let dry = 1;
    let wet = this.blend;

    if (this.bypass) {
      dry = 1;
      wet = 0;
    } else if (this.wetSolo) {
      dry = 0;
      wet = 1;
    }

    this.dryGain.gain.setTargetAtTime(dry, time, 0.01);
    this.wetGain.gain.setTargetAtTime(wet, time, 0.01);
  }

  onMeter(listener) {
    this.meterListeners.push(listener);
  }

  onPlaybackChange(listener) {
    this.playbackListeners.push(listener);
  }

  _emitPlaybackChange() {
    for (const listener of this.playbackListeners) listener(this.playing);
  }

  getTimeDomain(which) {
    const analyser = which === 'dry'
      ? this.dryAnalyser
      : which === 'wet'
        ? this.wetAnalyser
        : this.blendAnalyser;

    const buffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buffer);
    return buffer;
  }
}

function synthDrumBus(data, sr, length, tempo, channel, gain = 1) {
  const beatSec = 60 / tempo;
  const beatSamples = Math.floor(beatSec * sr);
  const eighthSamples = Math.floor(beatSamples / 2);
  const sixteenthSamples = Math.floor(beatSamples / 4);
  const totalBeats = Math.floor(length / beatSamples);

  synthKickPattern(data, sr, length, tempo, gain * 0.88);
  synthSnarePattern(data, sr, length, tempo, gain * 0.55);

  for (let i = 0; i < totalBeats * 2; i++) {
    const start = i * eighthSamples;
    synthHat(data, sr, length, start, 0.045, gain * (i % 2 === 0 ? 0.1 : 0.14));
  }

  for (let barBeat = 0; barBeat < totalBeats * 4; barBeat++) {
    if (barBeat % 4 === 3) {
      const start = Math.floor(barBeat * sixteenthSamples * 1.0);
      synthHat(data, sr, length, start, 0.03, gain * 0.08);
    }
  }

  addStereoRoom(data, sr, length, channel, 0.05 * gain, 0.18);
}

function synthRoomMic(data, sr, length, tempo, channel) {
  const beatSec = 60 / tempo;
  const beatSamples = Math.floor(beatSec * sr);
  const totalBeats = Math.floor(length / beatSamples);
  let roomLp = 0;

  for (let beat = 0; beat < totalBeats; beat++) {
    const kickStart = beat * beatSamples;
    const snareStart = kickStart + beatSamples / 2;
    synthKickTone(data, sr, length, kickStart, 0.42, 0.46, 0.24);
    if (beat % 2 === 1) synthSnare(data, sr, length, snareStart, 0.25, 0.34);

    const hitStarts = [kickStart, snareStart];
    for (const hitStart of hitStarts) {
      const dur = Math.floor(0.3 * sr);
      for (let i = 0; i < dur && hitStart + i < length; i++) {
        const decay = Math.exp(-i / (sr * 0.13));
        const noise = (Math.random() - 0.5) * 0.55;
        roomLp += 0.12 * (noise - roomLp);
        const bright = noise - roomLp;
        const stereo = channel === 0 ? 0.95 : 1.05;
        data[hitStart + i] += (roomLp * 0.4 + bright * 0.2) * decay * stereo;
      }
    }
  }

  addStereoRoom(data, sr, length, channel, 0.06, 0.28);
}

function synthKickPattern(data, sr, length, tempo, gain = 1) {
  const beatSec = 60 / tempo;
  const beatSamples = Math.floor(beatSec * sr);
  const totalBeats = Math.floor(length / beatSamples);
  for (let beat = 0; beat < totalBeats; beat++) {
    const start = beat * beatSamples;
    synthKickTone(data, sr, length, start, 0.18, 0.98 * gain, 0.32);
    if (beat % 4 === 2) {
      synthKickTone(data, sr, length, start + Math.floor(beatSamples * 0.72), 0.12, 0.35 * gain, 0.28);
    }
  }
}

function synthKickTone(data, sr, length, start, decaySec, gain = 1, clickGain = 0.28) {
  const decaySamples = Math.floor(decaySec * sr);
  let phase = 0;
  for (let i = 0; i < decaySamples && start + i < length; i++) {
    const t = i / sr;
    const ampEnv = Math.exp(-t * 9);
    const freq = 48 + 150 * Math.exp(-t * 30);
    phase += freq / sr;
    const tone = Math.sin(2 * Math.PI * phase) * ampEnv;
    const click = i < 70 ? (Math.random() - 0.5) * Math.exp(-i / 18) * clickGain : 0;
    data[start + i] += (tone + click) * gain;
  }
}

function synthSnarePattern(data, sr, length, tempo, gain = 1) {
  const beatSec = 60 / tempo;
  const beatSamples = Math.floor(beatSec * sr);
  const totalBeats = Math.floor(length / beatSamples);
  for (let beat = 0; beat < totalBeats; beat++) {
    if (beat % 2 !== 1) continue;
    const start = beat * beatSamples;
    synthSnare(data, sr, length, start, 0.17, gain);
  }
}

function synthSnare(data, sr, length, start, decaySec, gain = 1) {
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

function synthHat(data, sr, length, start, decaySec, gain = 1) {
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

function synthBass(data, sr, length, tempo, gain = 0.25) {
  const beatSec = 60 / tempo;
  const barSec = beatSec * 4;
  const notes = [55, 55, 73.42, 65.41];
  let lowpass = 0;
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
    lowpass += alpha * (sample - lowpass);
    data[i] += lowpass;
  }
}

function synthPad(data, sr, length, channel, gain = 0.15) {
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
    { start: 6.0, dur: 1.18, root: 261.63 },
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
      const formant1 = Math.sin(2 * Math.PI * phrase.root * t) * 0.42;
      const formant2 = Math.sin(2 * Math.PI * phrase.root * 2.1 * t) * 0.16;
      const airy = (Math.random() - 0.5) * 0.18;
      noiseLp += 0.08 * (airy - noiseLp);
      const stereo = channel === 0 ? 0.985 : 1.015;
      const tone = (formant1 + formant2 + noiseLp * 0.9) * attack * release * syllable * stereo;
      data[start + i] += tone * 0.58;
    }
  }
}

function addStereoRoom(data, sr, length, channel, gain = 0.04, rate = 0.16) {
  let state = 0;
  for (let i = 0; i < length; i++) {
    const t = i / sr;
    const noise = (Math.random() - 0.5) * gain;
    state += 0.02 * (noise - state);
    const mod = 0.72 + 0.28 * Math.sin(2 * Math.PI * rate * t + (channel === 0 ? 0 : 0.9));
    data[i] += state * mod;
  }
}
