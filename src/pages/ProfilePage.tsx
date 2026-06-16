import { useEffect, useState } from 'react';
import { Settings, Bookmark, Clock, LogOut, ChevronRight, Sun, Moon, Play, Pause, Pencil, Trash2, Scissors, UserCheck } from 'lucide-react';
import AudioEditorDialog from '@/components/AudioEditorDialog';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAudioPlayback } from '@/audio/AudioPlaybackContext';
import { resolveAudios } from '@/data/resolveAudios';
import type { AudioPost } from '@/data/mockData';

interface UserAudioRow {
  id: string;
  title: string;
  audio_url: string;
  duration: number | null;
  visual_effect: string | null;
  category: string | null;
  description: string | null;
  tags: string[] | null;
  allow_immersive_effects: boolean | null;
  allow_voice_change: boolean | null;
}

const ProfilePage = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const playback = useAudioPlayback();
  const [myAudios, setMyAudios] = useState<UserAudioRow[]>([]);
  const [loadingAudios, setLoadingAudios] = useState(true);
  const [editing, setEditing] = useState<UserAudioRow | null>(null);
  const [amenIds, setAmenIds] = useState<string[]>([]);
  const [amenOpen, setAmenOpen] = useState(false);
  const [amenAudios, setAmenAudios] = useState<UserAudioRow[] | null>(null);
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  const [followsOpen, setFollowsOpen] = useState(false);
  const [followedCreators, setFollowedCreators] = useState<{ id: string; name: string; avatar: string }[] | null>(null);

  const loadFollows = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setFollowedIds([]); return; }
    const { data } = await supabase
      .from('user_follows')
      .select('followed_id')
      .eq('follower_id', user.id)
      .order('created_at', { ascending: false });
    setFollowedIds((data || []).map(r => r.followed_id));
  };

  useEffect(() => { loadFollows(); }, []);

  const toggleFollowsList = async () => {
    const next = !followsOpen;
    setFollowsOpen(next);
    if (!next || followedCreators !== null) return;
    if (followedIds.length === 0) { setFollowedCreators([]); return; }
    // El nombre/avatar del creador se toma de sus audios públicos
    const { data } = await supabase
      .from('audios')
      .select('user_id,creator_name,creator_avatar,created_at')
      .in('user_id', followedIds)
      .order('created_at', { ascending: false });
    const seen = new Map<string, { id: string; name: string; avatar: string }>();
    for (const row of data || []) {
      if (!seen.has(row.user_id)) {
        seen.set(row.user_id, { id: row.user_id, name: row.creator_name, avatar: row.creator_avatar || '🙏' });
      }
    }
    setFollowedCreators(followedIds.map(id =>
      seen.get(id) ?? { id, name: 'Creador', avatar: '🙏' }
    ));
  };

  const [savedOpen, setSavedOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [savedAudios, setSavedAudios] = useState<AudioPost[] | null>(null);

  const loadSavedCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavedCount(0); return; }
    const { count } = await supabase
      .from('audio_saves')
      .select('audio_id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    setSavedCount(count ?? 0);
  };

  useEffect(() => { loadSavedCount(); }, []);

  const toggleSavedList = async () => {
    const next = !savedOpen;
    setSavedOpen(next);
    if (!next || savedAudios !== null) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavedAudios([]); return; }
    const { data } = await supabase
      .from('audio_saves')
      .select('audio_id,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setSavedAudios(await resolveAudios((data || []).map(r => r.audio_id)));
  };

  const handleUnfollow = async (creatorId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('user_follows').delete().eq('follower_id', user.id).eq('followed_id', creatorId);
    if (error) {
      toast({ title: 'No se pudo dejar de seguir', description: error.message, variant: 'destructive' });
      return;
    }
    setFollowedIds(ids => ids.filter(id => id !== creatorId));
    setFollowedCreators(list => (list || []).filter(c => c.id !== creatorId));
  };

  const loadAmenIds = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAmenIds([]); return; }
    const { data } = await supabase
      .from('audio_likes')
      .select('audio_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setAmenIds((data || []).map(r => r.audio_id));
  };

  useEffect(() => { loadAmenIds(); }, []);

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const toggleAmenList = async () => {
    const next = !amenOpen;
    setAmenOpen(next);
    if (!next || amenAudios !== null) return;
    const realIds = amenIds.filter(id => UUID_RE.test(id));
    if (realIds.length === 0) { setAmenAudios([]); return; }
    const { data } = await supabase
      .from('audios')
      .select('id,title,audio_url,duration,visual_effect,category,description,tags,allow_immersive_effects,allow_voice_change')
      .in('id', realIds);
    // Conservar el orden de los Amén más recientes primero
    const byId = new Map((data || []).map(a => [a.id, a as UserAudioRow]));
    setAmenAudios(realIds.map(id => byId.get(id)).filter((a): a is UserAudioRow => !!a));
  };

  const handleRemoveAmen = async (a: UserAudioRow) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('audio_likes').delete().eq('user_id', user.id).eq('audio_id', a.id);
    if (error) {
      toast({ title: 'No se pudo quitar el Amén', description: error.message, variant: 'destructive' });
      return;
    }
    setAmenIds(ids => ids.filter(id => id !== a.id));
    setAmenAudios(list => (list || []).filter(x => x.id !== a.id));
  };

  const loadMyAudios = async () => {
    setLoadingAudios(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMyAudios([]); setLoadingAudios(false); return; }
    const { data } = await supabase
      .from('audios')
      .select('id,title,audio_url,duration,visual_effect,category,description,tags,allow_immersive_effects,allow_voice_change')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setMyAudios((data as UserAudioRow[]) || []);
    setLoadingAudios(false);
  };

  useEffect(() => { loadMyAudios(); }, []);

  const handlePlay = (a: UserAudioRow) => {
    const post: AudioPost = {
      id: a.id,
      title: a.title,
      description: '',
      creatorName: 'Tú',
      creatorAvatar: '🙏',
      duration: a.duration || 0,
      likes: 0, comments: 0, shares: 0,
      tags: [],
      category: a.category || 'General',
      visualEffect: (a.visual_effect || 'light-rays') as AudioPost['visualEffect'],
      isLiked: false, isSaved: false, allowImmersiveEffects: true,
      audioUrl: a.audio_url,
    };
    playback.toggleTrack(post).catch(() => {});
  };

  const handleRename = async (a: UserAudioRow) => {
    const next = window.prompt('Nuevo título', a.title);
    if (!next || next.trim() === '' || next === a.title) return;
    const { error } = await supabase.from('audios').update({ title: next.trim() }).eq('id', a.id);
    if (error) {
      toast({ title: 'No se pudo editar', description: error.message, variant: 'destructive' });
      return;
    }
    setMyAudios(list => list.map(x => x.id === a.id ? { ...x, title: next.trim() } : x));
    toast({ title: '✅ Título actualizado' });
  };

  const handleDelete = async (a: UserAudioRow) => {
    if (!window.confirm(`¿Eliminar "${a.title}"?`)) return;
    const { error } = await supabase.from('audios').delete().eq('id', a.id);
    if (error) {
      toast({ title: 'No se pudo eliminar', description: error.message, variant: 'destructive' });
      return;
    }
    setMyAudios(list => list.filter(x => x.id !== a.id));
    toast({ title: '🗑️ Audio eliminado' });
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error(error);
      toast({ title: 'No se pudo cerrar sesión', description: 'Inténtalo de nuevo.', variant: 'destructive' });
      return;
    }
    navigate('/login');
  };

  return (
    <div className="min-h-screen pb-20 pt-4 px-4 space-y-6 pointillist-bg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-xl font-bold gold-gradient">Perfil</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full card-luminous text-xs font-medium transition-all"
          >
            {theme === 'luminous' ? (
              <>
                <Sun className="w-4 h-4 text-primary" />
                <span className="gold-text">Luminoso</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-primary" />
                <span className="gold-text">Oscuro</span>
              </>
            )}
          </button>
          <button className="w-9 h-9 rounded-full bg-card/80 shadow-sm flex items-center justify-center">
            <Settings className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Avatar & info */}
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl gold-glow shadow-lg"
          style={{ background: 'linear-gradient(135deg, hsl(38 80% 55% / 0.3), hsl(340 60% 70% / 0.2), hsl(270 50% 65% / 0.15))' }}>
          🙏
        </div>
        <div>
          <h2 className="font-serif text-lg font-semibold">Usuario de Voxly</h2>
          <p className="text-xs text-muted-foreground">Escuchando la Palabra de Dios</p>
        </div>
        <div className="flex gap-8">
          {[
            { value: String(followedIds.length), label: 'Siguiendo' },
            { value: String(amenIds.length), label: 'Amén' },
            { value: String(myAudios.length), label: 'Audios' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-lg font-bold gold-text">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl card-luminous text-center space-y-1">
          <span className="text-2xl">📖</span>
          <p className="text-xs font-semibold">Racha devocional</p>
          <p className="text-lg font-bold gold-text">7 días</p>
        </div>
        <div className="p-4 rounded-xl card-luminous text-center space-y-1">
          <span className="text-2xl">⏱️</span>
          <p className="text-xs font-semibold">Tiempo escuchado</p>
          <p className="text-lg font-bold gold-text">4.2h</p>
        </div>
      </div>

      {/* Menu */}
      <div className="space-y-1">
        <button
          onClick={toggleAmenList}
          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-card/60 transition-colors"
          aria-expanded={amenOpen}
        >
          <span className="w-5 h-5 flex items-center justify-center text-lg text-primary leading-none">🙏</span>
          <span className="text-sm font-medium flex-1 text-left">Mis Amén</span>
          <span className="text-xs text-muted-foreground">{amenIds.length}</span>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${amenOpen ? 'rotate-90' : ''}`} />
        </button>
        {amenOpen && (
          <div className="space-y-2 pl-2 pb-2">
            {amenAudios === null ? (
              <p className="text-xs text-muted-foreground px-3">Cargando…</p>
            ) : amenAudios.length === 0 ? (
              <p className="text-xs text-muted-foreground px-3">Aún no le has dado Amén a ningún audio. Toca 🙏 en el feed para guardarlos aquí.</p>
            ) : (
              amenAudios.map(a => {
                const isCurrent = playback.currentTrackId === a.id;
                const playing = isCurrent && playback.isPlaying;
                return (
                  <div key={a.id} className="flex items-center gap-2 p-2.5 rounded-xl card-luminous">
                    <button
                      onClick={() => handlePlay(a)}
                      className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-primary-foreground"
                      style={{ background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%))' }}
                      aria-label={playing ? 'Pausar' : 'Reproducir'}
                    >
                      {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{a.title}</p>
                      <p className="text-[10px] text-muted-foreground">{a.category || 'General'} · {a.duration || 0}s</p>
                    </div>
                    <button
                      onClick={() => handleRemoveAmen(a)}
                      className="w-8 h-8 rounded-full hover:bg-destructive/10 flex items-center justify-center"
                      aria-label="Quitar Amén"
                      title="Quitar Amén"
                    >
                      <span className="text-sm grayscale opacity-70">🙏</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
        <button
          onClick={toggleFollowsList}
          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-card/60 transition-colors"
          aria-expanded={followsOpen}
        >
          <UserCheck className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium flex-1 text-left">Mis seguidos</span>
          <span className="text-xs text-muted-foreground">{followedIds.length}</span>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${followsOpen ? 'rotate-90' : ''}`} />
        </button>
        {followsOpen && (
          <div className="space-y-2 pl-2 pb-2">
            {followedCreators === null ? (
              <p className="text-xs text-muted-foreground px-3">Cargando…</p>
            ) : followedCreators.length === 0 ? (
              <p className="text-xs text-muted-foreground px-3">Aún no sigues a ningún creador. Toca "Seguir" en el feed para verlos aquí.</p>
            ) : (
              followedCreators.map(c => (
                <div key={c.id} className="flex items-center gap-2 p-2.5 rounded-xl card-luminous">
                  <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-gold/30 to-rose/30 flex items-center justify-center text-lg">
                    {c.avatar}
                  </div>
                  <p className="flex-1 min-w-0 text-xs font-semibold truncate">{c.name}</p>
                  <button
                    onClick={() => handleUnfollow(c.id)}
                    className="shrink-0 text-[10px] px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/20 font-medium"
                  >
                    Siguiendo
                  </button>
                </div>
              ))
            )}
          </div>
        )}
        <button
          onClick={toggleSavedList}
          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-card/60 transition-colors"
          aria-expanded={savedOpen}
        >
          <Bookmark className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium flex-1 text-left">Guardados</span>
          <span className="text-xs text-muted-foreground">{savedCount}</span>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${savedOpen ? 'rotate-90' : ''}`} />
        </button>
        {savedOpen && (
          <div className="space-y-2 pl-2 pb-2">
            {savedAudios === null ? (
              <p className="text-xs text-muted-foreground px-3">Cargando…</p>
            ) : savedAudios.length === 0 ? (
              <p className="text-xs text-muted-foreground px-3">Aún no has guardado audios. Toca el marcador 🔖 en el feed para guardarlos aquí.</p>
            ) : (
              savedAudios.map(a => {
                const isCurrent = playback.currentTrackId === a.id;
                const playing = isCurrent && playback.isPlaying;
                return (
                  <div key={a.id} className="flex items-center gap-2 p-2.5 rounded-xl card-luminous">
                    <button
                      onClick={() => playback.toggleTrack(a).catch(() => {})}
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
                  </div>
                );
              })
            )}
          </div>
        )}
        <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-card/60 transition-colors">
          <Clock className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium flex-1 text-left">Historial</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* My Audios */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-sm font-semibold gold-text">Mis Audios</h3>
          <button onClick={() => navigate('/create')} className="text-[10px] text-primary font-medium">+ Nuevo</button>
        </div>
        {loadingAudios ? (
          <p className="text-xs text-muted-foreground">Cargando…</p>
        ) : myAudios.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aún no has grabado audios. Toca "+ Nuevo" para empezar.</p>
        ) : (
          <div className="space-y-2">
            {myAudios.map(a => {
              const isCurrent = playback.currentTrackId === a.id;
              const playing = isCurrent && playback.isPlaying;
              return (
                <div key={a.id} className="flex items-center gap-2 p-2.5 rounded-xl card-luminous">
                  <button
                    onClick={() => handlePlay(a)}
                    className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-primary-foreground"
                    style={{ background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%))' }}
                    aria-label={playing ? 'Pausar' : 'Reproducir'}
                  >
                    {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{a.title}</p>
                    <p className="text-[10px] text-muted-foreground">{a.category} · {a.duration || 0}s</p>
                  </div>
                  <button onClick={() => setEditing(a)} className="w-8 h-8 rounded-full hover:bg-primary/10 flex items-center justify-center" aria-label="Editar audio">
                    <Scissors className="w-3.5 h-3.5 text-primary" />
                  </button>
                  <button onClick={() => handleRename(a)} className="w-8 h-8 rounded-full hover:bg-primary/10 flex items-center justify-center" aria-label="Editar título">
                    <Pencil className="w-3.5 h-3.5 text-primary" />
                  </button>
                  <button onClick={() => handleDelete(a)} className="w-8 h-8 rounded-full hover:bg-destructive/10 flex items-center justify-center" aria-label="Eliminar">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI section */}
      <div className="p-4 rounded-2xl glass-border space-y-3"
        style={{ background: 'linear-gradient(135deg, hsl(38 80% 55% / 0.1), hsl(270 50% 65% / 0.08), hsl(200 70% 70% / 0.06))' }}>
        <h3 className="font-serif text-sm font-semibold flex items-center gap-2">✨ Generador de oración con IA</h3>
        <p className="text-xs text-muted-foreground">Escribe tu intención y la IA creará una oración personalizada en audio.</p>
        <div className="flex gap-2">
          <input
            placeholder="Ej: Oración por mi familia..."
            className="flex-1 h-10 px-3 rounded-xl bg-card/80 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
          />
          <button className="px-4 h-10 rounded-xl text-primary-foreground text-xs font-medium shadow-sm"
            style={{ background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%))' }}>Crear</button>
        </div>
      </div>

      {/* Logout */}
      <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors text-sm">
        <LogOut className="w-4 h-4" /> Cerrar sesión
      </button>

      {editing && (
        <AudioEditorDialog
          open={!!editing}
          onOpenChange={(o) => { if (!o) setEditing(null); }}
          audio={editing}
          onSaved={() => { setEditing(null); loadMyAudios(); }}
        />
      )}
    </div>
  );
};

export default ProfilePage;
