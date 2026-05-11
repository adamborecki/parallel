// Shared progress tracker — knows what the student has answered, how long
// they spent in each section, and turns that into a summary payload.

const sectionTimes = { lessons: 0, playground: 0, quiz: 0, challenge: 0 };
let activeSection = 'lessons';
let lastSectionStart = Date.now();
const lessonStartedAt = Date.now();

// lessonQuiz[lessonId] = { selectedIndex, correctIndex, correct, optionLabel, correctLabel }
const lessonQuiz = {};
// mainQuiz[qIndex] = { selectedIndex, correctIndex, correct, optionLabel, correctLabel }
const mainQuiz = {};

export function recordSectionEntry(id) {
  if (id === activeSection) return;
  const now = Date.now();
  sectionTimes[activeSection] = (sectionTimes[activeSection] || 0) + (now - lastSectionStart);
  activeSection = id;
  lastSectionStart = now;
}

export function getSectionTimes() {
  // Flush time for the currently active section so the caller sees current totals.
  const now = Date.now();
  const snapshot = { ...sectionTimes };
  snapshot[activeSection] = (snapshot[activeSection] || 0) + (now - lastSectionStart);
  return snapshot;
}

export function getTotalElapsedMs() {
  return Date.now() - lessonStartedAt;
}

export function recordLessonAnswer(lessonId, payload) {
  lessonQuiz[lessonId] = payload;
}

export function getLessonAnswers() {
  return lessonQuiz;
}

export function recordMainAnswer(qIndex, payload) {
  mainQuiz[qIndex] = payload;
}

export function getMainAnswers() {
  return mainQuiz;
}

export function formatDuration(ms) {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec}s`;
  return `${min}m ${String(sec).padStart(2, '0')}s`;
}

export async function makeValidityHash(payload) {
  const data = new TextEncoder().encode(payload);
  const buf = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  // 12 hex chars in 4-4-4 groups — short, copy-pasteable, still collision-rare.
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`.toUpperCase();
}
