import type { AudioPost } from '@/data/mockData';

export interface Affinity {
  likedIds: Set<string>;
  savedIds: Set<string>;
  followedIds: Set<string>;
}

/**
 * Reordena el feed "Para ti" según los gustos del usuario, sin llamadas extra:
 * deriva la afinidad por categoría y etiqueta a partir de los audios que el
 * usuario ya marcó (Amén/guardar) y da un fuerte empujón a creadores seguidos.
 *
 * El orden es determinista (ordenación estable con desempate por índice),
 * así no "salta" mientras el usuario hace scroll. Los audios ya escuchados/
 * marcados bajan un poco para favorecer el descubrimiento.
 */
export const personalizeFeed = (audios: AudioPost[], aff: Affinity): AudioPost[] => {
  const { likedIds, savedIds, followedIds } = aff;
  const noSignal = likedIds.size === 0 && savedIds.size === 0 && followedIds.size === 0;
  if (noSignal) return audios;

  const byId = new Map(audios.map(a => [a.id, a]));
  const categoryWeight: Record<string, number> = {};
  const tagWeight: Record<string, number> = {};

  const tally = (id: string, weight: number) => {
    const a = byId.get(id);
    if (!a) return;
    if (a.category) categoryWeight[a.category] = (categoryWeight[a.category] || 0) + weight;
    for (const t of a.tags || []) tagWeight[t] = (tagWeight[t] || 0) + weight * 0.6;
  };
  // Guardar pesa más que un Amén (intención de volver a escuchar)
  likedIds.forEach(id => tally(id, 1));
  savedIds.forEach(id => tally(id, 1.5));

  const score = (a: AudioPost): number => {
    let s = 0;
    if (a.creatorId && followedIds.has(a.creatorId)) s += 8;          // creador seguido: gran empujón
    s += categoryWeight[a.category] || 0;                            // afinidad de categoría
    for (const t of a.tags || []) s += tagWeight[t] || 0;           // afinidad de etiquetas
    if (likedIds.has(a.id) || savedIds.has(a.id)) s -= 2;           // ya interactuó: favorece descubrir
    return s;
  };

  return audios
    .map((a, i) => ({ a, i, s: score(a) }))
    .sort((x, y) => (y.s - x.s) || (x.i - y.i))
    .map(({ a }) => a);
};
