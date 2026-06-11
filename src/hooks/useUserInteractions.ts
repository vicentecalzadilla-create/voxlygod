import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Likes (Amén) y guardados persistentes por usuario.
 * Carga una sola vez los ids marcados por el usuario autenticado y
 * expone toggles con actualización optimista contra Supabase.
 */
export const useUserInteractions = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  // Ajuste local del contador de likes en esta sesión. El conteo público
  // vive en audios.likes (lo mantiene un trigger en la base de datos);
  // las filas de audio_likes son privadas de cada usuario.
  const [likeDeltas, setLikeDeltas] = useState<Record<string, number>>({});
  const pending = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      setUserId(user?.id ?? null);
      if (!user) return;
      const [likesRes, savesRes] = await Promise.all([
        supabase.from('audio_likes').select('audio_id').eq('user_id', user.id),
        supabase.from('audio_saves').select('audio_id').eq('user_id', user.id),
      ]);
      if (cancelled) return;
      if (likesRes.data) setLikedIds(new Set(likesRes.data.map(r => r.audio_id)));
      if (savesRes.data) setSavedIds(new Set(savesRes.data.map(r => r.audio_id)));
    })();
    return () => { cancelled = true; };
  }, []);

  const requireAuth = useCallback(() => {
    if (userId) return true;
    toast({ description: 'Inicia sesión para guardar tus reacciones', duration: 2500 });
    return false;
  }, [userId]);

  const toggle = useCallback(async (
    table: 'audio_likes' | 'audio_saves',
    audioId: string,
    set: Set<string>,
    update: React.Dispatch<React.SetStateAction<Set<string>>>,
    onApplied?: (added: boolean) => void,
  ) => {
    if (!requireAuth() || !userId) return;
    const key = `${table}:${audioId}`;
    if (pending.current.has(key)) return;
    pending.current.add(key);
    const adding = !set.has(audioId);
    // Optimista
    update(prev => {
      const next = new Set(prev);
      if (adding) next.add(audioId); else next.delete(audioId);
      return next;
    });
    onApplied?.(adding);
    const { error } = adding
      ? await supabase.from(table).insert({ user_id: userId, audio_id: audioId })
      : await supabase.from(table).delete().eq('user_id', userId).eq('audio_id', audioId);
    pending.current.delete(key);
    if (error) {
      // Revertir si falló
      update(prev => {
        const next = new Set(prev);
        if (adding) next.delete(audioId); else next.add(audioId);
        return next;
      });
      onApplied?.(!adding);
      toast({ description: 'No se pudo guardar tu reacción. Intenta de nuevo.', duration: 2500 });
    }
  }, [userId, requireAuth]);

  const toggleLike = useCallback((audioId: string) => {
    void toggle('audio_likes', audioId, likedIds, setLikedIds, (added) => {
      setLikeDeltas(prev => ({ ...prev, [audioId]: (prev[audioId] ?? 0) + (added ? 1 : -1) }));
    });
  }, [toggle, likedIds]);

  const toggleSave = useCallback((audioId: string) => {
    void toggle('audio_saves', audioId, savedIds, setSavedIds);
  }, [toggle, savedIds]);

  return {
    isAuthenticated: !!userId,
    isLiked: (audioId: string) => likedIds.has(audioId),
    isSaved: (audioId: string) => savedIds.has(audioId),
    // Contador del feed ajustado por los toggles de esta sesión (nunca negativo)
    likeCount: (audioId: string, fallback: number) =>
      Math.max(0, fallback + (likeDeltas[audioId] ?? 0)),
    toggleLike,
    toggleSave,
  };
};

export type UserInteractions = ReturnType<typeof useUserInteractions>;
