// Challenge — short reflection form that generates a detailed summary
// students can paste into Canvas for class credit. The summary captures
// reflection answers, lesson and main-quiz scores, time spent per section,
// and a short SHA-256 validity hash so the instructor can detect tampering.

import { LESSONS } from './lessons.js';
import { QUESTIONS } from './quiz.js';
import {
  getSectionTimes,
  getTotalElapsedMs,
  getLessonAnswers,
  getMainAnswers,
  formatDuration,
  makeValidityHash,
} from './progress.js';

export const PROMPTS = [
  {
    id: 'ny-drums',
    label: 'NY Drums — describe the settings you landed on. What did the crushed copy add to the dry drums, and how much blend felt right?',
  },
  {
    id: 'vocal',
    label: 'Vocal Density — how is parallel compression on vocals different from drums? What changed about your settings or your blend amount?',
  },
  {
    id: 'bypass',
    label: 'Bypass Test — pick a setting you liked, then toggle bypass. Did the source actually improve, or did it just get louder? What told you the difference?',
  },
  {
    id: 'mistake',
    label: 'Common Mistake — describe a moment where the wet path took over too much. What did it sound like, and which control fixed it?',
  },
];

export function renderChallenge() {
  const container = document.getElementById('challenge-form');
  container.innerHTML = `
    <label class="field">
      <span class="field-label">Your name:</span>
      <input type="text" id="ch-name" placeholder="Jane Student" autocomplete="name">
    </label>
    <label class="field">
      <span class="field-label">Course / Section (optional):</span>
      <input type="text" id="ch-course" placeholder="MUS 210 — Section B">
    </label>
    ${PROMPTS.map((p) => `
      <label class="field">
        <span class="field-label">${p.label}</span>
        <textarea data-prompt="${p.id}" rows="4" placeholder="A few sentences..."></textarea>
      </label>
    `).join('')}
    <div class="challenge-actions">
      <button id="ch-generate" class="btn-primary">Generate Summary 📋</button>
      <button id="ch-copy" class="btn-ghost" hidden>Copy to Clipboard</button>
    </div>
    <div id="ch-output" hidden>
      <h3>Your Summary</h3>
      <pre id="ch-summary"></pre>
    </div>
  `;

  document.getElementById('ch-generate').addEventListener('click', generate);
  document.getElementById('ch-copy').addEventListener('click', copyToClipboard);
}

async function generate() {
  const name = document.getElementById('ch-name').value.trim() || '(unnamed)';
  const course = document.getElementById('ch-course').value.trim();
  const now = new Date();
  const date = now.toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const time = now.toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit',
  });

  const lessonAnswers = getLessonAnswers();
  const mainAnswers = getMainAnswers();
  const sectionTimes = getSectionTimes();
  const totalElapsed = getTotalElapsedMs();

  const lessonStats = countAnswers(lessonAnswers);
  const mainStats = countAnswers(mainAnswers);

  // Build the body before hashing, then append the hash.
  const lines = [
    '═══════════════════════════════════════════════',
    '  PARALLEL COMPRESSION — CLASS CHALLENGE SUMMARY',
    '═══════════════════════════════════════════════',
    '',
    `Name:     ${name}`,
    course ? `Course:   ${course}` : null,
    `Date:     ${date} at ${time}`,
    `Session:  ${formatDuration(totalElapsed)} total`,
    '',
    '── Time spent per section ──',
    `  Lessons:     ${formatDuration(sectionTimes.lessons || 0)}`,
    `  Playground:  ${formatDuration(sectionTimes.playground || 0)}`,
    `  Quiz:        ${formatDuration(sectionTimes.quiz || 0)}`,
    `  Challenge:   ${formatDuration(sectionTimes.challenge || 0)}`,
    '',
    '── Lesson check-yourself questions ──',
    `  Answered: ${lessonStats.answered} / ${LESSONS.length}`,
    `  Correct:  ${lessonStats.correct} / ${lessonStats.answered || 0}`,
    ...LESSONS.map((l) => {
      const ans = lessonAnswers[l.id];
      if (!ans) return `  · ${l.shortLabel}: (not attempted)`;
      const mark = ans.correct ? '✓' : '✗';
      return `  · ${l.shortLabel}: ${mark} "${truncate(ans.selectedLabel, 60)}"`;
    }),
    '',
    '── Main quiz ──',
    `  Answered: ${mainStats.answered} / ${QUESTIONS.length}`,
    `  Correct:  ${mainStats.correct} / ${mainStats.answered || 0}`,
    ...QUESTIONS.map((_, qi) => {
      const ans = mainAnswers[qi];
      if (!ans) return `  Q${qi + 1}: (not attempted)`;
      const mark = ans.correct ? '✓' : '✗';
      const tail = ans.correct ? '' : `  →  correct: "${truncate(ans.correctLabel, 50)}"`;
      return `  Q${qi + 1}: ${mark} "${truncate(ans.selectedLabel, 50)}"${tail}`;
    }),
    '',
    '── Reflection prompts ──',
    '',
  ].filter((line) => line !== null);

  for (const p of PROMPTS) {
    const answer = document.querySelector(`textarea[data-prompt="${p.id}"]`).value.trim();
    lines.push(`Q: ${p.label}`);
    lines.push(`A: ${answer || '(no response)'}`);
    lines.push('');
  }

  const body = lines.join('\n');
  const hash = await makeValidityHash(body);

  const finalText = [
    body,
    '═══════════════════════════════════════════════',
    `  Validity hash: ${hash}`,
    `  Generated:     ${now.toISOString()}`,
    '═══════════════════════════════════════════════',
  ].join('\n');

  document.getElementById('ch-summary').textContent = finalText;
  document.getElementById('ch-output').hidden = false;
  document.getElementById('ch-copy').hidden = false;
}

function countAnswers(map) {
  const values = Object.values(map);
  return {
    answered: values.length,
    correct: values.filter((v) => v.correct).length,
  };
}

function truncate(str, n) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

async function copyToClipboard() {
  const text = document.getElementById('ch-summary').textContent;
  const btn = document.getElementById('ch-copy');
  try {
    await navigator.clipboard.writeText(text);
    const original = btn.textContent;
    btn.textContent = 'Copied ✓';
    setTimeout(() => { btn.textContent = original; }, 1600);
  } catch {
    btn.textContent = 'Copy failed — select & copy manually';
  }
}
