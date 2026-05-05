export const QUESTIONS = [
  {
    q: 'Parallel compression means:',
    options: [
      'Compressing the same signal twice in series',
      'Blending a heavily compressed copy underneath the original signal',
      'Compressing only the left channel',
      'Using a limiter instead of a compressor',
    ],
    correct: 1,
    explain: 'The defining move is keeping the dry signal intact while adding a crushed duplicate in parallel.',
  },
  {
    q: 'Why is parallel compression popular on drums?',
    options: [
      'It removes all transients from the kit',
      'It can add body and sustain without completely flattening the original hits',
      'It only works on kick drums',
      'It avoids the need for makeup gain',
    ],
    correct: 1,
    explain: 'The dry path preserves impact, while the wet path adds thickness and excitement.',
  },
  {
    q: 'In classic NY compression, the wet path is often:',
    options: [
      'Barely compressed at all',
      'Muted completely',
      'Compressed very aggressively and then blended back carefully',
      'High-pass filtered instead of compressed',
    ],
    correct: 2,
    explain: 'The wet path often sounds extreme by itself. The art is in how much of it you blend back under the dry signal.',
  },
  {
    q: 'What does the Blend control do in a parallel compressor setup?',
    options: [
      'It changes the release time',
      'It determines how much of the compressed copy is added to the dry path',
      'It changes the threshold automatically',
      'It removes makeup gain',
    ],
    correct: 1,
    explain: 'Blend is the wet amount. The compressor settings shape the wet path, but Blend decides how present that path becomes in the final sound.',
  },
  {
    q: 'If the attack on the wet path is too fast for drums, what can happen?',
    options: [
      'The compressed copy loses too much snap and the drums feel flatter',
      'The loop stops playing',
      'The dry path becomes delayed',
      'The ratio turns into 1:1',
    ],
    correct: 0,
    explain: 'Very fast attack can shave off the front edge of the drum hit in the wet copy, which reduces the sense of punch when blended.',
  },
  {
    q: 'Which source usually needs a more subtle parallel blend than a drum bus?',
    options: [
      'A full mix',
      'A kick drum sample',
      'A snare close mic',
      'A clap layer',
    ],
    correct: 0,
    explain: 'Parallel compression on a full mix can get crowded and flat very quickly, so the blend is usually much more conservative.',
  },
  {
    q: 'What is the most common beginner mistake with parallel compression?',
    options: [
      'Using any makeup gain at all',
      'Forgetting that louder can seem better and blending in too much wet signal',
      'Choosing a ratio above 2:1',
      'Using it on drums',
    ],
    correct: 1,
    explain: 'Parallel compression adds energy and loudness, which can be flattering at first. Honest bypass comparison keeps you from overdoing it.',
  },
  {
    q: 'On vocals, parallel compression is often used to:',
    options: [
      'Make the singer sound farther away',
      'Add density and help low-level details stay audible',
      'Remove all breath noise permanently',
      'Replace the dry vocal entirely',
    ],
    correct: 1,
    explain: 'A compressed duplicate can support quiet syllables, breaths, and decays while the original vocal still carries the main shape.',
  },
  {
    q: 'If the release is wrong for the groove, the wet path may:',
    options: [
      'Feel disconnected and pump in an awkward way',
      'Become stereo automatically',
      'Turn into a de-esser',
      'Bypass itself',
    ],
    correct: 0,
    explain: 'Release time controls how the wet path recovers. If it fights the rhythm, the compression can feel clumsy instead of musical.',
  },
  {
    q: 'The best quick test for whether your parallel compression actually helped is to:',
    options: [
      'Raise the blend until the wet path is obvious',
      'Solo the wet path and stop there',
      'Toggle bypass and compare improvement versus simple loudness',
      'Set attack and release to minimum values',
    ],
    correct: 2,
    explain: 'Bypass comparison helps separate real improvement from the simple excitement of added level.',
  },
  {
    q: 'Which statement is most true about the wet path by itself?',
    options: [
      'It must sound natural on its own or it will never work',
      'It can sound exaggerated or ugly alone, as long as the final blend sounds intentional',
      'It should always be quieter than the dry path in solo mode',
      'It should never use more than 2 dB of gain reduction',
    ],
    correct: 1,
    explain: 'In many parallel chains, the wet path is deliberately extreme. The final result is what matters.',
  },
  {
    q: 'Which control most directly determines how hard the compressor grabs the wet copy after the signal crosses threshold?',
    options: [
      'Ratio',
      'Loop',
      'Bypass',
      'Volume',
    ],
    correct: 0,
    explain: 'Threshold decides when compression begins, and ratio decides how strongly the wet path is reduced above that point.',
  },
];
