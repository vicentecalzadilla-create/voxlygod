import { Home, Search, PlusCircle, ListMusic, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { path: '/', icon: Home, label: 'Inicio' },
  { path: '/discover', icon: Search, label: 'Descubrir' },
  { path: '/create', icon: PlusCircle, label: 'Crear' },
  { path: '/playlists', icon: ListMusic, label: 'Playlists' },
  { path: '/profile', icon: User, label: 'Perfil' },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname === '/login') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass glass-border border-t">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          const isCreate = path === '/create';
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 transition-all duration-300 ${
                isCreate
                  ? 'relative -mt-4'
                  : isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isCreate ? (
                <div className="w-12 h-12 rounded-full flex items-center justify-center gold-glow shadow-lg"
                  style={{ background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%))' }}>
                  <Icon className="w-6 h-6 text-primary-foreground" />
                </div>
              ) : (
                <Icon className={`w-5 h-5 ${isActive ? 'drop-shadow-[0_0_6px_hsl(38_80%_55%/0.5)]' : ''}`} />
              )}
              <span className={`text-[10px] font-medium ${isCreate ? 'gold-text' : ''}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
