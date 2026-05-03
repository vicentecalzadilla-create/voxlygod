import { Settings, Heart, Bookmark, Clock, LogOut, ChevronRight } from 'lucide-react';

const ProfilePage = () => {
  return (
    <div className="min-h-screen pb-20 pt-4 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-xl font-bold gold-gradient">Perfil</h1>
        <button className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Avatar & info */}
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/40 to-accent/30 flex items-center justify-center text-3xl gold-glow">
          🙏
        </div>
        <div>
          <h2 className="font-serif text-lg font-semibold">Usuario de Voxly</h2>
          <p className="text-xs text-muted-foreground">Escuchando la Palabra de Dios</p>
        </div>
        <div className="flex gap-8">
          <div className="text-center">
            <p className="text-lg font-bold gold-text">24</p>
            <p className="text-[10px] text-muted-foreground">Siguiendo</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold gold-text">156</p>
            <p className="text-[10px] text-muted-foreground">Guardados</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold gold-text">12</p>
            <p className="text-[10px] text-muted-foreground">Playlists</p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-card glass-border text-center space-y-1">
          <span className="text-2xl">📖</span>
          <p className="text-xs font-semibold">Racha devocional</p>
          <p className="text-lg font-bold gold-text">7 días</p>
        </div>
        <div className="p-4 rounded-xl bg-card glass-border text-center space-y-1">
          <span className="text-2xl">⏱️</span>
          <p className="text-xs font-semibold">Tiempo escuchado</p>
          <p className="text-lg font-bold gold-text">4.2h</p>
        </div>
      </div>

      {/* Menu */}
      <div className="space-y-1">
        {[
          { icon: Heart, label: 'Mis favoritos', count: '43' },
          { icon: Bookmark, label: 'Guardados', count: '156' },
          { icon: Clock, label: 'Historial', count: '' },
        ].map(({ icon: Icon, label, count }) => (
          <button key={label} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors">
            <Icon className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium flex-1 text-left">{label}</span>
            {count && <span className="text-xs text-muted-foreground">{count}</span>}
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      {/* AI section */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 glass-border space-y-3">
        <h3 className="font-serif text-sm font-semibold flex items-center gap-2">✨ Generador de oración con IA</h3>
        <p className="text-xs text-muted-foreground">Escribe tu intención y la IA creará una oración personalizada en audio.</p>
        <div className="flex gap-2">
          <input
            placeholder="Ej: Oración por mi familia..."
            className="flex-1 h-10 px-3 rounded-xl bg-secondary text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button className="px-4 h-10 rounded-xl bg-primary text-primary-foreground text-xs font-medium">Crear</button>
        </div>
      </div>

      {/* Logout */}
      <button className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors text-sm">
        <LogOut className="w-4 h-4" /> Cerrar sesión
      </button>
    </div>
  );
};

export default ProfilePage;
