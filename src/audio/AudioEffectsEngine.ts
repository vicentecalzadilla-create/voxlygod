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
  private sourceNode: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private convolverNode: ConvolverNode | null = null;
  private delayNode: DelayNode | null = null;
  private feedbackNode: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private pannerNode: StereoPannerNode | null = null;
  private lfoNode: OscillatorNode | null = null;
  private lfoGainNode: GainNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private noiseGainNode: GainNode | null = null;
  private currentEffect: EffectType = 'none';
  private isPlaying = false;

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  private generateImpulseResponse(duration: number, decay: number, reverse = false): AudioBuffer {
    const ctx = this.getContext();
    const length = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const n = reverse ? length - i : i;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
      }
    }
    return buffer;
  }

  private generateNoiseBuffer(duration: number): AudioBuffer {
    const ctx = this.getContext();
    const length = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Pink-ish noise for nature ambience
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  private disconnectAll() {
    try {
      this.sourceNode?.stop();
      this.sourceNode?.disconnect();
    } catch {}
    try {
      this.lfoNode?.stop();
      this.lfoNode?.disconnect();
    } catch {}
    try {
      this.noiseNode?.stop();
      this.noiseNode?.disconnect();
    } catch {}
    this.convolverNode?.disconnect();
    this.delayNode?.disconnect();
    this.feedbackNode?.disconnect();
    this.filterNode?.disconnect();
    this.pannerNode?.disconnect();
    this.gainNode?.disconnect();
    this.lfoGainNode?.disconnect();
    this.noiseGainNode?.disconnect();
    this.sourceNode = null;
    this.lfoNode = null;
    this.noiseNode = null;
  }

  applyEffect(effect: EffectType): void {
    this.currentEffect = effect;
    if (this.isPlaying) {
      this.stop();
      this.play();
    }
  }

  play(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const ctx = this.getContext();
    if (ctx.state === 'suspended') ctx.resume();

    // Create a demo tone source (in real app, this would be the audio element)
    this.sourceNode = ctx.createOscillator();
    this.sourceNode.type = 'sine';
    this.sourceNode.frequency.value = 440;

    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 0.15;

    let lastNode: AudioNode = this.sourceNode;

    switch (this.currentEffect) {
      case 'reverb-cathedral': {
        this.convolverNode = ctx.createConvolver();
        this.convolverNode.buffer = this.generateImpulseResponse(4, 2);
        const wetGain = ctx.createGain();
        wetGain.gain.value = 0.6;
        const dryGain = ctx.createGain();
        dryGain.gain.value = 0.4;
        lastNode.connect(dryGain);
        lastNode.connect(this.convolverNode);
        this.convolverNode.connect(wetGain);
        dryGain.connect(this.gainNode);
        wetGain.connect(this.gainNode);
        lastNode = this.gainNode;
        break;
      }
      case 'echo-celestial': {
        this.delayNode = ctx.createDelay(2);
        this.delayNode.delayTime.value = 0.5;
        this.feedbackNode = ctx.createGain();
        this.feedbackNode.gain.value = 0.4;
        this.filterNode = ctx.createBiquadFilter();
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.value = 2000;
        lastNode.connect(this.gainNode);
        lastNode.connect(this.delayNode);
        this.delayNode.connect(this.filterNode);
        this.filterNode.connect(this.feedbackNode);
        this.feedbackNode.connect(this.delayNode);
        this.filterNode.connect(this.gainNode);
        lastNode = this.gainNode;
        break;
      }
      case 'choir-background': {
        // Chorus-like effect with detuned copies
        const choirGain1 = ctx.createGain();
        choirGain1.gain.value = 0.08;
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = 442;
        osc2.start();
        const osc3 = ctx.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.value = 438;
        osc3.start();
        this.convolverNode = ctx.createConvolver();
        this.convolverNode.buffer = this.generateImpulseResponse(3, 3);
        lastNode.connect(this.gainNode);
        osc2.connect(choirGain1);
        osc3.connect(choirGain1);
        choirGain1.connect(this.convolverNode);
        this.convolverNode.connect(this.gainNode);
        lastNode = this.gainNode;
        // Store for cleanup
        this.lfoNode = osc2;
        break;
      }
      case 'nature-ambience': {
        this.noiseGainNode = ctx.createGain();
        this.noiseGainNode.gain.value = 0.12;
        this.noiseNode = ctx.createBufferSource();
        this.noiseNode.buffer = this.generateNoiseBuffer(10);
        this.noiseNode.loop = true;
        this.filterNode = ctx.createBiquadFilter();
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.value = 800;
        this.noiseNode.connect(this.filterNode);
        this.filterNode.connect(this.noiseGainNode);
        this.noiseGainNode.connect(this.gainNode);
        this.noiseNode.start();
        lastNode.connect(this.gainNode);
        lastNode = this.gainNode;
        break;
      }
      case 'angelic-voice': {
        this.filterNode = ctx.createBiquadFilter();
        this.filterNode.type = 'peaking';
        this.filterNode.frequency.value = 3000;
        this.filterNode.gain.value = 8;
        this.filterNode.Q.value = 1;
        this.convolverNode = ctx.createConvolver();
        this.convolverNode.buffer = this.generateImpulseResponse(1.5, 4);
        const shimmerGain = ctx.createGain();
        shimmerGain.gain.value = 0.3;
        lastNode.connect(this.filterNode);
        this.filterNode.connect(this.gainNode);
        this.filterNode.connect(this.convolverNode);
        this.convolverNode.connect(shimmerGain);
        shimmerGain.connect(this.gainNode);
        lastNode = this.gainNode;
        break;
      }
      case 'depth-3d': {
        this.pannerNode = ctx.createStereoPanner();
        this.lfoNode = ctx.createOscillator();
        this.lfoNode.type = 'sine';
        this.lfoNode.frequency.value = 0.3;
        this.lfoGainNode = ctx.createGain();
        this.lfoGainNode.gain.value = 1;
        this.lfoNode.connect(this.lfoGainNode);
        this.lfoGainNode.connect(this.pannerNode.pan);
        this.lfoNode.start();
        this.convolverNode = ctx.createConvolver();
        this.convolverNode.buffer = this.generateImpulseResponse(2, 3);
        const wet3d = ctx.createGain();
        wet3d.gain.value = 0.35;
        lastNode.connect(this.pannerNode);
        this.pannerNode.connect(this.gainNode);
        this.pannerNode.connect(this.convolverNode);
        this.convolverNode.connect(wet3d);
        wet3d.connect(this.gainNode);
        lastNode = this.gainNode;
        break;
      }
      case 'soft-echo': {
        this.delayNode = ctx.createDelay(1);
        this.delayNode.delayTime.value = 0.25;
        this.feedbackNode = ctx.createGain();
        this.feedbackNode.gain.value = 0.3;
        lastNode.connect(this.gainNode);
        lastNode.connect(this.delayNode);
        this.delayNode.connect(this.feedbackNode);
        this.feedbackNode.connect(this.delayNode);
        this.delayNode.connect(this.gainNode);
        lastNode = this.gainNode;
        break;
      }
      default:
        lastNode.connect(this.gainNode);
        lastNode = this.gainNode;
    }

    lastNode.connect(ctx.destination);
    this.sourceNode.start();
  }

  stop(): void {
    this.isPlaying = false;
    this.disconnectAll();
  }

  getCurrentEffect(): EffectType {
    return this.currentEffect;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  dispose(): void {
    this.stop();
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
