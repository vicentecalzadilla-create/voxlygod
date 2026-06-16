import { supabase } from '@/integrations/supabase/client';
import { mockAudios, type AudioPost } from '@/data/mockData';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const rowToPost = (row: Record<string, unknown>): AudioPost => ({
  id: row.id as string,
  title: row.title as string,
  description: (row.description as string) || '',
  creatorName: row.creator_name as string,
  creatorAvatar: (row.creator_avatar as string) || '🙏',
  creatorId: row.user_id as string,
  duration: (row.duration as number) || 0,
  likes: (row.likes as number) || 0,
  comments: (row.comments as number) || 0,
  shares: (row.shares as number) || 0,
  tags: (row.tags as string[]) || [],
  verse: (row.verse as string) || undefined,
  category: (row.category as string) || 'General',
  visualEffect: ((row.visual_effect as string) || 'light-rays') as AudioPost['visualEffect'],
  isLiked: false,
  isSaved: false,
  allowImmersiveEffects: (row.allow_immersive_effects as boolean) ?? true,
  audioUrl: row.audio_url as string,
  transcript: (row.transcript as AudioPost['transcript']) || undefined,
  translations: (row.translations as AudioPost['translations']) || undefined,
});

/**
 * Resuelve una lista de ids de audio a objetos AudioPost completos,
 * conservando el orden de entrada. Mezcla audios reales (Supabase) y
 * los de ejemplo (mock) según el formato del id.
 */
export const resolveAudios = async (ids: string[]): Promise<AudioPost[]> => {
  if (ids.length === 0) return [];
  const realIds = ids.filter(id => UUID_RE.test(id));
  const byId = new Map<string, AudioPost>();
  if (realIds.length > 0) {
    const { data } = await supabase.from('audios').select('*').in('id', realIds);
    for (const row of data || []) byId.set(row.id, rowToPost(row));
  }
  for (const m of mockAudios) byId.set(m.id, m);
  return ids.map(id => byId.get(id)).filter((a): a is AudioPost => !!a);
};
