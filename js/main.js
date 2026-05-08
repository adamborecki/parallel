import { AudioEngine } from './audio.js';
import { Visualizer } from './visualizer.js';
import { SOURCES } from './sources.js';
import { LESSONS } from './lessons.js';
import { QUESTIONS } from './quiz.js';
import { renderChallenge } from './challenge.js';

const engine = new AudioEngine();
let visualizer = null;
let initialized = false;

// Knob descriptors — slider value (0..1) <-> real value with display formatting.
const KNOBS = {
  threshold: {
    min: -60, max: 0, default: -24, unit: 'dB',
    fmt: (v) => `${v.toFixed(1)} dB`,
    apply: (v) => engine.setThresholdDb(v),
  },
  ratio: {
    min: 1, max: 20, default: 6, unit: ':1',
    fmt: (v) => `${v.toFixed(1)}:1`,
    apply: (v) => engine.setRatio(v),
  },
  attack: {
    min: 0.5, max: 100, default: 15, unit: 'ms', log: true,
    fmt: (v) => `${v.toFixed(1)} ms`,
    apply: (v) => engine.setAttackMs(v),
  },
  release: {
    min: 20, max: 1000, default: 180, unit: 'ms', log: true,
    fmt: (v) => `${v.toFixed(0)} ms`,
    apply: (v) => engine.setReleaseMs(v),
  },
  makeup: {
    min: 0, max: 24, default: 0, unit: 'dB',
    fmt: (v) => `${v.toFixed(1)} dB`,
    apply: (v) => engine.setMakeupDb(v),
  },
  blend: {
    min: 0, max: 1, default: 0.5, unit: '',
    fmt: (v) => `${Math.round(v * 100)}%`,
    apply: (v) => engine.setBlend(v),
  },
};

// Linear or log mapping between slider position [0..1] and real value.
function sliderToValue(knob, slider) {
  if (knob.log) {
    const lo = Math.log(knob.min);
    const hi = Math.log(knob.max);
    return Math.exp(lo + slider * (hi - lo));
  }
  return knob.min + slider * (knob.max - knob.min);
}
function valueToSlider(knob, value) {
  if (knob.log) {
    const lo = Math.log(knob.min);
    const hi = Math.log(knob.max);
    return (Math.log(value) - lo) / (hi - lo);
  }
  return (value - knob.min) / (knob.max - knob.min);
}

async function ensureInit() {
  if (initialized) return;
  initialized = true;
  await engine.init();
  applyAllDefaults();
  visualizer = new Visualizer(document.getElementById('viz'), engine);
  visualizer.start();
}

function applyAllDefaults() {
  for (const [name, knob] of Object.entries(KNOBS)) {
    setKnob(name, knob.default);
  }
}

function setKnob(name, value) {
  const knob = KNOBS[name];
  const slider = document.querySelector(`input[data-knob="${name}"]`);
  const readout = document.querySelector(`[data-readout="${name}"]`);
  if (slider) slider.value = String(valueToSlider(knob, value));
  if (readout) readout.textContent = knob.fmt(value);
  knob.apply(value);
}

function wireKnobs() {
  for (const [name, knob] of Object.entries(KNOBS)) {
    const slider = document.querySelector(`input[data-knob="${name}"]`);
    if (!slider) continue;
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.001';
    slider.addEventListener('input', async (e) => {
      await ensureInit();
      const v = sliderToValue(knob, parseFloat(e.target.value));
      const readout = document.querySelector(`[data-readout="${name}"]`);
      if (readout) readout.textContent = knob.fmt(v);
      knob.apply(v);
    });
  }
}

function wireSources() {
  const buttons = document.querySelectorAll('button[data-source]');
  for (const btn of buttons) {
    btn.addEventListener('click', async () => {
      await ensureInit();
      const id = btn.dataset.source;
      engine.setSource(id);
      for (const b of buttons) b.classList.toggle('active', b === btn);
    });
  }
}

function wireTransport() {
  const playBtn = document.getElementById('play-btn');
  const bypassBtn = document.getElementById('bypass-btn');

  playBtn.addEventListener('click', async () => {
    await ensureInit();
    await engine.toggle();
  });
  engine.onPlaybackChange((playing) => {
    playBtn.textContent = playing ? 'Stop' : 'Play';
    playBtn.classList.toggle('playing', playing);
  });

  bypassBtn.addEventListener('click', async () => {
    await ensureInit();
    const next = !engine.bypass;
    engine.setBypass(next);
    bypassBtn.classList.toggle('active', next);
    bypassBtn.textContent = next ? 'Bypassed (A)' : 'Bypass A/B';
  });
}

