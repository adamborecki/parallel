const HISTORY_SECONDS = 3.8;
const METER_HZ = 30;
const HISTORY_LENGTH = Math.ceil(HISTORY_SECONDS * METER_HZ);

const COLORS = {
  dry: '#f5f1e8',
  wet: '#6ea8fe',
  blend: '#ff7a59',
  threshold: '#ffb703',
  envelope: '#80ffdb',
  baseline: 'rgba(245, 241, 232, 0.5)',
  lift: 'rgba(255, 183, 3, 0.85)',
  grid: 'rgba(255,255,255,0.08)',
  gridStrong: 'rgba(255,255,255,0.14)',
  text: 'rgba(255,255,255,0.56)',
};

export class Visualizer {
  constructor(engine) {
    this.engine = engine;
    this.signalsCanvas = document.getElementById('signals-canvas');
    this.detectorCanvas = document.getElementById('detector-canvas');
    this.blendCanvas = document.getElementById('blend-canvas');
    this.grFill = document.getElementById('gr-meter-fill');
    this.grValue = document.getElementById('gr-value');
    this.mixValue = document.getElementById('mix-value');
    this.wetValue = document.getElementById('wet-value');

    this.envHistory = new Array(HISTORY_LENGTH).fill(-60);
    this.thresholdHistory = new Array(HISTORY_LENGTH).fill(-30);
    this.wetHistory = new Array(HISTORY_LENGTH).fill(0);
    this.addedHistory = new Array(HISTORY_LENGTH).fill(0);

    this.running = false;
    this.rafId = null;

    this._resize();
    window.addEventListener('resize', () => this._resize());
    engine.onMeter((meter) => this._onMeter(meter));
  }

  _resize() {
    const dpr = window.devicePixelRatio || 1;
    for (const canvas of [this.signalsCanvas, this.detectorCanvas, this.blendCanvas]) {
      if (!canvas) continue;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      const ctx = canvas.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      canvas._cssWidth = rect.width;
      canvas._cssHeight = rect.height;
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._loop();
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  _onMeter(meter) {
    const wetContribution = meter.wetGain * this.engine.getBlend();

    this.envHistory.push(meter.envDb);
    this.envHistory.shift();
    this.thresholdHistory.push(meter.threshold);
    this.thresholdHistory.shift();
    this.wetHistory.push(meter.wetGain);
    this.wetHistory.shift();
    this.addedHistory.push(wetContribution);
    this.addedHistory.shift();

    const gr = Math.max(0, meter.grDb);
    this.grFill.style.height = `${Math.min(100, (gr / 24) * 100)}%`;
    this.grValue.textContent = gr.toFixed(1);
    this.mixValue.textContent = Math.round(this.engine.getBlend() * 100);
    this.wetValue.textContent = meter.wetGain.toFixed(2);
  }

  _loop() {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(() => this._loop());
    this._drawSignals();
    this._drawDetector();
    this._drawBlend();
  }

  _drawSignals() {
    const canvas = this.signalsCanvas;
    const ctx = canvas.getContext('2d');
    const width = canvas._cssWidth;
    const height = canvas._cssHeight;
    ctx.clearRect(0, 0, width, height);

    const laneHeight = height / 3;
    this._drawSignalLane(ctx, 0, laneHeight, 'DRY PATH', this.engine.getTimeDomain('dry'), COLORS.dry);
    this._drawSignalLane(ctx, laneHeight, laneHeight, 'CRUSHED PATH', this.engine.getTimeDomain('wet'), COLORS.wet);
    this._drawSignalLane(ctx, laneHeight * 2, laneHeight, 'FINAL BLEND', this.engine.getTimeDomain('blend'), COLORS.blend);
  }

  _drawSignalLane(ctx, top, height, label, data, color) {
    const width = this.signalsCanvas._cssWidth;
    const half = height / 2;
    const mid = top + half;

    ctx.strokeStyle = COLORS.grid;
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(width, mid);
    ctx.stroke();

    ctx.fillStyle = COLORS.text;
    ctx.font = '10px "IBM Plex Sans", sans-serif';
    ctx.fillText(label, 8, top + 12);

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    const step = data.length / width;
    for (let x = 0; x < width; x++) {
      const index = Math.floor(x * step);
      const sample = Math.max(-1, Math.min(1, data[index] || 0));
      const y = mid - sample * half * 0.76;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  _drawDetector() {
    const canvas = this.detectorCanvas;
    const ctx = canvas.getContext('2d');
    const width = canvas._cssWidth;
    const height = canvas._cssHeight;
    ctx.clearRect(0, 0, width, height);

    const dbMin = -60;
    const dbMax = 0;
    const toY = (db) => {
      const t = (db - dbMin) / (dbMax - dbMin);
      return height - t * height;
    };

    ctx.font = '9px "IBM Plex Sans", sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.strokeStyle = COLORS.grid;

    for (const db of [-12, -24, -36, -48]) {
      const y = toY(db);
      ctx.beginPath();
      ctx.moveTo(28, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.fillText(`${db}`, 4, y + 3);
    }

    const threshold = this.thresholdHistory[this.thresholdHistory.length - 1] ?? -30;
    const thresholdY = toY(threshold);
    ctx.strokeStyle = COLORS.threshold;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(28, thresholdY);
    ctx.lineTo(width, thresholdY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = COLORS.envelope;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    const usableWidth = width - 28;
    for (let i = 0; i < this.envHistory.length; i++) {
      const x = 28 + (i / (this.envHistory.length - 1)) * usableWidth;
      const y = toY(Math.max(dbMin, Math.min(dbMax, this.envHistory[i])));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  _drawBlend() {
    const canvas = this.blendCanvas;
    const ctx = canvas.getContext('2d');
    const width = canvas._cssWidth;
    const height = canvas._cssHeight;
    ctx.clearRect(0, 0, width, height);

    const maxValue = 2.2;
    const toY = (value) => height - (Math.max(0, Math.min(maxValue, value)) / maxValue) * height;
    const unityY = toY(1);

    ctx.font = '9px "IBM Plex Sans", sans-serif';
    ctx.fillStyle = COLORS.text;

    for (const value of [0.5, 1.0, 1.5, 2.0]) {
      const y = toY(value);
      ctx.strokeStyle = value === 1.0 ? COLORS.gridStrong : COLORS.grid;
      ctx.beginPath();
      ctx.moveTo(28, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.fillText(`${value.toFixed(1)}x`, 3, y + 3);
    }

    ctx.strokeStyle = COLORS.baseline;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(28, unityY);
    ctx.lineTo(width, unityY);
    ctx.stroke();

    const usableWidth = width - 28;
    ctx.fillStyle = 'rgba(255, 183, 3, 0.18)';
    ctx.beginPath();
    ctx.moveTo(28, unityY);
    for (let i = 0; i < this.addedHistory.length; i++) {
      const x = 28 + (i / (this.addedHistory.length - 1)) * usableWidth;
      const value = 1 + this.addedHistory[i];
      ctx.lineTo(x, toY(value));
    }
    ctx.lineTo(28 + usableWidth, unityY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = COLORS.lift;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < this.addedHistory.length; i++) {
      const x = 28 + (i / (this.addedHistory.length - 1)) * usableWidth;
      const value = 1 + this.addedHistory[i];
      const y = toY(value);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}
