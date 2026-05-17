import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Save, Scissors, Sparkles, X, Type } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import AudioEditTools, { type AudioEditToolsHandle } from '@/components/AudioEditTools';
import TextToAudioPanel from '@/components/TextToAudioPanel';
import { VISUAL_EFFECTS } from '@/audio/audioEditUtils';
import type { TranscriptSegment } from '@/audio/ttsVoices';

interface AudioRow {
  id: string;
  title: string;
  audio_url: string;
  description?: string | null;
  tags?: string[] | null;
  visual_effect?: string | null;
  allow_immersive_effects?: boolean | null;
  allow_voice_change?: boolean | null;
  category?: string | null;
  source_text?: string | null;
  tts_voice?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audio: AudioRow;
  onSaved?: () => void;
}

const AudioEditorDialog = ({ open, onOpenChange, audio, onSaved }: Props) => {
  const [title, setTitle] = useState(audio.title);
  const [description, setDescription] = useState(audio.description || '');
  const [tags, setTags] = useState<string[]>(audio.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [selectedEffect, setSelectedEffect] = useState(audio.visual_effect || 'light-rays');
  const [allowVoiceChange, setAllowVoiceChange] = useState(audio.allow_voice_change ?? true);
  const [allowImmersive, setAllowImmersive] = useState(audio.allow_immersive_effects ?? true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState<'audio' | 'text'>('audio');
  const [ttsData, setTtsData] = useState<{ url: string; duration: number; transcript: TranscriptSegment[]; source: string; voice: string } | null>(null);
  const editorRef = useRef<AudioEditToolsHandle>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(audio.title);
    setDescription(audio.description || '');
    setTags(audio.tags || []);
    setSelectedEffect(audio.visual_effect || 'light-rays');
    setAllowVoiceChange(audio.allow_voice_change ?? true);
    setAllowImmersive(audio.allow_immersive_effects ?? true);
  }, [open, audio]);

  const addTag = () => {
    const v = tagInput.trim().slice(0, 50);
    if (v && tags.length < 5) { setTags([...tags, v]); setTagInput(''); }
  };

  const save = async (asNewVersion: boolean) => {
    if (!title.trim()) {
      toast({ title: 'Falta el título', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast({ title: 'Inicia sesión', variant: 'destructive' }); return; }

      let newUrl = audio.audio_url;
      let newDuration: number | undefined;
      let newTranscript: TranscriptSegment[] | null = null;
      let newSourceText: string | null = null;
      let newVoice: string | null = null;

      if (editMode === 'text' && ttsData) {
        newUrl = ttsData.url;
        newDuration = ttsData.duration;
        newTranscript = ttsData.transcript;
        newSourceText = ttsData.source;
        newVoice = ttsData.voice;
      } else {
        const edited = await editorRef.current?.buildEdited();
        if (edited && edited.edited) {
          const fileName = `${user.id}/edited-${Date.now()}.wav`;
          const { error: upErr } = await supabase.storage.from('audios').upload(fileName, edited.blob, {
            contentType: 'audio/wav', upsert: false,
          });
          if (upErr) throw upErr;
          newUrl = supabase.storage.from('audios').getPublicUrl(fileName).data.publicUrl;
          newDuration = Math.round(edited.duration);
        } else if (edited) {
          newDuration = Math.round(edited.duration);
        }
      }

      const payload: any = {
        title: title.trim(),
        description: description.trim() || null,
        tags,
        visual_effect: selectedEffect,
        allow_immersive_effects: allowImmersive,
        allow_voice_change: allowVoiceChange,
      };
      if (newUrl !== audio.audio_url) payload.audio_url = newUrl;
      if (newDuration !== undefined) payload.duration = newDuration;
      if (newTranscript) { payload.transcript = newTranscript; payload.source_text = newSourceText; payload.tts_voice = newVoice; payload.translations = {}; }

      if (asNewVersion) {
        const { data: src } = await supabase.from('audios').select('*').eq('id', audio.id).maybeSingle();
        if (!src) throw new Error('Original no encontrado');
        const { error: insErr } = await supabase.from('audios').insert({
          ...payload,
          title: payload.title.endsWith('(v2)') ? payload.title : `${payload.title} (v2)`,
          creator_name: src.creator_name,
          creator_avatar: src.creator_avatar,
          category: src.category,
          audio_url: newUrl,
          user_id: user.id,
          verse: src.verse,
        });
        if (insErr) throw insErr;
        toast({ title: '✅ Nueva versión guardada' });
      } else {
        const { error: updErr } = await supabase.from('audios').update(payload).eq('id', audio.id);
        if (updErr) throw updErr;
        toast({ title: '✅ Audio actualizado' });
      }
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'No se pudo guardar', description: e?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif gold-text flex items-center gap-2">
            <Scissors className="w-4 h-4" /> Editar audio
          </DialogTitle>
          <DialogDescription className="text-xs">Modifica el audio y sus metadatos.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Edit mode tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-card/60">
            {([
              { id: 'audio', label: 'Editar audio', icon: <Scissors className="w-3 h-3" /> },
              { id: 'text', label: 'Editar texto', icon: <Type className="w-3 h-3" /> },
            ] as const).map(t => (
              <button key={t.id} type="button" onClick={() => setEditMode(t.id)}
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  editMode === t.id ? 'text-primary-foreground gold-glow' : 'text-foreground/70'
                }`}
                style={editMode === t.id ? { background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%))' } : undefined}
              >{t.icon}{t.label}</button>
            ))}
          </div>

          {editMode === 'audio' ? (
            <AudioEditTools ref={editorRef} source={audio.audio_url} />
          ) : (
            <TextToAudioPanel
              initialText={audio.source_text || ''}
              initialVoice={audio.tts_voice || 'pastor-sereno'}
              onGenerated={(r) => setTtsData({ url: r.audio_url, duration: r.duration, transcript: r.transcript, source: r.source_text, voice: r.voice })}
            />
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Título</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={200}
              className="w-full h-10 px-3 rounded-xl bg-card/80 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Descripción</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={2000}
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-card/80 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none shadow-sm"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tags</label>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                maxLength={50}
                placeholder="Ej: Fe, Salmos..."
                className="flex-1 h-9 px-3 rounded-xl bg-card/80 text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
              />
              <button onClick={addTag} className="px-3 h-9 rounded-xl text-primary-foreground text-xs font-medium shadow-sm"
                style={{ background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%))' }}>+</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-primary/15 gold-text font-medium">
                  #{tag}
                  <button onClick={() => setTags(tags.filter(t => t !== tag))}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>

          {/* Visual effect */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Efecto visual</label>
            <div className="flex gap-1.5">
              {VISUAL_EFFECTS.map(ef => (
                <button key={ef.id} onClick={() => setSelectedEffect(ef.id)}
                  className={`flex-1 py-2 rounded-lg flex flex-col items-center gap-0.5 transition-all ${
                    selectedEffect === ef.id ? 'ring-1 ring-primary magic-glow' : 'bg-card/60'
                  }`}
                  style={selectedEffect === ef.id ? { background: 'linear-gradient(135deg, hsl(38 80% 55% / 0.15), hsl(270 50% 65% / 0.1))' } : undefined}
                >
                  <span className="text-base">{ef.emoji}</span>
                  <span className="text-[8px] font-medium">{ef.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-xl card-luminous">
              <p className="text-xs font-medium">Permitir cambio de voz</p>
              <button onClick={() => setAllowVoiceChange(v => !v)}
                className={`w-10 h-6 rounded-full transition-colors relative ${allowVoiceChange ? 'bg-primary' : 'bg-secondary'}`}>
                <div className={`w-4 h-4 rounded-full bg-primary-foreground absolute top-1 transition-all ${allowVoiceChange ? 'left-5' : 'left-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl card-luminous">
              <p className="text-xs font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" /> Permitir efectos inmersivos
              </p>
              <button onClick={() => setAllowImmersive(v => !v)}
                className={`w-10 h-6 rounded-full transition-colors relative ${allowImmersive ? 'bg-accent' : 'bg-secondary'}`}>
                <div className={`w-4 h-4 rounded-full bg-primary-foreground absolute top-1 transition-all ${allowImmersive ? 'left-5' : 'left-1'}`} />
              </button>
            </div>
          </div>

          {/* Save */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button onClick={() => save(false)} disabled={saving}
              className="h-10 rounded-xl text-primary-foreground text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%))' }}>
              <Save className="w-3.5 h-3.5" /> {saving ? 'Guardando…' : 'Reemplazar'}
            </button>
            <button onClick={() => save(true)} disabled={saving}
              className="h-10 rounded-xl bg-secondary/80 text-secondary-foreground text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50">
              <Save className="w-3.5 h-3.5" /> Nueva versión
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AudioEditorDialog;
