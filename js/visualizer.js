// Visualizer — overlays the dry waveform and the post-blend waveform on
// one canvas, with a gain-reduction strip along the bottom. The point is
// to *see* the wet path filling in the quiet bits between dry transients.

export class Visualizer {
  constructor(canvas, engine) {
    this.canvas = canvas;
    this.engine = engine;
    this.ctx = canvas.getContext('2d');
    this.running = false;
    this._onResize = this._resize.bind(this);

    window.addEventListener('resize', this._onResize);
    this._resize();
  }

  start() {
    if (this.running) return;
    this.running = true;
    const tick = () => {
      if (!this.running) return;
      // Skip drawing while hidden — saves CPU when multiple visualizers
      // are mounted but only one card is active. offsetParent is null for
      // any element whose ancestor has display:none.
      if (this.canvas.offsetParent !== null) {
        this._draw();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
  }

  refresh() {
    this._resize();
  }

  _resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = rect.width;
    this.h = rect.height;
  }

  _draw() {
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    const meterH = 18;
    const waveH = h - meterH - 12;

    ctx.clearRect(0, 0, w, h);

    // Center reference line
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, waveH / 2);
    ctx.lineTo(w, waveH / 2);
    ctx.stroke();

    const dry = this.engine.getTimeDomain('dry');
    const blend = this.engine.getTimeDomain('blend');

    // Blend waveform — filled, back layer
    this._drawWave(blend, waveH, getCss('--blend'), 0.32, true);
    // Dry waveform — thin line on top
    this._drawWave(dry, waveH, getCss('--air'), 1.0, false);

    // Gain reduction strip
    const grDb = this.engine.getGainReductionDb();
    const grNorm = Math.min(1, grDb / 20);

    const meterY = h - meterH;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, meterY, w, meterH);

    // Gain reduction grows from the right edge leftward, matching how
    // hardware GR meters typically read (0 dB on the right, more reduction
    // to the left).
    if (grNorm > 0.001) {
      const grColor = grNorm < 0.3 ? getCss('--air')
        : grNorm < 0.6 ? getCss('--weight')
        : getCss('--punch');
      ctx.fillStyle = grColor;
      const barW = w * grNorm;
      ctx.fillRect(w - barW, meterY, barW, meterH);
    }

    // "0" mark on the right edge — that's where the bar departs from.
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '10px "IBM Plex Sans", system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    ctx.fillText('0', w - 6, meterY + meterH / 2);

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '11px "IBM Plex Sans", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      `Gain reduction · ${grDb.toFixed(1)} dB`,
      8,
      meterY + meterH / 2
    );
  }

  _drawWave(samples, height, color, alpha, fill) {
    const ctx = this.ctx;
    const w = this.w;
    const mid = height / 2;
    const step = samples.length / w;

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = fill ? 1 : 1.5;

    if (fill) {
      ctx.beginPath();
      ctx.moveTo(0, mid);
      for (let x = 0; x < w; x++) {
        const idx = Math.floor(x * step);
        const v = samples[idx] || 0;
        ctx.lineTo(x, mid + v * mid * 0.92);
      }
      ctx.lineTo(w, mid);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const idx = Math.floor(x * step);
        const v = samples[idx] || 0;
        const y = mid + v * mid * 0.92;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }
}

function getCss(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}
