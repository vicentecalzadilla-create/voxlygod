import { useState } from 'react';
import { Mic, Upload, Wand2, X } from 'lucide-react';

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

  const addTag = () => {
    if (tagInput.trim() && tags.length < 5) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  return (
    <div className="min-h-screen pb-24 pt-4 px-4 space-y-5">
      <h1 className="font-serif text-xl font-bold gold-gradient">Crear Audio</h1>

      {/* Record / Upload */}
      <div className="flex gap-3">
        <button
          onClick={() => { setIsRecording(!isRecording); if (!isRecording) setTimeout(() => { setIsRecording(false); setHasAudio(true); }, 2000); }}
          className={`flex-1 h-32 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${
            isRecording ? 'bg-destructive/20 border-2 border-destructive' : 'bg-card glass-border'
          }`}
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isRecording ? 'bg-destructive animate-pulse-glow' : 'bg-primary/20'}`}>
            <Mic className={`w-6 h-6 ${isRecording ? 'text-foreground' : 'text-primary'}`} />
          </div>
          <span className="text-xs font-medium">{isRecording ? 'Grabando...' : hasAudio ? 'Grabar de nuevo' : 'Grabar audio'}</span>
        </button>

        <button
          onClick={() => setHasAudio(true)}
          className="flex-1 h-32 rounded-2xl bg-card glass-border flex flex-col items-center justify-center gap-2 hover:bg-secondary/50 transition-colors"
        >
          <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center">
            <Upload className="w-6 h-6 text-accent-foreground" />
          </div>
          <span className="text-xs font-medium">Subir archivo</span>
        </button>
      </div>

      {hasAudio && (
        <div className="p-3 rounded-xl bg-primary/10 glass-border flex items-center gap-3">
          <div className="flex gap-[2px] items-end h-6">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="w-[2px] rounded-full bg-primary" style={{ height: `${8 + Math.random() * 16}px` }} />
            ))}
          </div>
          <span className="text-xs text-primary ml-auto">0:32</span>
        </div>
      )}

      {/* Title */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Título</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Reflexión sobre el amor de Dios"
          className="w-full h-11 px-3 rounded-xl bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
          className="w-full px-3 py-2 rounded-xl bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
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
            className="flex-1 h-10 px-3 rounded-xl bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button onClick={addTag} className="px-4 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium">+</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <span key={tag} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/10 gold-text">
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
                selectedEffect === ef.id ? 'bg-primary/20 ring-1 ring-primary' : 'bg-secondary'
              }`}
            >
              <span className="text-xl">{ef.emoji}</span>
              <span className="text-[9px]">{ef.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Options */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-card glass-border">
        <div>
          <p className="text-xs font-medium">Permitir cambio de voz</p>
          <p className="text-[10px] text-muted-foreground">Los oyentes pueden elegir otra voz IA</p>
        </div>
        <button
          onClick={() => setAllowVoiceChange(!allowVoiceChange)}
          className={`w-10 h-6 rounded-full transition-colors relative ${allowVoiceChange ? 'bg-primary' : 'bg-secondary'}`}
        >
          <div className={`w-4 h-4 rounded-full bg-foreground absolute top-1 transition-all ${allowVoiceChange ? 'left-5' : 'left-1'}`} />
        </button>
      </div>

      {/* AI suggest */}
      <button className="w-full h-11 rounded-xl bg-accent/20 text-accent-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-accent/30 transition-colors">
        <Wand2 className="w-4 h-4" /> Sugerir efecto y tags con IA
      </button>

      {/* Publish */}
      <button className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm gold-glow transition-transform active:scale-[0.98]">
        Publicar Audio
      </button>
    </div>
  );
};

export default CreatePage;
