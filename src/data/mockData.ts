export interface AudioPost {
  id: string;
  title: string;
  description: string;
  creatorName: string;
  creatorAvatar: string;
  duration: number; // seconds
  likes: number;
  comments: number;
  shares: number;
  tags: string[];
  verse?: string;
  category: string;
  visualEffect: 'light-rays' | 'cross' | 'clouds' | 'candles' | 'bible';
  isLiked: boolean;
  isSaved: boolean;
  allowImmersiveEffects: boolean;
  audioUrl?: string;
}

export interface Creator {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  followers: number;
  audios: number;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  audioCount: number;
  coverEffect: string;
  creator: string;
}

// Same-origin sample audios (CORS-safe for Web Audio API)
const SAMPLE_AUDIO_URLS = [
  '/samples/salmo23.mp3',
  '/samples/oracion.mp3',
  '/samples/predicacion.mp3',
  '/samples/testimonio.mp3',
  '/samples/devocional.mp3',
];

export const mockAudios: AudioPost[] = [
  {
    id: '1',
    title: 'Salmo 23 — El Señor es mi pastor',
    description: 'Una lectura serena del Salmo 23 con reflexión sobre la paz que Dios nos da en medio de las tormentas.',
    creatorName: 'Pastor David',
    creatorAvatar: '👨‍🏫',
    duration: 185,
    likes: 2340,
    comments: 156,
    shares: 89,
    tags: ['Salmos', 'Fe', 'Paz'],
    verse: 'Salmo 23:1-6',
    category: 'Lectura Bíblica',
    visualEffect: 'light-rays',
    isLiked: false,
    isSaved: false,
    allowImmersiveEffects: true,
    audioUrl: SAMPLE_AUDIO_URLS[0],
  },
  {
    id: '2',
    title: 'Oración de la mañana — Nuevo día',
    description: 'Comienza tu día con esta oración poderosa llena de gratitud y esperanza.',
    creatorName: 'María Gracia',
    creatorAvatar: '🙏',
    duration: 120,
    likes: 5420,
    comments: 312,
    shares: 245,
    tags: ['Oración', 'Mañana', 'Gratitud'],
    category: 'Oración',
    visualEffect: 'clouds',
    isLiked: true,
    isSaved: false,
    allowImmersiveEffects: true,
    audioUrl: SAMPLE_AUDIO_URLS[1],
  },
  {
    id: '3',
    title: 'La fe que mueve montañas',
    description: 'Predicación sobre Mateo 17:20 y cómo la fe del tamaño de un grano de mostaza puede cambiar tu vida.',
    creatorName: 'Pastor Samuel',
    creatorAvatar: '⛪',
    duration: 340,
    likes: 8900,
    comments: 567,
    shares: 430,
    tags: ['Fe', 'Predicación', 'Mateo'],
    verse: 'Mateo 17:20',
    category: 'Predicación',
    visualEffect: 'cross',
    isLiked: false,
    isSaved: true,
    allowImmersiveEffects: true,
    audioUrl: SAMPLE_AUDIO_URLS[2],
  },
  {
    id: '4',
    title: 'Testimonio — De la oscuridad a la luz',
    description: 'Mi testimonio personal de cómo Dios transformó mi vida completamente.',
    creatorName: 'Ana Luz',
    creatorAvatar: '✨',
    duration: 260,
    likes: 3200,
    comments: 198,
    shares: 156,
    tags: ['Testimonio', 'Transformación', 'Esperanza'],
    category: 'Testimonio',
    visualEffect: 'candles',
    isLiked: false,
    isSaved: false,
    allowImmersiveEffects: true,
    audioUrl: SAMPLE_AUDIO_URLS[3],
  },
  {
    id: '5',
    title: 'Devocional nocturno — Descansa en Él',
    description: 'Un devocional para cerrar el día en paz, descansando en las promesas de Dios.',
    creatorName: 'Pastor David',
    creatorAvatar: '👨‍🏫',
    duration: 200,
    likes: 4100,
    comments: 234,
    shares: 178,
    tags: ['Devocional', 'Noche', 'Descanso'],
    verse: 'Mateo 11:28',
    category: 'Devocional',
    visualEffect: 'bible',
    isLiked: true,
    isSaved: true,
    allowImmersiveEffects: true,
    audioUrl: SAMPLE_AUDIO_URLS[4],
  },
];

export const mockPlaylists: Playlist[] = [
  { id: '1', title: 'Devocional de la mañana', description: '7 días de reflexión matutina', audioCount: 7, coverEffect: 'clouds', creator: 'Pastor David' },
  { id: '2', title: 'Oraciones de la noche', description: 'Descansa en paz con estas oraciones', audioCount: 10, coverEffect: 'candles', creator: 'María Gracia' },
  { id: '3', title: 'Lectura de la Biblia en 1 año', description: 'Plan completo de lectura bíblica', audioCount: 365, coverEffect: 'bible', creator: 'Voxly' },
  { id: '4', title: 'Predicaciones de fe', description: 'Mensajes que fortalecen tu fe', audioCount: 15, coverEffect: 'cross', creator: 'Pastor Samuel' },
];

export const categories = ['Para ti', 'Trending', 'Descubre', 'Salmos', 'Oraciones', 'Predicaciones', 'Testimonios', 'Devocionales', 'Alabanzas'];
