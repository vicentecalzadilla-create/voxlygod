import { useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import logoImage from '@/assets/voxly-logo.png';

const LoginPage = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-end overflow-hidden">
      {/* Background - luminous pointillist */}
      <div className="absolute inset-0 pointillist-bg"
        style={{
          background: 'linear-gradient(165deg, hsl(200 70% 88%) 0%, hsl(340 40% 90%) 40%, hsl(38 50% 88%) 70%, hsl(270 40% 90%) 100%)'
        }}
      />
      {/* Floating sparkles */}
      {Array.from({ length: 15 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${3 + Math.random() * 5}px`,
            height: `${3 + Math.random() * 5}px`,
            backgroundColor: ['hsl(38 80% 65%)', 'hsl(340 60% 72%)', 'hsl(200 70% 70%)', 'hsl(270 50% 68%)'][i % 4],
            left: `${10 + Math.random() * 80}%`,
            top: `${10 + Math.random() * 60}%`,
            animation: `sparkle ${3 + Math.random() * 3}s ease-in-out infinite, drift ${5 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 4}s`,
            filter: 'blur(0.5px)',
            boxShadow: `0 0 8px ${['hsl(38 80% 65%)', 'hsl(340 60% 72%)', 'hsl(200 70% 70%)', 'hsl(270 50% 68%)'][i % 4]}`,
          }}
        />
      ))}

      <div className="relative w-full max-w-sm mx-auto px-6 pb-12 space-y-8" style={{ animation: 'fade-in-up 0.8s ease-out' }}>
        {/* Logo */}
        <div className="text-center space-y-2">
          <img src={logoImage} alt="Voxly" className="h-16 mx-auto" />
          <p className="text-sm text-muted-foreground font-medium">La Palabra de Dios en tu oído</p>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-3 h-12 rounded-xl bg-foreground text-card font-medium text-sm transition-transform active:scale-[0.98] shadow-md"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continuar con Google
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-3 h-12 rounded-xl border border-border text-foreground font-medium text-sm transition-all hover:bg-card/60 active:scale-[0.98] shadow-sm bg-card/40"
          >
            <Mail className="w-5 h-5" />
            Continuar con Email
          </button>
        </div>

        <p className="text-center text-[10px] text-muted-foreground leading-relaxed">
          Al continuar, aceptas nuestros Términos de Servicio y Política de Privacidad
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
