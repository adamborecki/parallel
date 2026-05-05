class ParallelCompressorProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'threshold', defaultValue: -30, minValue: -60, maxValue: 0, automationRate: 'k-rate' },
      { name: 'ratio', defaultValue: 8, minValue: 1, maxValue: 20, automationRate: 'k-rate' },
      { name: 'attackMs', defaultValue: 20, minValue: 0.1, maxValue: 200, automationRate: 'k-rate' },
      { name: 'releaseMs', defaultValue: 160, minValue: 5, maxValue: 2500, automationRate: 'k-rate' },
      { name: 'makeupDb', defaultValue: 10, minValue: 0, maxValue: 24, automationRate: 'k-rate' },
      { name: 'bypass', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
    ];
  }

  constructor() {
    super();
    this.env = 1e-7;
    this.framesSincePost = 0;
    this.postEveryFrames = Math.round(sampleRate / 30);
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input?.length || !output?.length) return true;

    const channels = output.length;
    const blockSize = output[0].length;

    const threshold = parameters.threshold[0];
    const ratio = parameters.ratio[0];
    const attackMs = parameters.attackMs[0];
    const releaseMs = parameters.releaseMs[0];
    const makeupDb = parameters.makeupDb[0];
    const bypass = parameters.bypass[0] >= 0.5;

    const attackSamples = Math.max(1, (attackMs / 1000) * sampleRate);
    const releaseSamples = Math.max(1, (releaseMs / 1000) * sampleRate);
    const attackCoeff = 1 - Math.exp(-1 / attackSamples);
    const releaseCoeff = 1 - Math.exp(-1 / releaseSamples);
    const slope = 1 - 1 / Math.max(1.0001, ratio);
    const makeupLin = Math.pow(10, makeupDb / 20);

    let env = this.env;
    let inputPeak = 0;
    let wetPeak = 0;
    let lastGrDb = 0;
    let lastWetGain = 0;

    for (let i = 0; i < blockSize; i++) {
      let peak = 0;
      for (let c = 0; c < input.length; c++) {
        const sample = input[c] ? Math.abs(input[c][i]) : 0;
        if (sample > peak) peak = sample;
      }
      if (peak > inputPeak) inputPeak = peak;

      if (peak > env) env += (peak - env) * attackCoeff;
      else env += (peak - env) * releaseCoeff;

      const envDb = 20 * Math.log10(env + 1e-10);
      const over = envDb - threshold;
      const grDb = !bypass && over > 0 ? over * slope : 0;
      const gainLin = !bypass ? Math.pow(10, -grDb / 20) * makeupLin : 0;

      lastGrDb = grDb;
      lastWetGain = gainLin;

      for (let c = 0; c < channels; c++) {
        const inCh = input[c] || input[0];
        const outCh = output[c];
        const dry = inCh ? inCh[i] : 0;
        const wet = dry * gainLin;
        outCh[i] = wet;
        const wetAbs = Math.abs(wet);
        if (wetAbs > wetPeak) wetPeak = wetAbs;
      }
    }

    this.env = env;

    this.framesSincePost += blockSize;
    if (this.framesSincePost >= this.postEveryFrames) {
      this.framesSincePost = 0;
      this.port.postMessage({
        type: 'meter',
        threshold,
        envDb: 20 * Math.log10(env + 1e-10),
        grDb: lastGrDb,
        wetGain: lastWetGain,
        inputPeak,
        wetPeak,
      });
    }

    return true;
  }
}

registerProcessor('parallel-compressor', ParallelCompressorProcessor);
