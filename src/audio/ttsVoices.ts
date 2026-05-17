export interface TtsVoiceOption {
  id: string;
  label: string;
  emoji: string;
  desc: string;
}

export const TTS_VOICES: TtsVoiceOption[] = [
  { id: 'pastor-sereno', label: 'Pastor Sereno', emoji: '🙏', desc: 'Voz masculina cálida' },
  { id: 'voz-calida-femenina', label: 'Voz Cálida Femenina', emoji: '🌸', desc: 'Suave y maternal' },
  { id: 'narrador-profundo', label: 'Narrador Profundo', emoji: '🎙️', desc: 'Grave, narrativa' },
  { id: 'voz-angelical', label: 'Voz Angelical', emoji: '✨', desc: 'Etérea y luminosa' },
];

export type TranscriptSegment = { time: number; text: string };
