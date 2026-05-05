import { AudioEngine } from './audio-engine.js';
import { Visualizer } from './visualizer.js';
import { LESSONS } from './lessons.js';
import { QUESTIONS } from './quiz.js';

const LS_KEY = 'parallel.state.v1';

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveState(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}

const state = Object.assign({
  score: 0,
  bestQuizPct: 0,
  lessonProgress: {},
  lessonAnswers: {},
  challengeDraft: {},
}, loadState());

const Knobs = {
  attackMs: {
    sliderToVal: (slider) => 0.1 * Math.pow(2000, slider),
    valToSlider: (value) => Math.log(value / 0.1) / Math.log(2000),
    format: (value) => value < 1 ? `${value.toFixed(2)} ms` : `${value.toFixed(1)} ms`,
  },
  releaseMs: {
    sliderToVal: (slider) => 10 * Math.pow(250, slider),
    valToSlider: (value) => Math.log(value / 10) / Math.log(250),
    format: (value) => value < 100 ? `${value.toFixed(0)} ms` : `${value.toFixed(0)} ms`,
  },
};

const CONTROL_MAP = {
  threshold: { slider: 'k-threshold', label: 'Threshold' },
  ratio: { slider: 'k-ratio', label: 'Ratio' },
  attack: { slider: 'k-attack', label: 'Attack' },
  attackMs: { slider: 'k-attack', label: 'Attack' },
  release: { slider: 'k-release', label: 'Release' },
  releaseMs: { slider: 'k-release', label: 'Release' },
  makeup: { slider: 'k-makeup', label: 'Wet Makeup' },
  makeupDb: { slider: 'k-makeup', label: 'Wet Makeup' },
  blend: { slider: 'k-blend', label: 'Blend' },
};

const USECASES = {
  nyDrums: {
    label: 'NY Drums',
    source: 'drums',
    threshold: -30,
    ratio: 8,
    attackMs: 22,
    releaseMs: 160,
    makeupDb: 10,
    blend: 0.42,
    copyTitle: 'NY Drums',
    copyText: 'Aggressive compression on a duplicate drum bus, then mixed back in to add smack and body without deleting the original transient snap.',
    listen: 'The dry hits stay punchy while the crushed path fattens the tail, room, and sustain.',
    mistake: 'Too much blend makes the kit sound smaller and flatter instead of bigger.',
  },
  vocalDensity: {
    label: 'Vocal Density',
    source: 'vocal',
    threshold: -32,
    ratio: 6,
    attackMs: 8,
    releaseMs: 120,
    makeupDb: 8,
    blend: 0.24,
    copyTitle: 'Vocal Density',
    copyText: 'A compressed duplicate under the lead vocal helps quieter syllables and breathy detail stay present without crushing the main vocal line.',
    listen: 'As Blend comes up, the vocal feels steadier and more “finished” before it starts feeling obviously squashed.',
    mistake: 'If the blend is too high, breaths and consonants jump forward in a distracting way.',
  },
  mixLift: {
    label: 'Mix Lift',
    source: 'mix',
    threshold: -24,
    ratio: 4,
    attackMs: 28,
    releaseMs: 180,
    makeupDb: 5,
    blend: 0.16,
    copyTitle: 'Mix Lift',
    copyText: 'A tiny amount of parallel compression on a full mix can add weight, but it should be subtle enough that the music still breathes normally.',
    listen: 'Look for a little extra confidence and weight, not obvious pumping or loss of depth.',
    mistake: 'Too much full-mix parallel compression crowds the center and makes everything feel smaller.',
  },
  roomCrush: {
    label: 'Room Crush',
    source: 'room',
    threshold: -36,
    ratio: 12,
    attackMs: 12,
    releaseMs: 260,
    makeupDb: 12,
    blend: 0.55,
    copyTitle: 'Room Crush',
    copyText: 'This is the dramatic version: smash a room-like signal and use it as color so the groove feels larger-than-life.',
    listen: 'The room swell and cymbal wash should feel exciting, but the crushed ambience should not completely swallow the groove.',
    mistake: 'If this takes over, the source turns into noise and splash rather than energy.',
  },
};

