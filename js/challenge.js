// Challenge — short reflection form that generates a formatted summary
// students can paste into Canvas (or any LMS) for class credit.

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

function generate() {
  const name = document.getElementById('ch-name').value.trim() || '(unnamed)';
  const date = new Date().toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const lines = [
    'Parallel Compression — Class Challenge',
    `Name: ${name}`,
    `Date: ${date}`,
    '',
  ];

  for (const p of PROMPTS) {
    const answer = document.querySelector(`textarea[data-prompt="${p.id}"]`).value.trim();
    lines.push(`Q: ${p.label}`);
    lines.push(`A: ${answer || '(no response)'}`);
    lines.push('');
  }

  document.getElementById('ch-summary').textContent = lines.join('\n');
  document.getElementById('ch-output').hidden = false;
  document.getElementById('ch-copy').hidden = false;
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