function wireTabs() {
  const tabs = document.querySelectorAll('.tab');
  const sections = document.querySelectorAll('.section');
  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      const id = tab.dataset.tab;
      for (const t of tabs) t.classList.toggle('active', t === tab);
      for (const s of sections) s.classList.toggle('active', s.id === `section-${id}`);
    });
  }
}

function applyPreset(p) {
  if (p.source) {
    engine.setSource(p.source);
    document.querySelectorAll('button[data-source]').forEach((b) => {
      b.classList.toggle('active', b.dataset.source === p.source);
    });
  }
  if (typeof p.threshold === 'number') setKnob('threshold', p.threshold);
  if (typeof p.ratio === 'number') setKnob('ratio', p.ratio);
  if (typeof p.attack === 'number') setKnob('attack', p.attack);
  if (typeof p.release === 'number') setKnob('release', p.release);
  if (typeof p.makeup === 'number') setKnob('makeup', p.makeup);
  if (typeof p.blend === 'number') setKnob('blend', p.blend);
  if (engine.bypass) {
    engine.setBypass(false);
    const bypassBtn = document.getElementById('bypass-btn');
    bypassBtn.classList.remove('active');
    bypassBtn.textContent = 'Bypass A/B';
  }
}

function renderLessons() {
  const container = document.getElementById('lessons-list');
  container.innerHTML = '';
  for (const lesson of LESSONS) {
    const card = document.createElement('article');
    card.className = 'lesson-card';
    card.innerHTML = `
      <h3>${lesson.title}</h3>
      <div class="lesson-body">${lesson.body}</div>
      <div class="preset-row">
        ${lesson.presets.map((p, i) => `<button class="preset-chip" data-preset="${lesson.id}:${i}">${p.label}</button>`).join('')}
      </div>
    `;
    container.appendChild(card);
  }
  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('button.preset-chip');
    if (!btn) return;
    const [lessonId, idx] = btn.dataset.preset.split(':');
    const preset = LESSONS.find((l) => l.id === lessonId).presets[parseInt(idx, 10)];
    await ensureInit();
    applyPreset(preset);
    if (!engine.playing) await engine.play();
  });
}

function renderQuiz() {
  const container = document.getElementById('quiz-list');
  container.innerHTML = '';
  let answered = 0;
  let correct = 0;

  QUESTIONS.forEach((q, qi) => {
    const card = document.createElement('article');
    card.className = 'quiz-card';
    card.innerHTML = `
      <p class="quiz-q">${qi + 1}. ${q.q}</p>
      <div class="quiz-options">
        ${q.options.map((opt, oi) => `
          <button class="quiz-option" data-q="${qi}" data-o="${oi}">${opt}</button>
        `).join('')}
      </div>
      <p class="quiz-explain" data-explain="${qi}" hidden></p>
    `;
    container.appendChild(card);
  });

  const score = document.getElementById('quiz-score');
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.quiz-option');
    if (!btn || btn.classList.contains('locked')) return;
    const qi = parseInt(btn.dataset.q, 10);
    const oi = parseInt(btn.dataset.o, 10);
    const q = QUESTIONS[qi];
    const card = btn.closest('.quiz-card');
    const isCorrect = oi === q.correct;

    card.querySelectorAll('.quiz-option').forEach((b) => {
      b.classList.add('locked');
      const bo = parseInt(b.dataset.o, 10);
      if (bo === q.correct) b.classList.add('correct');
      else if (b === btn) b.classList.add('wrong');
    });
    const explain = card.querySelector('.quiz-explain');
    explain.textContent = (isCorrect ? '✓ ' : '✗ ') + q.explain;
    explain.hidden = false;
    explain.classList.toggle('correct', isCorrect);
    explain.classList.toggle('wrong', !isCorrect);

    answered += 1;
    if (isCorrect) correct += 1;
    score.textContent = `${correct} / ${answered} correct`;
  });
}

function init() {
  wireKnobs();
  wireSources();
  wireTransport();
  wireTabs();
  renderLessons();
  renderQuiz();
  renderChallenge();

  // Set knob sliders to default position visually before audio init.
  for (const [name, knob] of Object.entries(KNOBS)) {
    const slider = document.querySelector(`input[data-knob="${name}"]`);
    const readout = document.querySelector(`[data-readout="${name}"]`);
    if (slider) slider.value = String(valueToSlider(knob, knob.default));
    if (readout) readout.textContent = knob.fmt(knob.default);
  }
}

document.addEventListener('DOMContentLoaded', init);
