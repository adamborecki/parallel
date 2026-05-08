// Lesson cards. Each card has a title, prose, an optional source preset,
// and an optional preset object that snaps the playground to a specific
// setting so the student can hear the concept immediately.

export const LESSONS = [
  {
    id: 'parallel-basics',
    title: '1. What parallel compression is',
    body: `
      <p><strong>Parallel compression</strong> means you keep the original signal intact, create a heavily compressed copy, and blend that crushed copy back underneath the dry signal.</p>
      <p style="padding:0.75rem 0.9rem;border-radius:14px;background:var(--bg-inset);font-family:ui-monospace,monospace;font-size:0.92rem;">DRY stays natural &nbsp;+&nbsp; WET gets squashed &nbsp;=&nbsp; more density without losing the punch</p>
      <p>This is different from normal insert compression, where the whole signal goes through one compressor and whatever the compressor does affects everything you hear. People also call this <strong>NY compression</strong> when they mean the classic drum version.</p>
    `,
    presets: [
      {
        label: 'Just the dry signal',
        source: 'drums',
        threshold: -24, ratio: 4, attack: 15, release: 180, makeup: 0, blend: 0,
      },
      {
        label: 'Just the crushed copy',
        source: 'drums',
        threshold: -32, ratio: 8, attack: 10, release: 150, makeup: 6, blend: 1,
      },
      {
        label: 'Blend them — listen to the difference',
        source: 'drums',
        threshold: -32, ratio: 8, attack: 10, release: 150, makeup: 6, blend: 0.45,
      },
    ],
  },
  {
    id: 'transients-and-body',
    title: '2. Why it sounds punchy',
    body: `
      <p>Parallel compression works because the <strong>dry path keeps the transient shape</strong> while the compressed path lifts up the quieter tail of the sound.</p>
      <ul>
        <li>the dry snare still cracks</li>
        <li>the dry kick still punches at the front edge</li>
        <li>the crushed copy adds sustain, room, and weight behind those transients</li>
      </ul>
      <p>Three controls matter most: <strong>threshold</strong> and <strong>ratio</strong> set how hard the wet copy gets crushed, <strong>attack</strong> decides whether the wet copy still has any front-edge transient, and <strong>blend</strong> decides how much of all that you actually hear.</p>
    `,
    presets: [
      {
        label: 'Slow attack — wet copy still has snap',
        source: 'drums',
        threshold: -28, ratio: 6, attack: 30, release: 150, makeup: 4, blend: 0.5,
      },
      {
        label: 'Fast attack — wet copy is flattened',
        source: 'drums',
        threshold: -28, ratio: 6, attack: 1, release: 150, makeup: 4, blend: 0.5,
      },
    ],
  },
  {
    id: 'ny-drums',
    title: '3. NY compression on drums',
    body: `
      <p>The classic NY drum recipe is not subtle inside the wet path. Engineers often use a <strong>low threshold</strong>, a <strong>high ratio</strong>, lots of <strong>makeup gain</strong>, and then bring that smashed path back in carefully.</p>
      <ul>
        <li>threshold low enough for obvious gain reduction</li>
        <li>ratio around 6:1 to 10:1</li>
        <li>attack around 10–30 ms so the copy still has some snap</li>
        <li>release around 80–200 ms so the wet path breathes with the groove</li>
      </ul>
      <p>Why not just compress the whole drum bus this hard? Because insert compression would flatten the transients you want to keep. Parallel gives you both: dry punch + wet excitement.</p>
    `,
    presets: [
      {
        label: 'Classic NY drums',
        source: 'drums',
        threshold: -34, ratio: 8, attack: 15, release: 120, makeup: 8, blend: 0.4,
      },
      {
        label: 'Same setting, dialed back blend',
        source: 'drums',
        threshold: -34, ratio: 8, attack: 15, release: 120, makeup: 8, blend: 0.2,
      },
    ],
  },
  {
    id: 'vocals-and-mix',
    title: '4. Vocals and full mix',
    body: `
      <p>On vocals, parallel compression is usually about <strong>density</strong> rather than aggression. A crushed duplicate can bring up breaths, tails, and soft syllables so the vocal feels stable and finished.</p>
      <p>On a full mix it has to be <strong>very subtle</strong>. Even a small amount adds weight, but too much makes the production feel smaller, flatter, and more crowded.</p>
      <p>General rule: drums tolerate a dramatic crushed layer. Vocals and full mixes need a much gentler hand.</p>
    `,
    presets: [
      {
        label: 'Vocal — supportive density',
        source: 'vocal',
        threshold: -24, ratio: 4, attack: 8, release: 220, makeup: 4, blend: 0.3,
      },
      {
        label: 'Full mix — gentle weight',
        source: 'mix',
        threshold: -22, ratio: 3, attack: 20, release: 250, makeup: 3, blend: 0.2,
      },
    ],
  },
  {
    id: 'mistakes',
    title: '5. Common mistakes',
    body: `
      <p>The most common beginner mistake is adding too much wet path because louder feels exciting for the first ten seconds. Always compare against <strong>bypass</strong> and ask: did it get better, or only louder?</p>
      <p>Other classic mistakes:</p>
      <ul>
        <li><strong>attack too fast</strong> — the wet copy loses punch and the drums feel flatter</li>
        <li><strong>release wrong for the groove</strong> — the wet path pumps in a way that fights the rhythm</li>
        <li><strong>makeup gain too high</strong> — the wet path takes over and the dry signal becomes background</li>
      </ul>
      <p>Final shortcut: if you can clearly hear "there is the dry sound, and there is the crushed copy", you are probably blending too much. Great parallel compression reads as confidence, not as obvious processing.</p>
    `,
    presets: [
      {
        label: 'Overdone — too much blend',
        source: 'drums',
        threshold: -34, ratio: 8, attack: 15, release: 120, makeup: 8, blend: 0.85,
      },
      {
        label: 'Tasteful — same compressor, less blend',
        source: 'drums',
        threshold: -34, ratio: 8, attack: 15, release: 120, makeup: 8, blend: 0.35,
      },
    ],
  },
];
