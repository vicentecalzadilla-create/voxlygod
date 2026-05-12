import { useEffect, useState } from 'react';
import { Settings, Bookmark, Clock, LogOut, ChevronRight, Sun, Moon, Play, Pause, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAudioPlayback } from '@/audio/AudioPlaybackContext';
import type { AudioPost } from '@/data/mockData';

interface UserAudioRow {
  id: string;
  title: string;
  audio_url: string;
  duration: number | null;
  visual_effect: string | null;
  category: string | null;
}

const ProfilePage = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const playback = useAudioPlayback();
  const [myAudios, setMyAudios] = useState<UserAudioRow[]>([]);
  const [loadingAudios, setLoadingAudios] = useState(true);

  const loadMyAudios = async () => {
    setLoadingAudios(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMyAudios([]); setLoadingAudios(false); return; }
    const { data } = await supabase
      .from('audios')
      .select('id,title,audio_url,duration,visual_effect,category')
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
            { value: '24', label: 'Siguiendo' },
            { value: '156', label: 'Guardados' },
            { value: '12', label: 'Playlists' },
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
        {[
          { icon: null, emoji: '🙏', label: 'Mis Amén', count: '43' },
          { icon: Bookmark, label: 'Guardados', count: '156' },
          { icon: Clock, label: 'Historial', count: '' },
        ].map(({ icon: Icon, emoji, label, count }) => (
          <button key={label} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-card/60 transition-colors">
            {emoji ? (
              <span className="w-5 h-5 flex items-center justify-center text-lg text-primary leading-none">{emoji}</span>
            ) : (
              <Icon className="w-5 h-5 text-primary" />
            )}
            <span className="text-sm font-medium flex-1 text-left">{label}</span>
            {count && <span className="text-xs text-muted-foreground">{count}</span>}
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
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
    </div>
  );
};

export default ProfilePage;
