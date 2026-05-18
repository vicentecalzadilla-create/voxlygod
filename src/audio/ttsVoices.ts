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

export type TtsProvider = 'kokoro' | 'elevenlabs';

export interface TtsProviderOption {
  id: TtsProvider;
  label: string;
  badge: string;
  desc: string;
  emoji: string;
}

export const TTS_PROVIDERS: TtsProviderOption[] = [
  { id: 'kokoro', label: 'Kokoro', badge: 'Gratis', emoji: '🌿', desc: 'IA open-source de alta calidad' },
  { id: 'elevenlabs', label: 'ElevenLabs', badge: 'Premium', emoji: '💎', desc: 'Voz ultra-realista (cupos limitados)' },
];
