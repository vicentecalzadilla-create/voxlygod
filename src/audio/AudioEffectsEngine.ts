export type EffectType =
  | 'none'
  | 'reverb-cathedral'
  | 'echo-celestial'
  | 'choir-background'
  | 'nature-ambience'
  | 'angelic-voice'
  | 'depth-3d'
  | 'soft-echo';

export interface EffectInfo {
  id: EffectType;
  label: string;
  emoji: string;
  description: string;
}

export const EFFECTS_LIST: EffectInfo[] = [
  { id: 'none', label: 'Original', emoji: '🎵', description: 'Sin efectos' },
  { id: 'reverb-cathedral', label: 'Reverb Catedral', emoji: '⛪', description: 'Eco espiritual grande' },
  { id: 'echo-celestial', label: 'Eco Celestial', emoji: '✨', description: 'Suave y etéreo' },
  { id: 'choir-background', label: 'Coro de Fondo', emoji: '👼', description: 'Ángeles suaves' },
  { id: 'nature-ambience', label: 'Naturaleza', emoji: '🌿', description: 'Lluvia, viento, olas' },
  { id: 'angelic-voice', label: 'Voz Angelical', emoji: '🕊️', description: 'Brillo en la voz' },
  { id: 'depth-3d', label: 'Profundidad 3D', emoji: '🌀', description: 'Efecto espacial' },
  { id: 'soft-echo', label: 'Eco Suave', emoji: '💫', description: 'Eco ligero y cálido' },
];

class AudioEffectsEngine {
  private ctx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private sourceNodes = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();
  private currentEffect: EffectType = 'none';
  private connectedElement: HTMLAudioElement | null = null;
  private effectNodes: AudioNode[] = [];
  private noiseSource: AudioBufferSourceNode | null = null;
  private lfoNode: OscillatorNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private analyserData: Uint8Array | null = null;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  /** Connect an <audio> element to the Web Audio API graph */
  connectAudio(audio: HTMLAudioElement): void {
    if (this.connectedElement === audio && this.sourceNode) return;

    this.disconnectAll();
    const ctx = this.getContext();
    if (ctx.state === 'suspended') ctx.resume();

    this.connectedElement = audio;
    const existingSource = this.sourceNodes.get(audio);
    this.sourceNode = existingSource || ctx.createMediaElementSource(audio);
    if (!existingSource) this.sourceNodes.set(audio, this.sourceNode);
    this.rebuildGraph();
  }

