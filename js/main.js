import { AudioEngine } from './audio.js';
import { Visualizer } from './visualizer.js';
import { LESSONS } from './lessons.js';
import { QUESTIONS } from './quiz.js';
import { PLAYGROUND_PRESETS } from './presets.js';
import { renderChallenge } from './challenge.js';
import {
  recordSectionEntry,
  recordLessonAnswer,
  recordMainAnswer,
} from './progress.js';

const engine = new AudioEngine();
const visualizers = [];
let initialized = false;

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
  // Bind a Visualizer to every canvas we rendered.
  document.querySelectorAll('canvas.viz').forEach((c) => attachVisualizer(c));
}

function attachVisualizer(canvas) {
  if (canvas.dataset.vizBound === '1') return;
  canvas.dataset.vizBound = '1';
  const v = new Visualizer(canvas, engine);
  v.start();
  visualizers.push(v);
}

function applyAllDefaults() {
  for (const [name, knob] of Object.entries(KNOBS)) {
    setKnob(name, knob.default);
  }
}

// Updates every sibling slider with the same data-knob so the playground
// and challenge controls stay in sync.
function setKnob(name, value) {
  const knob = KNOBS[name];
  document.querySelectorAll(`input[data-knob="${name}"]`).forEach((slider) => {
    slider.value = String(valueToSlider(knob, value));
  });
  document.querySelectorAll(`[data-readout="${name}"]`).forEach((el) => {
    el.textContent = knob.fmt(value);
  });
  knob.apply(value);
}

function wireKnobs() {
  for (const [name, knob] of Object.entries(KNOBS)) {
    const sliders = document.querySelectorAll(`input[data-knob="${name}"]`);
    sliders.forEach((slider) => {
      slider.min = '0';
      slider.max = '1';
      slider.step = '0.001';
      slider.addEventListener('input', async (e) => {
        await ensureInit();
        const v = sliderToValue(knob, parseFloat(e.target.value));
        // Mirror to every readout + sibling slider.
        document.querySelectorAll(`[data-readout="${name}"]`).forEach((el) => {
          el.textContent = knob.fmt(v);
        });
        sliders.forEach((s) => { if (s !== e.target) s.value = e.target.value; });
        knob.apply(v);
      });
    });
  }
}

function wireSources() {
  const allButtons = document.querySelectorAll('button[data-source]');
  allButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      await ensureInit();
      const id = btn.dataset.source;
      engine.setSource(id);
      document.querySelectorAll('button[data-source]').forEach((b) => {
        b.classList.toggle('active', b.dataset.source === id);
      });
    });
  });
}

function wireTransport() {
  const playButtons = document.querySelectorAll('.play-btn');
  const bypassButtons = document.querySelectorAll('.bypass-btn');

  playButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      await ensureInit();
      await engine.toggle();
    });
  });

  engine.onPlaybackChange((playing) => {
    playButtons.forEach((b) => {
      b.textContent = playing ? 'Stop' : 'Play';
      b.classList.toggle('playing', playing);
    });
  });

  bypassButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      await ensureInit();
      const next = !engine.bypass;
      engine.setBypass(next);
      bypassButtons.forEach((b) => {
        b.classList.toggle('active', next);
        b.textContent = next ? 'Bypassed (A)' : 'Bypass A/B';
      });
    });
  });
}

function wireTabs() {
  const tabs = document.querySelectorAll('.tab');
  const sections = document.querySelectorAll('.section');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const id = tab.dataset.tab;
      tabs.forEach((t) => t.classList.toggle('active', t === tab));
      sections.forEach((s) => s.classList.toggle('active', s.id === `section-${id}`));
      recordSectionEntry(id);
      // Newly-visible canvases need to re-measure (they had 0 width while hidden).
      requestAnimationFrame(() => visualizers.forEach((v) => v.refresh()));
    });
  });
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
    document.querySelectorAll('.bypass-btn').forEach((b) => {
      b.classList.remove('active');
      b.textContent = 'Bypass A/B';
    });
  }
}

