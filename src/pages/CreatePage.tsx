import { useState } from 'react';
import { Mic, Upload, Wand2, X, Sparkles, Volume2 } from 'lucide-react';
import { EFFECTS_LIST, getAudioEffectsEngine, type EffectType } from '@/audio/AudioEffectsEngine';

const visualEffects = [
  { id: 'light-rays', label: 'Rayos de luz', emoji: '✨' },
  { id: 'cross', label: 'Cruz', emoji: '✝️' },
  { id: 'clouds', label: 'Cielo', emoji: '☁️' },
  { id: 'candles', label: 'Velas', emoji: '🕯️' },
  { id: 'bible', label: 'Biblia', emoji: '📖' },
];

const CreatePage = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [selectedEffect, setSelectedEffect] = useState('light-rays');
  const [isRecording, setIsRecording] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [allowVoiceChange, setAllowVoiceChange] = useState(true);
  const [allowImmersive, setAllowImmersive] = useState(true);
  const [previewEffect, setPreviewEffect] = useState<EffectType>('none');
  const [isPreviewing, setIsPreviewing] = useState(false);

  const engine = getAudioEffectsEngine();

  const addTag = () => {
    if (tagInput.trim() && tags.length < 5) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handlePreviewEffect = (effect: EffectType) => {
    setPreviewEffect(effect);
    if (isPreviewing) {
      engine.stop();
    }
    setIsPreviewing(true);
    engine.applyEffect(effect);
    engine.play();
    setTimeout(() => {
      engine.stop();
      setIsPreviewing(false);
    }, 2500);
  };

  return (
    <div className="min-h-screen pb-24 pt-4 px-4 space-y-5 pointillist-bg">
      <h1 className="font-serif text-xl font-bold gold-gradient">Crear Audio</h1>

      {/* Record / Upload */}
      <div className="flex gap-3">
        <button
          onClick={() => { setIsRecording(!isRecording); if (!isRecording) setTimeout(() => { setIsRecording(false); setHasAudio(true); }, 2000); }}
          className={`flex-1 h-32 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${
            isRecording ? 'bg-destructive/10 border-2 border-destructive' : 'card-luminous'
          }`}
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isRecording ? 'bg-destructive/80 animate-pulse-glow' : ''}`}
            style={!isRecording ? { background: 'linear-gradient(135deg, hsl(38 80% 55% / 0.2), hsl(340 60% 70% / 0.2))' } : undefined}
          >
            <Mic className={`w-6 h-6 ${isRecording ? 'text-primary-foreground' : 'text-primary'}`} />
          </div>
          <span className="text-xs font-medium">{isRecording ? 'Grabando...' : hasAudio ? 'Grabar de nuevo' : 'Grabar audio'}</span>
        </button>

        <button
          onClick={() => setHasAudio(true)}
          className="flex-1 h-32 rounded-2xl card-luminous flex flex-col items-center justify-center gap-2 hover:shadow-md transition-all"
        >
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, hsl(200 70% 70% / 0.2), hsl(270 50% 65% / 0.2))' }}>
            <Upload className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs font-medium">Subir archivo</span>
        </button>
      </div>

      {hasAudio && (
        <div className="p-3 rounded-xl glass-border flex items-center gap-3"
          style={{ background: 'linear-gradient(135deg, hsl(38 80% 55% / 0.08), hsl(340 60% 70% / 0.06))' }}>
          <div className="flex gap-[2px] items-end h-6">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="w-[2px] rounded-full" style={{
                height: `${8 + Math.random() * 16}px`,
                background: `hsl(${38 + i * 12} 70% 60%)`,
              }} />
            ))}
          </div>
          <span className="text-xs text-primary ml-auto font-medium">0:32</span>
        </div>
      )}

      {/* Title */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Título</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Reflexión sobre el amor de Dios"
          className="w-full h-11 px-3 rounded-xl bg-card/80 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Descripción</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe tu audio..."
          rows={3}
          className="w-full px-3 py-2 rounded-xl bg-card/80 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none shadow-sm"
        />
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Tags</label>
        <div className="flex gap-2">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTag()}
            placeholder="Ej: Fe, Salmos..."
            className="flex-1 h-10 px-3 rounded-xl bg-card/80 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
          />
          <button onClick={addTag} className="px-4 h-10 rounded-xl text-primary-foreground text-sm font-medium shadow-sm"
            style={{ background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%))' }}>+</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <span key={tag} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/15 gold-text font-medium">
              #{tag}
              <button onClick={() => setTags(tags.filter(t => t !== tag))}><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      </div>

      {/* Visual effect */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Efecto visual</label>
        <div className="flex gap-2">
          {visualEffects.map(ef => (
            <button
              key={ef.id}
              onClick={() => setSelectedEffect(ef.id)}
              className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                selectedEffect === ef.id ? 'ring-1 ring-primary magic-glow' : 'bg-card/60'
              }`}
              style={selectedEffect === ef.id ? { background: 'linear-gradient(135deg, hsl(38 80% 55% / 0.15), hsl(270 50% 65% / 0.1))' } : undefined}
            >
              <span className="text-xl">{ef.emoji}</span>
              <span className="text-[9px] font-medium">{ef.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Immersive Effects Preview (Creator) */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <label className="text-xs font-medium text-foreground">Previsualizar efectos inmersivos</label>
        </div>
        <p className="text-[10px] text-muted-foreground">Escucha cómo sonaría tu audio con cada efecto.</p>

        {isPreviewing && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/10 border border-accent/20">
            <Volume2 className="w-4 h-4 text-accent animate-pulse-glow" />
            <span className="text-[10px] text-accent font-medium">
              {EFFECTS_LIST.find(e => e.id === previewEffect)?.label}...
            </span>
            <div className="flex gap-[2px] ml-auto">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[3px] rounded-full bg-accent animate-wave"
                  style={{ height: `${6 + Math.random() * 8}px`, animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-1.5">
          {EFFECTS_LIST.map(effect => (
            <button
              key={effect.id}
              onClick={() => handlePreviewEffect(effect.id)}
              className={`py-2.5 px-1 rounded-xl flex flex-col items-center gap-1 transition-all ${
                previewEffect === effect.id && isPreviewing
                  ? 'ring-1 ring-accent magic-glow'
                  : 'bg-card/60 hover:bg-card/80'
              }`}
              style={previewEffect === effect.id && isPreviewing ? {
                background: 'linear-gradient(135deg, hsl(270 50% 65% / 0.12), hsl(38 80% 55% / 0.08))'
              } : undefined}
            >
              <span className="text-base">{effect.emoji}</span>
              <span className="text-[8px] font-medium text-center leading-tight">{effect.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 rounded-xl card-luminous">
          <div>
            <p className="text-xs font-medium">Permitir cambio de voz</p>
            <p className="text-[10px] text-muted-foreground">Los oyentes pueden elegir otra voz IA</p>
          </div>
          <button
            onClick={() => setAllowVoiceChange(!allowVoiceChange)}
            className={`w-10 h-6 rounded-full transition-colors relative ${allowVoiceChange ? 'bg-primary' : 'bg-secondary'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-primary-foreground absolute top-1 transition-all ${allowVoiceChange ? 'left-5' : 'left-1'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl card-luminous">
          <div>
            <p className="text-xs font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              Permitir efectos inmersivos
            </p>
            <p className="text-[10px] text-muted-foreground">Los oyentes pueden aplicar efectos de audio</p>
          </div>
          <button
            onClick={() => setAllowImmersive(!allowImmersive)}
            className={`w-10 h-6 rounded-full transition-colors relative ${allowImmersive ? 'bg-accent' : 'bg-secondary'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-primary-foreground absolute top-1 transition-all ${allowImmersive ? 'left-5' : 'left-1'}`} />
          </button>
        </div>
      </div>

      {/* AI suggest */}
      <button className="w-full h-11 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all hover:shadow-md card-luminous text-accent">
        <Wand2 className="w-4 h-4" /> Sugerir efecto y tags con IA
      </button>

      {/* Publish */}
      <button className="w-full h-12 rounded-xl text-primary-foreground font-semibold text-sm gold-glow transition-transform active:scale-[0.98]"
        style={{ background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%), hsl(270 50% 65%))' }}>
        Publicar Audio
      </button>
    </div>
  );
};

export default CreatePage;
