import { useEffect, useState } from 'react';
import { Plus, Play, Pause, ChevronRight, ArrowLeft, Trash2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAudioPlayback } from '@/audio/AudioPlaybackContext';
import { resolveAudios } from '@/data/resolveAudios';
import type { AudioPost } from '@/data/mockData';

interface PlaylistRow {
  id: string;
  title: string;
  cover_emoji: string | null;
  count: number;
}

const PlaylistsPage = () => {
  const playback = useAudioPlayback();
  const [activeTab, setActiveTab] = useState<'mine' | 'saved'>('mine');
  const [playlists, setPlaylists] = useState<PlaylistRow[]>([]);
  const [saved, setSaved] = useState<AudioPost[] | null>(null);
  const [loading, setLoading] = useState(true);
  // Playlist abierta y sus audios
  const [openPl, setOpenPl] = useState<PlaylistRow | null>(null);
  const [openItems, setOpenItems] = useState<AudioPost[] | null>(null);
  const [adding, setAdding] = useState(false);

  const loadPlaylists = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setPlaylists([]); return; }
    const { data } = await supabase
      .from('playlists')
      .select('id,title,cover_emoji,playlist_items(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setPlaylists((data || []).map((p: any) => ({
      id: p.id, title: p.title, cover_emoji: p.cover_emoji,
      count: p.playlist_items?.[0]?.count ?? 0,
    })));
  };

  const loadSaved = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaved([]); return; }
    const { data } = await supabase
      .from('audio_saves')
      .select('audio_id,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setSaved(await resolveAudios((data || []).map(r => r.audio_id)));
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadPlaylists(), loadSaved()]);
      setLoading(false);
    })();
  }, []);

  const play = (a: AudioPost) => { playback.toggleTrack(a).catch(() => {}); };

  const handleCreate = async () => {
    const title = window.prompt('Nombre de la playlist');
    if (!title || !title.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('playlists').insert({ user_id: user.id, title: title.trim() });
    if (error) { toast({ title: 'No se pudo crear', description: error.message, variant: 'destructive' }); return; }
    toast({ title: '✅ Playlist creada' });
    loadPlaylists();
  };

  const handleDeletePlaylist = async (pl: PlaylistRow) => {
    if (!window.confirm(`¿Eliminar la playlist "${pl.title}"?`)) return;
    const { error } = await supabase.from('playlists').delete().eq('id', pl.id);
    if (error) { toast({ title: 'No se pudo eliminar', description: error.message, variant: 'destructive' }); return; }
    setPlaylists(list => list.filter(p => p.id !== pl.id));
  };

  const openPlaylist = async (pl: PlaylistRow) => {
    setOpenPl(pl);
    setOpenItems(null);
    setAdding(false);
    const { data } = await supabase
      .from('playlist_items')
      .select('audio_id,created_at')
      .eq('playlist_id', pl.id)
      .order('created_at', { ascending: true });
    setOpenItems(await resolveAudios((data || []).map(r => r.audio_id)));
  };

  const idsInOpen = new Set((openItems || []).map(a => a.id));

  const addToOpen = async (a: AudioPost) => {
    if (!openPl || idsInOpen.has(a.id)) return;
    const { error } = await supabase.from('playlist_items').insert({ playlist_id: openPl.id, audio_id: a.id });
    if (error) { toast({ description: 'No se pudo añadir', duration: 2000 }); return; }
    setOpenItems(list => [...(list || []), a]);
    setPlaylists(list => list.map(p => p.id === openPl.id ? { ...p, count: p.count + 1 } : p));
  };

  const removeFromOpen = async (a: AudioPost) => {
    if (!openPl) return;
    const { error } = await supabase.from('playlist_items').delete().eq('playlist_id', openPl.id).eq('audio_id', a.id);
    if (error) { toast({ description: 'No se pudo quitar', duration: 2000 }); return; }
    setOpenItems(list => (list || []).filter(x => x.id !== a.id));
    setPlaylists(list => list.map(p => p.id === openPl.id ? { ...p, count: Math.max(0, p.count - 1) } : p));
  };

  const AudioRow = ({ a, right }: { a: AudioPost; right?: React.ReactNode }) => {
    const isCurrent = playback.currentTrackId === a.id;
    const playing = isCurrent && playback.isPlaying;
    return (
      <div className="flex items-center gap-3 p-2.5 rounded-xl card-luminous">
        <button
          onClick={() => play(a)}
          className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-primary-foreground"
          style={{ background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%))' }}
          aria-label={playing ? 'Pausar' : 'Reproducir'}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">{a.title}</p>
          <p className="text-[10px] text-muted-foreground truncate">{a.creatorName}</p>
        </div>
        {right}
      </div>
    );
  };

  // --- Vista de una playlist abierta ---
  if (openPl) {
    const available = (saved || []).filter(a => !idsInOpen.has(a.id));
    return (
      <div className="min-h-screen pb-20 pt-4 px-4 space-y-4 pointillist-bg">
        <div className="flex items-center gap-3">
          <button onClick={() => { setOpenPl(null); setOpenItems(null); }} aria-label="Volver"
            className="w-9 h-9 rounded-full bg-card/80 shadow-sm flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl">{openPl.cover_emoji || '✝️'}</span>
            <h1 className="font-serif text-lg font-bold truncate">{openPl.title}</h1>
          </div>
        </div>

        {openItems === null ? (
          <p className="text-xs text-muted-foreground">Cargando…</p>
        ) : openItems.length === 0 ? (
          <p className="text-xs text-muted-foreground">Esta playlist está vacía. Añade audios desde tus guardados abajo. 👇</p>
        ) : (
          <div className="space-y-2">
            {openItems.map(a => (
              <AudioRow key={a.id} a={a} right={
                <button onClick={() => removeFromOpen(a)} className="w-8 h-8 rounded-full hover:bg-destructive/10 flex items-center justify-center" aria-label="Quitar de la playlist">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              } />
            ))}
          </div>
        )}

        <div className="pt-2">
          <button onClick={() => setAdding(o => !o)} className="text-xs font-medium gold-text flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> {adding ? 'Listo' : 'Añadir desde mis guardados'}
          </button>
          {adding && (
            <div className="space-y-2 mt-3">
              {available.length === 0 ? (
                <p className="text-xs text-muted-foreground">No tienes más audios guardados para añadir. Guarda audios con el marcador 🔖 en el feed.</p>
              ) : available.map(a => (
                <AudioRow key={a.id} a={a} right={
                  <button onClick={() => addToOpen(a)} className="shrink-0 text-[10px] px-2.5 py-1 rounded-full text-primary-foreground font-medium flex items-center gap-1"
                    style={{ background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%))' }}>
                    <Plus className="w-3 h-3" /> Añadir
                  </button>
                } />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Vista principal ---
  return (
    <div className="min-h-screen pb-20 pt-4 px-4 space-y-5 pointillist-bg">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-xl font-bold gold-gradient">Playlists</h1>
        <button onClick={handleCreate} aria-label="Crear playlist" className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm"
          style={{ background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%))' }}>
          <Plus className="w-5 h-5 text-primary-foreground" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['mine', 'saved'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 h-9 rounded-xl text-xs font-medium transition-all ${
              activeTab === tab ? 'text-primary-foreground shadow-sm' : 'bg-secondary/70 text-secondary-foreground'
            }`}
            style={activeTab === tab ? { background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%))' } : undefined}
          >
            {tab === 'mine' ? 'Mis Playlists' : 'Guardados'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Cargando…</p>
      ) : activeTab === 'mine' ? (
        <div className="space-y-3">
          {playlists.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aún no tienes playlists. Toca el botón ➕ para crear la primera.</p>
          ) : playlists.map(pl => (
            <div key={pl.id} className="flex items-center gap-3 p-3 rounded-xl card-luminous hover:shadow-md transition-all">
              <button onClick={() => openPlaylist(pl)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                <div className="w-14 h-14 rounded-lg flex items-center justify-center text-2xl shrink-0"
                  style={{ background: 'linear-gradient(135deg, hsl(38 80% 55% / 0.15), hsl(270 50% 65% / 0.1))' }}>
                  {pl.cover_emoji || '✝️'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{pl.title}</p>
                  <p className="text-[10px] text-muted-foreground">{pl.count} audio{pl.count === 1 ? '' : 's'}</p>
                </div>
              </button>
              <button onClick={() => handleDeletePlaylist(pl)} className="w-8 h-8 rounded-full hover:bg-destructive/10 flex items-center justify-center shrink-0" aria-label="Eliminar playlist">
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </button>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {(saved || []).length === 0 ? (
            <p className="text-xs text-muted-foreground">Aún no has guardado audios. Toca el marcador 🔖 en el feed para guardarlos aquí.</p>
          ) : (saved || []).map(a => (
            <AudioRow key={a.id} a={a} right={<Check className="w-4 h-4 text-primary shrink-0" />} />
          ))}
        </div>
      )}
    </div>
  );
};

export default PlaylistsPage;
