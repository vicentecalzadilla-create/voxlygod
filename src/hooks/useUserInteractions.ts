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
  // Conteo real de likes por audio (fuente de verdad: tabla audio_likes).
  // null mientras carga o si la lectura pública no está disponible.
  const [likeCounts, setLikeCounts] = useState<Record<string, number> | null>(null);
  // Ajuste local del contador en esta sesión, usado solo como fallback
  const [likeDeltas, setLikeDeltas] = useState<Record<string, number>>({});
  const pending = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      setUserId(user?.id ?? null);
      const countsReq = supabase.from('audio_likes').select('audio_id');
      if (user) {
        const [likesRes, savesRes, countsRes] = await Promise.all([
          supabase.from('audio_likes').select('audio_id').eq('user_id', user.id),
          supabase.from('audio_saves').select('audio_id').eq('user_id', user.id),
          countsReq,
        ]);
        if (cancelled) return;
        if (likesRes.data) setLikedIds(new Set(likesRes.data.map(r => r.audio_id)));
        if (savesRes.data) setSavedIds(new Set(savesRes.data.map(r => r.audio_id)));
        if (countsRes.data) setLikeCounts(buildCounts(countsRes.data));
      } else {
        const countsRes = await countsReq;
        if (!cancelled && countsRes.data) setLikeCounts(buildCounts(countsRes.data));
      }
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
      const step = added ? 1 : -1;
      setLikeDeltas(prev => ({ ...prev, [audioId]: (prev[audioId] ?? 0) + step }));
      setLikeCounts(prev => prev === null ? prev : ({
        ...prev,
        [audioId]: Math.max(0, (prev[audioId] ?? 0) + step),
      }));
    });
  }, [toggle, likedIds]);

  const toggleSave = useCallback((audioId: string) => {
    void toggle('audio_saves', audioId, savedIds, setSavedIds);
  }, [toggle, savedIds]);

  return {
    isAuthenticated: !!userId,
    isLiked: (audioId: string) => likedIds.has(audioId),
    isSaved: (audioId: string) => savedIds.has(audioId),
    // Conteo real desde audio_likes; si no está disponible, cae al contador
    // del feed ajustado por los toggles de esta sesión (nunca negativo).
    likeCount: (audioId: string, fallback: number) =>
      likeCounts !== null
        ? (likeCounts[audioId] ?? 0)
        : Math.max(0, fallback + (likeDeltas[audioId] ?? 0)),
    toggleLike,
    toggleSave,
  };
};

const buildCounts = (rows: { audio_id: string }[]) => {
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.audio_id] = (counts[r.audio_id] ?? 0) + 1;
  return counts;
};

export type UserInteractions = ReturnType<typeof useUserInteractions>;
