export const LESSONS = [
  {
    id: 'parallel-basics',
    title: '1. What Parallel Compression Is',
    steps: [
      {
        text: `
          <p><strong>Parallel compression</strong> means you keep the original signal intact, create a heavily compressed copy, and then blend that crushed copy back underneath the dry signal.</p>
          <p>The idea is simple:</p>
          <p style="padding:0.75rem 0.9rem;border-radius:14px;background:var(--bg-inset);font-family:ui-monospace,monospace;">DRY path stays natural  +  WET path gets squashed  =  more density without losing all the punch</p>
          <p>This is different from normal “insert” compression, where the whole signal goes through one compressor and whatever the compressor does affects everything you hear.</p>
        `,
      },
      {
        text: `
          <p>People also call this <strong>NY compression</strong> when they mean the classic drum version: duplicate the drum bus, absolutely hammer the duplicate, then sneak that smashed channel underneath the original drums.</p>
          <p>You can use the same trick on:</p>
          <ul>
            <li>drums, to add smack and sustain</li>
            <li>vocals, to add density and keep whispers audible</li>
            <li>room mics, to exaggerate energy and excitement</li>
            <li>sometimes a full mix, very subtly, to add a little weight</li>
          </ul>
        `,
        question: {
          q: 'What makes parallel compression “parallel”?',
          options: [
            'The attack and release are matched exactly.',
            'A dry signal and a compressed copy run side by side and are blended together.',
            'Two compressors are placed in series.',
            'The left and right channels are compressed separately.',
          ],
          correct: 1,
          explain: 'Parallel compression works because the untouched signal and the crushed signal exist at the same time, then get summed together at the output.',
        },
      },
    ],
  },
  {
    id: 'transients-and-body',
    title: '2. Why It Sounds Punchy',
    steps: [
      {
        usecase: 'nyDrums',
        text: `
          <p>The reason parallel compression works so well is that the <strong>dry path keeps the transient shape</strong> while the compressed path lifts up the quieter tail of the sound.</p>
          <p>On drums, that means:</p>
          <ul>
            <li>the dry snare still cracks</li>
            <li>the dry kick still punches at the front edge</li>
            <li>the crushed copy adds sustain, room, and weight behind those transients</li>
          </ul>
          <p>So instead of flattening the hit, you keep the hit and make the body feel bigger.</p>
        `,
        listenFor: 'Start with NY Drums. Toggle Bypass, then Solo Crushed. The crushed path alone sounds overdone, but blended under the dry path it feels exciting instead of broken.',
      },
      {
        usecase: 'nyDrums',
        text: `
          <p>There are three controls that matter immediately in parallel work:</p>
          <ul>
            <li><strong>Threshold</strong> and <strong>ratio</strong> determine how hard the wet copy gets crushed.</li>
            <li><strong>Attack</strong> changes whether the compressed copy still lets some front-edge transient through.</li>
            <li><strong>Blend</strong> determines whether this feels like “extra glue” or “obvious effect.”</li>
          </ul>
          <p>A useful mental model: the compressor shapes the wet path, but the <strong>blend knob decides how much of that shape you actually hear</strong>.</p>
        `,
        controls: ['threshold', 'ratio', 'attack', 'blend'],
      },
      {
        text: `
          <p>If the blend is too low, nothing really changes. If the blend is too high, the crushed copy dominates and the whole point of staying “parallel” disappears.</p>
          <p>The sweet spot is usually where you notice the source getting fuller and more confident, but you <strong>do not hear “compression” first</strong>.</p>
        `,
        question: {
          q: 'In a strong drum parallel chain, what usually provides the body and sustain?',
          options: [
            'The dry path only',
            'The wet compressed copy blended underneath',
            'The attack control alone',
            'The bypass switch',
          ],
          correct: 1,
          explain: 'The smashed copy raises quieter detail and sustain. The dry path mainly preserves the original transient feel.',
        },
      },
    ],
  },
  {
    id: 'ny-drums',
    title: '3. NY Compression On Drums',
    steps: [
      {
        usecase: 'nyDrums',
        text: `
          <p>The classic NY drum sound is not subtle inside the wet path. Engineers often use a <strong>low threshold</strong>, a <strong>high ratio</strong>, lots of <strong>wet makeup gain</strong>, and then bring that smashed path back in carefully.</p>
          <p>Typical starting point:</p>
          <ul>
            <li>threshold low enough for obvious gain reduction</li>
            <li>ratio around 6:1 to 10:1</li>
            <li>attack around 10–30 ms so the copy still has some snap</li>
            <li>release around 80–200 ms so the wet path breathes with the groove</li>
          </ul>
        `,
        listenFor: 'Raise the Blend slowly. The snare should feel wider and denser before the loop starts sounding flat.',
      },
      {
        usecase: 'nyDrums',
        text: `
          <p>Why not just compress the whole drum bus this hard? Because insert compression would also flatten the transients you want to preserve.</p>
          <p>Parallel compression gives you a compromise:</p>
          <ul>
            <li>dry path = attack, snap, original balance</li>
            <li>wet path = excitement, room, sustain, aggression</li>
          </ul>
        `,
        controls: ['attack', 'release', 'makeup', 'blend'],
      },
      {
        text: `
          <p>If the release is too short, the crushed copy jitters and sounds twitchy. If it is too long, the room and sustain smear across the groove and the drum loop loses bounce.</p>
          <p>What you usually want is a release that lets the wet path recover in time with the beat.</p>
        `,
        question: {
          q: 'Why is parallel compression often preferred over inserting an extreme compressor directly on the drum bus?',
          options: [
            'Because parallel compression uses less CPU.',
            'Because it preserves the original transients while still adding a crushed layer underneath.',
            'Because the blend knob replaces makeup gain.',
            'Because attack and release stop working on insert compressors.',
          ],
          correct: 1,
          explain: 'That is the whole advantage: you can get the excitement of heavy compression without forcing the entire drum signal to live inside that compressed shape.',
        },
      },
    ],
  },
  {
    id: 'vocals-and-mix',
    title: '4. Vocals, Rooms, And Mix Lift',
    steps: [
      {
        usecase: 'vocalDensity',
        text: `
          <p>On vocals, parallel compression is often about <strong>density</strong> rather than aggression. A crushed duplicate can bring up breaths, tails, and soft syllables so the vocal feels more stable and “finished.”</p>
          <p>You usually need:</p>
          <ul>
            <li>less blend than on drums</li>
            <li>a medium-fast attack so peaks do not jump out too hard</li>
            <li>enough makeup gain for the wet path to feel supportive, not buried</li>
          </ul>
        `,
        listenFor: 'Switch to Vocal Density. As you add Blend, notice how quiet details become more present even when the dry vocal still leads the image.',
      },
      {
        usecase: 'roomCrush',
        text: `
          <p>Room mics are where parallel compression can get wild. If you smash a room track hard enough, cymbal wash, snare decay, and ambience surge forward in a dramatic way.</p>
          <p>This can be thrilling, but it is easy to overdo. The trick is using the crushed room as color, not as the whole drum sound.</p>
        `,
      },
      {
        usecase: 'mixLift',
        text: `
          <p>On a full mix, parallel compression is usually <strong>very subtle</strong>. Even a small amount can add weight, but too much makes the whole production feel smaller, flatter, and more crowded.</p>
          <p>If you try it on a mix, use a modest blend and level-match honestly against bypass.</p>
        `,
        question: {
          q: 'Compared with drums, what is usually true for parallel compression on vocals or a full mix?',
          options: [
            'You usually need even more blend than on drums.',
            'It is often more subtle, with less blend and more careful level matching.',
            'Attack and release stop mattering.',
            'The wet path should always be soloed.',
          ],
          correct: 1,
          explain: 'Drums can tolerate a dramatic crushed layer. Vocals and especially full mixes usually need a much gentler hand.',
        },
      },
    ],
  },
  {
    id: 'mistakes',
    title: '5. Common Mistakes',
    steps: [
      {
        text: `
          <p>The most common beginner mistake is adding too much wet path because “louder” sounds exciting for the first ten seconds.</p>
          <p>Always compare against <strong>bypass</strong>, and if possible level-match the overall output in your head. Ask: did it get better, or only louder?</p>
        `,
      },
      {
        text: `
          <p>Another mistake is using settings that make the wet path ugly in a way that does not help the source:</p>
          <ul>
            <li>attack too fast = the copy loses punch</li>
            <li>release wrong for the groove = pumping that feels accidental</li>
            <li>makeup too high = wet path takes over</li>
          </ul>
          <p>Remember: the wet path can sound almost ridiculous by itself, but the final blend should still feel intentional.</p>
        `,
        controls: ['attack', 'release', 'makeup', 'blend'],
      },
      {
        text: `
          <p>Final shortcut: if you can clearly hear “there is the dry sound, and there is the crushed copy,” you are probably blending too much. Great parallel compression often reads as confidence, depth, and size rather than obvious processing.</p>
        `,
        question: {
          q: 'What is the best quick reality check when dialing in parallel compression?',
          options: [
            'Turn the ratio up until it sounds dramatic.',
            'Keep raising blend because more wet path always sounds fuller.',
            'Toggle bypass and ask whether the source improved, not just got louder.',
            'Solo the wet path and mix only from that.',
          ],
          correct: 2,
          explain: 'Parallel compression is famous for fooling people with loudness. Bypass comparison is the fastest way to stay honest.',
        },
      },
    ],
  },
];