const PRESETS = {
  subtle: { threshold: -22, ratio: 3, attackMs: 28, releaseMs: 180, makeupDb: 4, blend: 0.15 },
  classic: { threshold: -30, ratio: 8, attackMs: 22, releaseMs: 160, makeupDb: 10, blend: 0.42 },
  smash: { threshold: -38, ratio: 14, attackMs: 10, releaseMs: 230, makeupDb: 14, blend: 0.62 },
  reset: { threshold: -26, ratio: 4, attackMs: 20, releaseMs: 140, makeupDb: 6, blend: 0.25 },
};

class App {
  constructor() {
    this.engine = new AudioEngine();
    this.visualizer = null;
    this.currentMode = 'guided';
    this.currentUseCase = 'nyDrums';
    this.lessonIndex = 0;
    this.stepIndex = 0;
    this.params = {
      threshold: -30,
      ratio: 8,
      attackMs: 22,
      releaseMs: 160,
      makeupDb: 10,
      blend: 0.42,
    };
    this.quizQuestions = [];
    this.quizIndex = 0;
    this.quizScore = 0;
  }

  async start() {
    document.getElementById('start-btn').addEventListener('click', () => this._begin());
  }

  async _begin() {
    this._showScreen('loading');
    const loadingText = document.getElementById('loading-text');
    try {
      await this.engine.init((message) => {
        loadingText.textContent = message;
      });
    } catch (error) {
      loadingText.textContent = `Audio init failed: ${error.message}`;
      console.error(error);
      return;
    }

    this.visualizer = new Visualizer(this.engine);
    this._wire();
    this._renderLessonList();
    this._restoreChallengeDraft();
    this._applySavedState();
    this._loadUseCase(this.currentUseCase);
    this._showScreen('main-app');
    this.visualizer.start();
  }

