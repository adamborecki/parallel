// AudioEngine — splits a source into a dry path and a compressed wet path,
// then sums them through a safety limiter to the destination.
//
//   source ─┬─► dryGain ─────────────────────► sumGain ─► limiter ─► out
//           │                                      ▲
//           └─► compressor ─► makeup ─► wetGain ───┘
//
// All compressor params are wired straight to the DynamicsCompressorNode's
// AudioParams so changes ramp natively. `compressor.reduction` gives the
// gain-reduction in dB for the visualizer — no envelope-following on our end.

import { buildBuffers } from './sources.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.buffers = {};
    this.sourceId = 'drums';
    this.sourceNode = null;
    this.playing = false;
    this.bypass = false;
    this.blend = 0.5;
    this.playbackListeners = [];
  }

  async init() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
    this.buffers = buildBuffers(this.ctx);
    this._buildGraph();
  }

  _buildGraph() {
    const ctx = this.ctx;

    // Analysers tap the dry pre-split signal and the post-blend sum.
    this.dryAnalyser = ctx.createAnalyser();
    this.blendAnalyser = ctx.createAnalyser();
    for (const a of [this.dryAnalyser, this.blendAnalyser]) {
      a.fftSize = 2048;
      a.smoothingTimeConstant = 0.6;
    }

    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.makeupGain = ctx.createGain();
    this.makeupGain.gain.value = 1;

    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.ratio.value = 6;
    this.compressor.attack.value = 0.015;
    this.compressor.release.value = 0.18;
    this.compressor.knee.value = 6;

    this.sumGain = ctx.createGain();

    // Safety limiter — students never see this; it just keeps the master
    // from clipping when they push makeup gain.
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -1;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.001;
    this.limiter.release.value = 0.1;
    this.limiter.knee.value = 0;

    this.master = ctx.createGain();
    this.master.gain.value = 0.85;

    // Source connects into dryAnalyser; dryAnalyser fans out to dry path
    // and to the compressor input.
    this.dryAnalyser.connect(this.dryGain);
    this.dryAnalyser.connect(this.compressor);
    this.compressor.connect(this.makeupGain);
    this.makeupGain.connect(this.wetGain);

    this.dryGain.connect(this.sumGain);
    this.wetGain.connect(this.sumGain);

    this.sumGain.connect(this.blendAnalyser);
    this.blendAnalyser.connect(this.limiter);
    this.limiter.connect(this.master);
    this.master.connect(ctx.destination);

    this._refreshMix();
  }

  // Equal-power-ish crossfade between dry and wet. At blend=0.5 each path
  // is at ~0.71, summing to roughly unity perceived loudness.
  _refreshMix() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const blend = this.bypass ? 0 : this.blend;
    const dry = Math.cos(blend * Math.PI / 2);
    const wet = Math.sin(blend * Math.PI / 2);
    this.dryGain.gain.setTargetAtTime(dry, t, 0.01);
    this.wetGain.gain.setTargetAtTime(wet, t, 0.01);
  }

  async play() {
    if (this.playing) return;
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this._startSource();
    this.playing = true;
    this._emitPlayback();
  }

  stop() {
    if (!this.playing) return;
    this._stopSource();
    this.playing = false;
    this._emitPlayback();
  }

  async toggle() {
    if (this.playing) this.stop();
    else await this.play();
  }

  setSource(id) {
    if (!this.buffers[id]) return;
    this.sourceId = id;
    if (this.playing) {
      this._stopSource();
      this._startSource();
    }
  }

  _startSource() {
    const node = this.ctx.createBufferSource();
    node.buffer = this.buffers[this.sourceId];
    node.loop = true;
    node.connect(this.dryAnalyser);
    node.start();
    this.sourceNode = node;
  }

  _stopSource() {
    try { this.sourceNode?.stop(); } catch {}
    try { this.sourceNode?.disconnect(); } catch {}
    this.sourceNode = null;
  }

  setThresholdDb(db) {
    this.compressor.threshold.setTargetAtTime(db, this.ctx.currentTime, 0.01);
  }
  setRatio(ratio) {
    this.compressor.ratio.setTargetAtTime(ratio, this.ctx.currentTime, 0.01);
  }
  setAttackMs(ms) {
    this.compressor.attack.setTargetAtTime(ms / 1000, this.ctx.currentTime, 0.01);
  }
  setReleaseMs(ms) {
    this.compressor.release.setTargetAtTime(ms / 1000, this.ctx.currentTime, 0.01);
  }
  setMakeupDb(db) {
    const lin = Math.pow(10, db / 20);
    this.makeupGain.gain.setTargetAtTime(lin, this.ctx.currentTime, 0.02);
  }

  setBlend(value) {
    this.blend = Math.max(0, Math.min(1, value));
    this._refreshMix();
  }

  setBypass(on) {
    this.bypass = !!on;
    this._refreshMix();
  }

  // Returns gain-reduction in dB as a positive number (e.g. 12 means -12 dB).
  // DynamicsCompressorNode.reduction is negative or zero.
  getGainReductionDb() {
    return Math.max(0, -this.compressor.reduction);
  }

  getTimeDomain(which) {
    const a = which === 'dry' ? this.dryAnalyser : this.blendAnalyser;
    const buf = new Float32Array(a.fftSize);
    a.getFloatTimeDomainData(buf);
    return buf;
  }

  onPlaybackChange(fn) { this.playbackListeners.push(fn); }
  _emitPlayback() { for (const fn of this.playbackListeners) fn(this.playing); }
}