// Fisher-Yates shuffle that also remaps a "correct" index so the right
// answer doesn't always land in slot A.
function shuffleQuestion(question) {
  const indices = question.options.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  // If shuffle happened to leave the correct answer in slot 0, retry once
  // — keeps "A" from feeling like the lazy default across the page.
  if (indices.indexOf(question.correct) === 0 && indices.length > 1) {
    const swap = 1 + Math.floor(Math.random() * (indices.length - 1));
    [indices[0], indices[swap]] = [indices[swap], indices[0]];
  }
  return {
    options: indices.map((i) => question.options[i]),
    correct: indices.indexOf(question.correct),
    explain: question.explain,
    q: question.q,
    originalCorrect: question.correct,
  };
}

function renderPresetBar(container, presets) {
  container.innerHTML = presets.map((p) =>
    `<button class="preset-chip" data-preset-id="${p.id}" title="${p.blurb}">${p.label}</button>`
  ).join('');
  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('button.preset-chip');
    if (!btn) return;
    const preset = PLAYGROUND_PRESETS.find((p) => p.id === btn.dataset.presetId);
    if (!preset) return;
    await ensureInit();
    applyPreset(preset);
    if (!engine.playing) await engine.play();
    container.querySelectorAll('.preset-chip').forEach((c) => {
      c.classList.toggle('active', c === btn);
    });
  });
}

let activeLessonId = LESSONS[0].id;
const lessonQuizState = {};

function renderLessonTabs() {
  const nav = document.getElementById('lesson-tabs');
  nav.innerHTML = LESSONS.map((l) =>
    `<button class="lesson-tab${l.id === activeLessonId ? ' active' : ''}" data-lesson-tab="${l.id}">${l.shortLabel}</button>`
  ).join('');
  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('button.lesson-tab');
    if (!btn) return;
    activeLessonId = btn.dataset.lessonTab;
    nav.querySelectorAll('.lesson-tab').forEach((t) => {
      t.classList.toggle('active', t.dataset.lessonTab === activeLessonId);
    });
    showActiveLesson();
  });
}

function showActiveLesson() {
  document.querySelectorAll('.lesson-card').forEach((card) => {
    card.classList.toggle('active', card.dataset.lesson === activeLessonId);
  });
  // Re-measure the newly-visible canvas now that it has real dimensions.
  requestAnimationFrame(() => visualizers.forEach((v) => v.refresh()));
}

function renderLessons() {
  const container = document.getElementById('lesson-content');
  container.innerHTML = '';

  for (const lesson of LESSONS) {
    const shuffled = shuffleQuestion(lesson.question);
    lessonQuizState[lesson.id] = { shuffled, answered: false };

    const card = document.createElement('article');
    card.className = 'lesson-card';
    card.dataset.lesson = lesson.id;
    if (lesson.id === activeLessonId) card.classList.add('active');
    card.innerHTML = `
      <h3>${lesson.title}</h3>
      <div class="lesson-body">${lesson.body}</div>

      <div class="lesson-player">
        <div class="lesson-transport">
          <button class="play-btn btn-primary">Play</button>
          <span class="lesson-transport-hint">Press play to hear the current preset. Pick a chip below to snap settings.</span>
        </div>
        <div class="viz-wrap compact">
          <canvas class="viz lesson-viz"></canvas>
        </div>
      </div>

      <div class="preset-row">
        ${lesson.presets.map((p, i) => `<button class="preset-chip" data-preset="${lesson.id}:${i}">${p.label}</button>`).join('')}
      </div>

      <div class="lesson-quiz" data-lesson-quiz="${lesson.id}">
        <p class="quiz-q">Check yourself: ${shuffled.q}</p>
        <div class="quiz-options">
          ${shuffled.options.map((opt, oi) =>
            `<button class="quiz-option" data-lesson="${lesson.id}" data-o="${oi}">${opt}</button>`
          ).join('')}
        </div>
        <p class="quiz-explain" hidden></p>
      </div>
    `;
    container.appendChild(card);
  }

  // Preset chips inside lesson cards
  container.addEventListener('click', async (e) => {
    const chip = e.target.closest('button.preset-chip');
    if (chip && chip.dataset.preset) {
      const [lessonId, idx] = chip.dataset.preset.split(':');
      const preset = LESSONS.find((l) => l.id === lessonId).presets[parseInt(idx, 10)];
      await ensureInit();
      applyPreset(preset);
      if (!engine.playing) await engine.play();
      // Mark this chip as the active selection within its card.
      chip.parentElement.querySelectorAll('.preset-chip').forEach((c) => {
        c.classList.toggle('active', c === chip);
      });
      return;
    }

    const opt = e.target.closest('.quiz-option[data-lesson]');
    if (opt) handleLessonAnswer(opt);
  });
}