  _wire() {
    document.querySelectorAll('.mode-tab').forEach((tab) => {
      tab.addEventListener('click', () => this._setMode(tab.dataset.mode));
    });

    document.querySelectorAll('.source-btn').forEach((button) => {
      button.addEventListener('click', () => this._setSource(button.dataset.source));
    });

    this.engine.onPlaybackChange(() => this._updatePlayButton());

    document.getElementById('play-btn').addEventListener('click', async () => {
      await this.engine.togglePlay();
      this._updatePlayButton();
    });

    document.getElementById('stop-btn').addEventListener('click', () => {
      this.engine.stop();
      this._updatePlayButton();
    });

    document.getElementById('loop-toggle').addEventListener('change', (event) => {
      this.engine.setLoop(event.target.checked);
    });

    document.getElementById('bypass-toggle').addEventListener('change', (event) => {
      this.engine.setBypass(event.target.checked);
    });

    document.getElementById('wet-solo-toggle').addEventListener('change', (event) => {
      this.engine.setWetSolo(event.target.checked);
    });

    const volumeSlider = document.getElementById('master-volume');
    const volumeLabel = document.getElementById('volume-label');
    volumeSlider.addEventListener('input', () => {
      const value = parseFloat(volumeSlider.value);
      this.engine.setMasterVolume(value);
      volumeLabel.textContent = `${Math.round(value * 100)}%`;
    });

    this._wireLinearKnob('threshold', 'k-threshold', 'k-threshold-val', (value) => `${value.toFixed(1)}`, (value) => {
      this.engine.setParam('threshold', value);
    });
    this._wireLinearKnob('ratio', 'k-ratio', 'k-ratio-val', (value) => `${value.toFixed(1)}`, (value) => {
      this.engine.setParam('ratio', value);
    });
    this._wireMappedKnob('attackMs', 'k-attack', 'k-attack-val', (value) => {
      this.engine.setParam('attackMs', value);
    });
    this._wireMappedKnob('releaseMs', 'k-release', 'k-release-val', (value) => {
      this.engine.setParam('releaseMs', value);
    });
    this._wireLinearKnob('makeupDb', 'k-makeup', 'k-makeup-val', (value) => `${value.toFixed(1)}`, (value) => {
      this.engine.setParam('makeupDb', value);
    });
    this._wireBlendKnob();

    document.querySelectorAll('.usecase-btn').forEach((button) => {
      button.addEventListener('click', () => this._loadUseCase(button.dataset.usecase));
    });

    document.querySelectorAll('.preset-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const preset = PRESETS[button.dataset.preset];
        if (!preset) return;
        this._applyParams(preset);
      });
    });

    document.getElementById('prev-step-btn').addEventListener('click', () => this._stepDelta(-1));
    document.getElementById('next-step-btn').addEventListener('click', () => this._stepDelta(1));

    document.getElementById('quiz-start-btn').addEventListener('click', () => this._quizStart());
    document.getElementById('quiz-next-btn').addEventListener('click', () => this._quizNext());
    document.getElementById('quiz-retry-btn').addEventListener('click', () => this._quizReset());

    document.getElementById('challenge-generate').addEventListener('click', () => this._generateChallengeSummary());
    document.getElementById('challenge-copy').addEventListener('click', () => this._copyChallengeSummary());

    for (const id of ['ch-name', 'ch-usecase', 'ch-concept', 'ch-settings', 'ch-listen', 'ch-mistake']) {
      document.getElementById(id).addEventListener('input', () => this._storeChallengeDraft());
    }

    document.addEventListener('keydown', async (event) => {
      if (event.target.matches('input, textarea, select')) return;
      if (event.code === 'Space') {
        event.preventDefault();
        await this.engine.togglePlay();
        this._updatePlayButton();
      }
    });

    if (state.bestQuizPct > 0) {
      document.getElementById('quiz-best-score').classList.remove('hidden');
      document.getElementById('best-score-val').textContent = Math.round(state.bestQuizPct);
    }
  }

  _wireLinearKnob(paramName, sliderId, labelId, format, onChange) {
    const slider = document.getElementById(sliderId);
    const label = document.getElementById(labelId);
    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      this.params[paramName] = value;
      label.textContent = format(value);
      onChange(value);
    });
    label.textContent = format(parseFloat(slider.value));
  }

  _wireMappedKnob(paramName, sliderId, labelId, onChange) {
    const slider = document.getElementById(sliderId);
    const label = document.getElementById(labelId);
    slider.addEventListener('input', () => {
      const value = Knobs[paramName].sliderToVal(parseFloat(slider.value));
      this.params[paramName] = value;
      label.textContent = Knobs[paramName].format(value);
      onChange(value);
    });
    const initial = Knobs[paramName].sliderToVal(parseFloat(slider.value));
    label.textContent = Knobs[paramName].format(initial);
  }

  _wireBlendKnob() {
    const slider = document.getElementById('k-blend');
    const label = document.getElementById('k-blend-val');
    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      this.params.blend = value / 100;
      label.textContent = `${Math.round(value)}`;
      this.engine.setBlend(this.params.blend);
    });
    label.textContent = slider.value;
  }

  _applySavedState() {
    document.getElementById('total-score').textContent = state.score;

    let latestLesson = 0;
    let latestStep = 0;
    LESSONS.forEach((lesson, lessonIndex) => {
      const progress = state.lessonProgress[lesson.id];
      if (progress && (lessonIndex > latestLesson || (lessonIndex === latestLesson && progress.step > latestStep))) {
        latestLesson = lessonIndex;
        latestStep = progress.step;
      }
    });

    this.lessonIndex = latestLesson;
    this.stepIndex = latestStep;
    this._renderLesson();
  }

  _showScreen(screenId) {
    document.querySelectorAll('.screen').forEach((screen) => {
      screen.classList.toggle('active', screen.id === screenId);
    });
  }

  _setMode(mode) {
    this.currentMode = mode;
    document.querySelectorAll('.mode-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.mode === mode);
    });
    document.querySelectorAll('.content-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.id === `${mode}-panel`);
    });
  }

  _setSource(sourceId) {
    this.engine.setSource(sourceId);
    document.querySelectorAll('.source-btn').forEach((button) => {
      button.classList.toggle('active', button.dataset.source === sourceId);
    });
  }

  _updatePlayButton() {
    const button = document.getElementById('play-btn');
    button.classList.toggle('playing', this.engine.playing);
    document.querySelector('.play-icon').classList.toggle('hidden', this.engine.playing);
    document.querySelector('.pause-icon').classList.toggle('hidden', !this.engine.playing);
  }

  _applyParams(params) {
    const merged = {
      threshold: params.threshold ?? this.params.threshold,
      ratio: params.ratio ?? this.params.ratio,
      attackMs: params.attackMs ?? this.params.attackMs,
      releaseMs: params.releaseMs ?? this.params.releaseMs,
      makeupDb: params.makeupDb ?? this.params.makeupDb,
      blend: params.blend ?? this.params.blend,
    };

    this.params = { ...this.params, ...merged };

    document.getElementById('k-threshold').value = merged.threshold;
    document.getElementById('k-threshold-val').textContent = merged.threshold.toFixed(1);
    this.engine.setParam('threshold', merged.threshold);

    document.getElementById('k-ratio').value = merged.ratio;
    document.getElementById('k-ratio-val').textContent = merged.ratio.toFixed(1);
    this.engine.setParam('ratio', merged.ratio);

    document.getElementById('k-attack').value = Knobs.attackMs.valToSlider(merged.attackMs);
    document.getElementById('k-attack-val').textContent = Knobs.attackMs.format(merged.attackMs);
    this.engine.setParam('attackMs', merged.attackMs);

    document.getElementById('k-release').value = Knobs.releaseMs.valToSlider(merged.releaseMs);
    document.getElementById('k-release-val').textContent = Knobs.releaseMs.format(merged.releaseMs);
    this.engine.setParam('releaseMs', merged.releaseMs);

    document.getElementById('k-makeup').value = merged.makeupDb;
    document.getElementById('k-makeup-val').textContent = merged.makeupDb.toFixed(1);
    this.engine.setParam('makeupDb', merged.makeupDb);

    document.getElementById('k-blend').value = Math.round(merged.blend * 100);
    document.getElementById('k-blend-val').textContent = `${Math.round(merged.blend * 100)}`;
    this.engine.setBlend(merged.blend);
  }

  _loadUseCase(usecaseId) {
    const usecase = USECASES[usecaseId];
    if (!usecase) return;

    this.currentUseCase = usecaseId;
    this._setSource(usecase.source);
    this._applyParams(usecase);

    document.querySelectorAll('.usecase-btn').forEach((button) => {
      button.classList.toggle('active', button.dataset.usecase === usecaseId);
    });

    document.getElementById('current-usecase-label').textContent = usecase.label;
    document.getElementById('preset-copy-title').textContent = usecase.copyTitle;
    document.getElementById('preset-copy-text').textContent = usecase.copyText;
    document.getElementById('listen-note').textContent = usecase.listen;
    document.getElementById('mistake-note').textContent = usecase.mistake;
  }

  _renderLessonList() {
    const list = document.getElementById('lesson-list');
    list.innerHTML = LESSONS.map((lesson, index) => `
      <li>
        <button class="lesson-item ${index === this.lessonIndex ? 'active' : ''}" data-lesson="${index}">
          ${lesson.title}
          <span>${lesson.steps.length} step${lesson.steps.length === 1 ? '' : 's'}</span>
        </button>
      </li>
    `).join('');

    list.querySelectorAll('.lesson-item').forEach((button) => {
      button.addEventListener('click', () => {
        this.lessonIndex = Number(button.dataset.lesson);
        this.stepIndex = 0;
        this._renderLesson();
      });
    });
  }

  _renderLesson() {
    const lesson = LESSONS[this.lessonIndex];
    const step = lesson.steps[this.stepIndex];

    if (step.usecase) this._loadUseCase(step.usecase);

    document.querySelectorAll('.lesson-item').forEach((button) => {
      button.classList.toggle('active', Number(button.dataset.lesson) === this.lessonIndex);
    });

    document.getElementById('lesson-title').textContent = lesson.title;
    document.getElementById('step-counter').textContent = `Step ${this.stepIndex + 1} of ${lesson.steps.length}`;
    document.getElementById('step-text').innerHTML = step.text;

    const listenWrap = document.getElementById('step-listen-for');
    const listenText = document.getElementById('listen-for-text');
    listenWrap.classList.toggle('hidden', !step.listenFor);
    listenText.textContent = step.listenFor || '';

    this._renderFocusControls(step.controls || []);
    this._renderLessonQuestion(step.question);
    this._renderLessonDots(lesson.steps.length);
    this._renderProgress();

    document.getElementById('prev-step-btn').disabled = this.lessonIndex === 0 && this.stepIndex === 0;
    document.getElementById('next-step-btn').textContent =
      this.lessonIndex === LESSONS.length - 1 && this.stepIndex === lesson.steps.length - 1
        ? 'Finish'
        : 'Next →';

    const previousStep = state.lessonProgress[lesson.id]?.step ?? 0;
    state.lessonProgress[lesson.id] = { step: Math.max(previousStep, this.stepIndex) };
    saveState(state);
  }

  _renderFocusControls(controls) {
    const container = document.getElementById('step-controls');
    if (!controls.length) {
      container.classList.add('hidden');
      container.innerHTML = '';
      return;
    }

    container.classList.remove('hidden');
    container.innerHTML = controls.map((control) => {
      const label = CONTROL_MAP[control]?.label || control;
      return `<button class="focus-chip" data-control="${control}">Try ${label}</button>`;
    }).join('');

    container.querySelectorAll('.focus-chip').forEach((button) => {
      button.addEventListener('click', () => {
        const control = CONTROL_MAP[button.dataset.control];
        if (!control) return;
        this._setMode('playground');
        const slider = document.getElementById(control.slider);
        slider.focus();
        slider.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }

  _renderLessonQuestion(question) {
    const wrap = document.getElementById('step-question');
    const feedback = document.getElementById('question-feedback');

    if (!question) {
      wrap.classList.add('hidden');
      feedback.classList.add('hidden');
      wrap.querySelector('#question-options').innerHTML = '';
      return;
    }

    const key = this._lessonAnswerKey();
    const saved = state.lessonAnswers[key];

    wrap.classList.remove('hidden');
    document.getElementById('question-text').textContent = question.q;
    const options = document.getElementById('question-options');
    options.innerHTML = question.options.map((option, index) => `
      <button class="option-btn" data-index="${index}">${option}</button>
    `).join('');

    options.querySelectorAll('.option-btn').forEach((button) => {
      const index = Number(button.dataset.index);
      if (saved) {
        button.disabled = true;
        if (index === question.correct) button.classList.add('correct');
        if (index === saved.selected && !saved.correct) button.classList.add('incorrect');
      } else {
        button.addEventListener('click', () => this._answerLessonQuestion(question, index));
      }
    });

    if (saved) {
      feedback.classList.remove('hidden');
      feedback.textContent = saved.explain;
    } else {
      feedback.classList.add('hidden');
      feedback.textContent = '';
    }
  }

  _answerLessonQuestion(question, index) {
    const correct = index === question.correct;
    const key = this._lessonAnswerKey();

    state.lessonAnswers[key] = {
      selected: index,
      correct,
      explain: question.explain,
    };
    if (correct) this._awardPoints(5);
    saveState(state);
    this._renderLessonQuestion(question);
  }

  _lessonAnswerKey() {
    return `${LESSONS[this.lessonIndex].id}:${this.stepIndex}`;
  }

  _renderLessonDots(count) {
    const dots = document.getElementById('step-dots');
    dots.innerHTML = Array.from({ length: count }, (_, index) => `
      <span class="step-dot ${index === this.stepIndex ? 'active' : ''}"></span>
    `).join('');
  }

  _renderProgress() {
    const totals = LESSONS.reduce((sum, lesson) => sum + lesson.steps.length, 0);
    let current = 0;
    for (let i = 0; i < this.lessonIndex; i++) current += LESSONS[i].steps.length;
    current += this.stepIndex + 1;
    const pct = (current / totals) * 100;
    document.getElementById('progress-fill').style.width = `${pct}%`;
    document.getElementById('progress-text').textContent = `${current} of ${totals} lesson steps explored`;
  }

  _stepDelta(delta) {
    let lessonIndex = this.lessonIndex;
    let stepIndex = this.stepIndex + delta;

    if (stepIndex < 0) {
      if (lessonIndex === 0) return;
      lessonIndex -= 1;
      stepIndex = LESSONS[lessonIndex].steps.length - 1;
    } else if (stepIndex >= LESSONS[lessonIndex].steps.length) {
      if (lessonIndex === LESSONS.length - 1) return;
      lessonIndex += 1;
      stepIndex = 0;
    }

    this.lessonIndex = lessonIndex;
    this.stepIndex = stepIndex;
    this._renderLesson();
  }

  _quizStart() {
    const count = Number(document.getElementById('quiz-count').value);
    this.quizQuestions = shuffle([...QUESTIONS]).slice(0, count);
    this.quizIndex = 0;
    this.quizScore = 0;

    document.getElementById('quiz-start').classList.add('hidden');
    document.getElementById('quiz-results').classList.add('hidden');
    document.getElementById('quiz-active').classList.remove('hidden');

    this._renderQuizQuestion();
  }

  _renderQuizQuestion() {
    const question = this.quizQuestions[this.quizIndex];
    document.getElementById('quiz-question-num').textContent = `Question ${this.quizIndex + 1} of ${this.quizQuestions.length}`;
    document.getElementById('quiz-current-score').textContent = `${this.quizScore}/${this.quizQuestions.length}`;
    document.getElementById('quiz-progress-fill').style.width = `${(this.quizIndex / this.quizQuestions.length) * 100}%`;
    document.getElementById('quiz-question-text').textContent = question.q;
    document.getElementById('quiz-feedback').classList.add('hidden');
    document.getElementById('quiz-feedback-text').textContent = '';

    const answers = document.getElementById('quiz-answers');
    answers.innerHTML = question.options.map((option, index) => `
      <button class="option-btn" data-index="${index}">${option}</button>
    `).join('');

    answers.querySelectorAll('.option-btn').forEach((button) => {
      button.addEventListener('click', () => this._answerQuizQuestion(question, Number(button.dataset.index)));
    });
  }

  _answerQuizQuestion(question, index) {
    const correct = index === question.correct;
    if (correct) this.quizScore += 1;

    document.querySelectorAll('#quiz-answers .option-btn').forEach((button) => {
      const optionIndex = Number(button.dataset.index);
      button.disabled = true;
      if (optionIndex === question.correct) button.classList.add('correct');
      if (optionIndex === index && !correct) button.classList.add('incorrect');
    });

    document.getElementById('quiz-current-score').textContent = `${this.quizScore}/${this.quizQuestions.length}`;
    document.getElementById('quiz-feedback').classList.remove('hidden');
    document.getElementById('quiz-feedback-text').textContent = question.explain;
  }

  _quizNext() {
    this.quizIndex += 1;
    if (this.quizIndex >= this.quizQuestions.length) {
      this._finishQuiz();
      return;
    }
    this._renderQuizQuestion();
  }

  _finishQuiz() {
    const pct = Math.round((this.quizScore / this.quizQuestions.length) * 100);
    document.getElementById('quiz-active').classList.add('hidden');
    document.getElementById('quiz-results').classList.remove('hidden');
    document.getElementById('quiz-final-score').textContent = pct;

    let copy = 'You know the core idea, but a little more listening practice would help.';
    if (pct >= 85) copy = 'Strong result. You clearly understand what the dry path and crushed path are each doing.';
    else if (pct >= 65) copy = 'Solid. You have the main concepts, but a few more A/B checks in the playground will sharpen the details.';
    document.getElementById('quiz-result-copy').textContent = copy;

    if (pct > state.bestQuizPct) {
      state.bestQuizPct = pct;
      document.getElementById('quiz-best-score').classList.remove('hidden');
      document.getElementById('best-score-val').textContent = pct;
      this._awardPoints(10);
    } else {
      saveState(state);
    }
  }

  _quizReset() {
    document.getElementById('quiz-results').classList.add('hidden');
    document.getElementById('quiz-start').classList.remove('hidden');
    document.getElementById('quiz-progress-fill').style.width = '0%';
  }

  _awardPoints(points) {
    state.score += points;
    document.getElementById('total-score').textContent = state.score;
    saveState(state);
  }

  _storeChallengeDraft() {
    state.challengeDraft = {
      name: document.getElementById('ch-name').value,
      usecase: document.getElementById('ch-usecase').value,
      concept: document.getElementById('ch-concept').value,
      settings: document.getElementById('ch-settings').value,
      listen: document.getElementById('ch-listen').value,
      mistake: document.getElementById('ch-mistake').value,
    };
    saveState(state);
  }

  _restoreChallengeDraft() {
    const draft = state.challengeDraft || {};
    document.getElementById('ch-name').value = draft.name || '';
    document.getElementById('ch-usecase').value = draft.usecase || 'drums';
    document.getElementById('ch-concept').value = draft.concept || '';
    document.getElementById('ch-settings').value = draft.settings || '';
    document.getElementById('ch-listen').value = draft.listen || '';
    document.getElementById('ch-mistake').value = draft.mistake || '';
  }

  _generateChallengeSummary() {
    const name = document.getElementById('ch-name').value.trim() || 'Student';
    const usecase = document.getElementById('ch-usecase').value;
    const concept = document.getElementById('ch-concept').value.trim() || 'Parallel compression keeps the dry signal intact while a heavily compressed copy is blended underneath it.';
    const settings = document.getElementById('ch-settings').value.trim() || this._defaultSettingsCopy(usecase);
    const listen = document.getElementById('ch-listen').value.trim() || this._defaultListenCopy(usecase);
    const mistake = document.getElementById('ch-mistake').value.trim() || 'A common mistake is adding so much wet signal that the effect only sounds louder, not better.';

    const summary = [
      `${name}`,
      '',
      `Use case: ${this._labelForUsecaseValue(usecase)}`,
      '',
      `Concept:`,
      concept,
      '',
      `Starting settings:`,
      settings,
      '',
      `What I would listen for:`,
      listen,
      '',
      `Common mistake to avoid:`,
      mistake,
    ].join('\n');

    document.getElementById('challenge-output').value = summary;
    this._storeChallengeDraft();
  }

  _defaultSettingsCopy(usecase) {
    switch (usecase) {
      case 'vocal':
        return 'I would start with a fairly low threshold, a moderate-to-high ratio, medium-fast attack, medium release, enough wet makeup to hear the duplicate clearly in solo, and then a conservative blend back under the dry vocal.';
      case 'mix':
        return 'I would start more gently: lower blend, moderate ratio, medium attack, and careful level matching so the full mix keeps its depth.';
      case 'room':
        return 'I would use a very low threshold, high ratio, generous wet makeup, and blend it in as color rather than as the entire sound.';
      case 'drums':
      default:
        return 'I would begin with an aggressive wet path: low threshold, high ratio, medium attack, release timed to the groove, plenty of wet makeup, and then I would bring the blend up slowly.';
    }
  }

  _defaultListenCopy(usecase) {
    switch (usecase) {
      case 'vocal':
        return 'I would listen for the vocal becoming denser and more stable without the breaths and consonants jumping out unnaturally.';
      case 'mix':
        return 'I would listen for a little more weight and glue without the whole mix flattening or feeling crowded.';
      case 'room':
        return 'I would listen for excitement and ambience while making sure the room crush does not swallow the groove.';
      case 'drums':
      default:
        return 'I would listen for the dry transients staying punchy while the wet path adds body, sustain, and room behind the hits.';
    }
  }

  _labelForUsecaseValue(value) {
    switch (value) {
      case 'vocal': return 'Vocal density';
      case 'mix': return 'Full mix lift';
      case 'room': return 'Room crush';
      case 'drums':
      default: return 'Drum bus / NY compression';
    }
  }

  async _copyChallengeSummary() {
    const output = document.getElementById('challenge-output');
    if (!output.value.trim()) this._generateChallengeSummary();
    try {
      await navigator.clipboard.writeText(output.value);
    } catch {
      output.focus();
      output.select();
      document.execCommand('copy');
    }
  }
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const app = new App();
app.start();