  /** Disconnect all effect nodes */
  private disconnectAll(): void {
    try { this.noiseSource?.stop(); } catch {}
    try { this.lfoNode?.stop(); } catch {}
    this.noiseSource = null;
    this.lfoNode = null;

    for (const node of this.effectNodes) {
      try { node.disconnect(); } catch {}
    }
    this.effectNodes = [];
    try { this.analyserNode?.disconnect(); } catch {}
    this.analyserNode = null;
    this.analyserData = null;

    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch {}
    }
  }

  private generateImpulseResponse(duration: number, decay: number): AudioBuffer {
    const ctx = this.getContext();
    const length = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return buffer;
  }

  private generateNoiseBuffer(duration: number): AudioBuffer {
    const ctx = this.getContext();
    const length = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  /** Rebuild the audio graph with the current effect */
  private rebuildGraph(): void {
    if (!this.sourceNode) return;
    const ctx = this.getContext();

    // Disconnect existing effect nodes
    try { this.noiseSource?.stop(); } catch {}
    try { this.lfoNode?.stop(); } catch {}
    this.noiseSource = null;
    this.lfoNode = null;
    for (const node of this.effectNodes) {
      try { node.disconnect(); } catch {}
    }
    this.effectNodes = [];
    try { this.sourceNode.disconnect(); } catch {}

    let lastNode: AudioNode = this.sourceNode;

    switch (this.currentEffect) {
      case 'reverb-cathedral': {
        const convolver = ctx.createConvolver();
        convolver.buffer = this.generateImpulseResponse(4, 2);
        const wetGain = ctx.createGain();
        wetGain.gain.value = 0.55;
        const dryGain = ctx.createGain();
        dryGain.gain.value = 0.45;
        const merger = ctx.createGain();

        lastNode.connect(dryGain);
        lastNode.connect(convolver);
        convolver.connect(wetGain);
        dryGain.connect(merger);
        wetGain.connect(merger);
        this.effectNodes.push(convolver, wetGain, dryGain, merger);
        lastNode = merger;
        break;
      }
      case 'echo-celestial': {
        const delay = ctx.createDelay(2);
        delay.delayTime.value = 0.5;
        const feedback = ctx.createGain();
        feedback.gain.value = 0.4;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2000;
        const merger = ctx.createGain();

        lastNode.connect(merger);
        lastNode.connect(delay);
        delay.connect(filter);
        filter.connect(feedback);
        feedback.connect(delay);
        filter.connect(merger);
        this.effectNodes.push(delay, feedback, filter, merger);
        lastNode = merger;
        break;
      }
      case 'choir-background': {
        const convolver = ctx.createConvolver();
        convolver.buffer = this.generateImpulseResponse(3, 3);
        const wetGain = ctx.createGain();
        wetGain.gain.value = 0.5;
        const dryGain = ctx.createGain();
        dryGain.gain.value = 0.5;
        const merger = ctx.createGain();

        // Add subtle chorus detuning via delay modulation
        const chorusDelay = ctx.createDelay(0.1);
        chorusDelay.delayTime.value = 0.02;
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.5;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.005;
        lfo.connect(lfoGain);
        lfoGain.connect(chorusDelay.delayTime);
        lfo.start();
        this.lfoNode = lfo;

        lastNode.connect(dryGain);
        lastNode.connect(chorusDelay);
        chorusDelay.connect(convolver);
        convolver.connect(wetGain);
        dryGain.connect(merger);
        wetGain.connect(merger);
        this.effectNodes.push(convolver, wetGain, dryGain, chorusDelay, lfoGain, merger);
        lastNode = merger;
        break;
      }
      case 'nature-ambience': {
        // Pass audio through + add ambient noise
        const merger = ctx.createGain();
        lastNode.connect(merger);

        const noiseGain = ctx.createGain();
        noiseGain.gain.value = 0.08;
        const noise = ctx.createBufferSource();
        noise.buffer = this.generateNoiseBuffer(10);
        noise.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 600;
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(merger);
        noise.start();
        this.noiseSource = noise;
        this.effectNodes.push(noiseGain, filter, merger);
        lastNode = merger;
        break;
      }
      case 'angelic-voice': {
        const filter = ctx.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = 3000;
        filter.gain.value = 8;
        filter.Q.value = 1;
        const convolver = ctx.createConvolver();
        convolver.buffer = this.generateImpulseResponse(1.5, 4);
        const shimmerGain = ctx.createGain();
        shimmerGain.gain.value = 0.3;
        const merger = ctx.createGain();

        lastNode.connect(filter);
        filter.connect(merger);
        filter.connect(convolver);
        convolver.connect(shimmerGain);
        shimmerGain.connect(merger);
        this.effectNodes.push(filter, convolver, shimmerGain, merger);
        lastNode = merger;
        break;
      }
      case 'depth-3d': {
        const panner = ctx.createStereoPanner();
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.3;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 1;
        lfo.connect(lfoGain);
        lfoGain.connect(panner.pan);
        lfo.start();
        this.lfoNode = lfo;

        const convolver = ctx.createConvolver();
        convolver.buffer = this.generateImpulseResponse(2, 3);
        const wet = ctx.createGain();
        wet.gain.value = 0.3;
        const merger = ctx.createGain();

        lastNode.connect(panner);
        panner.connect(merger);
        panner.connect(convolver);
        convolver.connect(wet);
        wet.connect(merger);
        this.effectNodes.push(panner, lfoGain, convolver, wet, merger);
        lastNode = merger;
        break;
      }
      case 'soft-echo': {
        const delay = ctx.createDelay(1);
        delay.delayTime.value = 0.25;
        const feedback = ctx.createGain();
        feedback.gain.value = 0.3;
        const merger = ctx.createGain();

        lastNode.connect(merger);
        lastNode.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(merger);
        this.effectNodes.push(delay, feedback, merger);
        lastNode = merger;
        break;
      }
      default:
        // No effect - direct connection
        break;
    }

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.82;
    this.analyserNode = analyser;
    this.analyserData = new Uint8Array(analyser.frequencyBinCount);
    lastNode.connect(analyser);
    analyser.connect(ctx.destination);
  }

  applyEffect(effect: EffectType): void {
    this.currentEffect = effect;
    if (this.sourceNode) {
      this.rebuildGraph();
    }
  }

  getCurrentEffect(): EffectType {
    return this.currentEffect;
  }

  resume(): void {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  getLevel(): number {
    if (!this.analyserNode || !this.analyserData) return 0;
    this.analyserNode.getByteFrequencyData(this.analyserData);
    const sum = this.analyserData.reduce((total, value) => total + value, 0);
    return Math.min(1, sum / (this.analyserData.length * 180));
  }

  dispose(): void {
    this.disconnectAll();
    this.sourceNode = null;
    this.connectedElement = null;
    this.ctx?.close();
    this.ctx = null;
  }
}

// Singleton
let engineInstance: AudioEffectsEngine | null = null;

export function getAudioEffectsEngine(): AudioEffectsEngine {
  if (!engineInstance) {
    engineInstance = new AudioEffectsEngine();
  }
  return engineInstance;
}

export default AudioEffectsEngine;