function handleLessonAnswer(btn) {
  if (btn.classList.contains('locked')) return;
  const lessonId = btn.dataset.lesson;
  const state = lessonQuizState[lessonId];
  if (!state || state.answered) return;

  const oi = parseInt(btn.dataset.o, 10);
  const correctIdx = state.shuffled.correct;
  const isCorrect = oi === correctIdx;
  const card = btn.closest('.lesson-quiz');

  card.querySelectorAll('.quiz-option').forEach((b) => {
    b.classList.add('locked');
    const bo = parseInt(b.dataset.o, 10);
    if (bo === correctIdx) b.classList.add('correct');
    else if (b === btn) b.classList.add('wrong');
  });

  const explain = card.querySelector('.quiz-explain');
  explain.textContent = (isCorrect ? '✓ ' : '✗ ') + state.shuffled.explain;
  explain.hidden = false;
  explain.classList.toggle('correct', isCorrect);
  explain.classList.toggle('wrong', !isCorrect);

  state.answered = true;
  recordLessonAnswer(lessonId, {
    selectedIndex: oi,
    correctIndex: correctIdx,
    correct: isCorrect,
    selectedLabel: state.shuffled.options[oi],
    correctLabel: state.shuffled.options[correctIdx],
  });
}

const mainQuizState = {};

function renderQuiz() {
  const container = document.getElementById('quiz-list');
  container.innerHTML = '';
  let answered = 0;
  let correct = 0;

  QUESTIONS.forEach((q, qi) => {
    const shuffled = shuffleQuestion(q);
    mainQuizState[qi] = { shuffled, answered: false };

    const card = document.createElement('article');
    card.className = 'quiz-card';
    card.innerHTML = `
      <p class="quiz-q">${qi + 1}. ${shuffled.q}</p>
      <div class="quiz-options">
        ${shuffled.options.map((opt, oi) => `
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
    const state = mainQuizState[qi];
    if (state.answered) return;
    const oi = parseInt(btn.dataset.o, 10);
    const correctIdx = state.shuffled.correct;
    const isCorrect = oi === correctIdx;

    const card = btn.closest('.quiz-card');
    card.querySelectorAll('.quiz-option').forEach((b) => {
      b.classList.add('locked');
      const bo = parseInt(b.dataset.o, 10);
      if (bo === correctIdx) b.classList.add('correct');
      else if (b === btn) b.classList.add('wrong');
    });
    const explain = card.querySelector('.quiz-explain');
    explain.textContent = (isCorrect ? '✓ ' : '✗ ') + state.shuffled.explain;
    explain.hidden = false;
    explain.classList.toggle('correct', isCorrect);
    explain.classList.toggle('wrong', !isCorrect);

    state.answered = true;
    answered += 1;
    if (isCorrect) correct += 1;
    score.textContent = `${correct} / ${answered} correct`;
    recordMainAnswer(qi, {
      selectedIndex: oi,
      correctIndex: correctIdx,
      correct: isCorrect,
      selectedLabel: state.shuffled.options[oi],
      correctLabel: state.shuffled.options[correctIdx],
      question: state.shuffled.q,
    });
  });
}

function renderPresetBars() {
  document.querySelectorAll('[data-preset-bar]').forEach((bar) => {
    renderPresetBar(bar, PLAYGROUND_PRESETS);
  });
}

function init() {
  renderLessonTabs();
  renderLessons();
  renderPresetBars();
  renderQuiz();
  renderChallenge();

  wireKnobs();
  wireSources();
  wireTransport();
  wireTabs();

  // Visual defaults before audio init so sliders aren't empty.
  for (const [name, knob] of Object.entries(KNOBS)) {
    document.querySelectorAll(`input[data-knob="${name}"]`).forEach((slider) => {
      slider.value = String(valueToSlider(knob, knob.default));
    });
    document.querySelectorAll(`[data-readout="${name}"]`).forEach((el) => {
      el.textContent = knob.fmt(knob.default);
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
