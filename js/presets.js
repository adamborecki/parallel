// Playground / challenge preset chips. Each chip snaps the rig to a known
// starting point so students can A/B between recognizable settings instead
// of staring at sliders. Same idea as the chip rows on the sidechain and
// mid-side demos.

export const PLAYGROUND_PRESETS = [
  {
    id: 'dry-only',
    label: 'Dry only',
    blurb: 'Hear the source with zero wet copy.',
    source: 'drums', threshold: -24, ratio: 4, attack: 15, release: 180, makeup: 0, blend: 0,
  },
  {
    id: 'subtle-glue',
    label: 'Subtle glue',
    blurb: 'Light blend, gentle ratio. Polish, not aggression.',
    source: 'drums', threshold: -22, ratio: 3, attack: 20, release: 220, makeup: 2, blend: 0.18,
  },
  {
    id: 'ny-drums',
    label: 'Classic NY drums',
    blurb: 'Low threshold, high ratio, blended back to taste.',
    source: 'drums', threshold: -34, ratio: 8, attack: 15, release: 120, makeup: 8, blend: 0.4,
  },
  {
    id: 'wet-only',
    label: 'Wet only',
    blurb: 'Solo the crushed copy. Listen to what you are blending in.',
    source: 'drums', threshold: -34, ratio: 8, attack: 15, release: 120, makeup: 8, blend: 1,
  },
  {
    id: 'vocal-density',
    label: 'Vocal density',
    blurb: 'Lifts breaths and tails without flattening the lead.',
    source: 'vocal', threshold: -24, ratio: 4, attack: 8, release: 220, makeup: 4, blend: 0.3,
  },
  {
    id: 'mix-weight',
    label: 'Mix weight',
    blurb: 'A whisper of parallel on the full mix.',
    source: 'mix', threshold: -22, ratio: 3, attack: 20, release: 250, makeup: 3, blend: 0.18,
  },
  {
    id: 'overdone',
    label: 'Overdone (anti-example)',
    blurb: 'Too much blend. Useful as the negative reference.',
    source: 'drums', threshold: -36, ratio: 10, attack: 5, release: 90, makeup: 9, blend: 0.85,
  },
];
