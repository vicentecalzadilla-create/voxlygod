// Shared audio editing utilities: WAV encoding, slicing, concatenation.

export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const samples = buffer.length;
  const blockAlign = numCh * 2;
  const dataSize = samples * blockAlign;
  const bufferSize = 44 + dataSize;
  const ab = new ArrayBuffer(bufferSize);
  const view = new DataView(ab);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) channels.push(buffer.getChannelData(c));

  let offset = 44;
  for (let i = 0; i < samples; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([ab], { type: 'audio/wav' });
}

export function sliceBuffer(ctx: AudioContext, buf: AudioBuffer, startSec: number, endSec: number): AudioBuffer {
  const sr = buf.sampleRate;
  const start = Math.max(0, Math.floor(startSec * sr));
  const end = Math.min(buf.length, Math.floor(endSec * sr));
  const len = Math.max(1, end - start);
  const out = ctx.createBuffer(buf.numberOfChannels, len, sr);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    out.getChannelData(c).set(buf.getChannelData(c).subarray(start, end));
  }
  return out;
}

export function concatBuffers(ctx: AudioContext, a: AudioBuffer, b: AudioBuffer): AudioBuffer {
  const numCh = Math.max(a.numberOfChannels, b.numberOfChannels);
  const sr = a.sampleRate;
  const ratio = b.sampleRate / sr;
  const bLen = Math.floor(b.length / ratio);
  const out = ctx.createBuffer(numCh, a.length + bLen, sr);
  for (let c = 0; c < numCh; c++) {
    const dst = out.getChannelData(c);
    const aData = a.getChannelData(Math.min(c, a.numberOfChannels - 1));
    const bData = b.getChannelData(Math.min(c, b.numberOfChannels - 1));
    dst.set(aData, 0);
    for (let i = 0; i < bLen; i++) {
      const srcIdx = i * ratio;
      const i0 = Math.floor(srcIdx);
      const frac = srcIdx - i0;
      const v0 = bData[i0] || 0;
      const v1 = bData[i0 + 1] || v0;
      dst[a.length + i] = v0 + (v1 - v0) * frac;
    }
  }
  return out;
}

let ctxSingleton: AudioContext | null = null;
export function getEditCtx(): AudioContext {
  if (!ctxSingleton) {
    ctxSingleton = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return ctxSingleton;
}

export async function decodeSource(source: Blob | string): Promise<AudioBuffer> {
  const ctx = getEditCtx();
  let ab: ArrayBuffer;
  if (typeof source === 'string') {
    const res = await fetch(source);
    ab = await res.arrayBuffer();
  } else {
    ab = await source.arrayBuffer();
  }
  return ctx.decodeAudioData(ab.slice(0));
}

export const VISUAL_EFFECTS = [
  { id: 'light-rays', label: 'Rayos de luz', emoji: '✨' },
  { id: 'cross', label: 'Cruz', emoji: '✝️' },
  { id: 'clouds', label: 'Cielo', emoji: '☁️' },
  { id: 'candles', label: 'Velas', emoji: '🕯️' },
  { id: 'bible', label: 'Biblia', emoji: '📖' },
  { id: 'starfield', label: 'Estrellas Celestiales', emoji: '🌌' },
] as const;

export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60 | 0).toString().padStart(2, '0')}`;
