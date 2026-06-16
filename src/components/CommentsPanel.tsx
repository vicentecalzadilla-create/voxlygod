import { useEffect, useRef, useState } from 'react';
import { Send, Trash2, Loader2 } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CommentRow {
  id: string;
  user_id: string;
  author_name: string;
  author_avatar: string | null;
  body: string;
  created_at: string | null;
}

interface Props {
  audioId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCountChange?: (delta: number) => void;
}

const timeAgo = (iso: string | null) => {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'ahora';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} d`;
};

const CommentsPanel = ({ audioId, open, onOpenChange, onCountChange }: Props) => {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from('audio_comments')
        .select('id,user_id,author_name,author_avatar,body,created_at')
        .eq('audio_id', audioId)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      setUserId(user?.id ?? null);
      setComments((data as CommentRow[]) || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, audioId]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    if (!userId) {
      toast({ description: 'Inicia sesión para comentar', duration: 2500 });
      return;
    }
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    const meta = (user?.user_metadata || {}) as Record<string, unknown>;
    const author_name = (meta.full_name as string) || (meta.name as string) || user?.email?.split('@')[0] || 'Usuario de Voxly';
    const { data, error } = await supabase
      .from('audio_comments')
      .insert({ audio_id: audioId, user_id: userId, author_name, author_avatar: '🙏', body })
      .select('id,user_id,author_name,author_avatar,body,created_at')
      .single();
    setSending(false);
    if (error || !data) {
      toast({ description: 'No se pudo publicar el comentario. Intenta de nuevo.', duration: 2500 });
      return;
    }
    setComments(prev => [data as CommentRow, ...prev]);
    setDraft('');
    onCountChange?.(1);
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    const prev = comments;
    setComments(list => list.filter(c => c.id !== id));
    const { error } = await supabase.from('audio_comments').delete().eq('id', id);
    if (error) {
      setComments(prev);
      toast({ description: 'No se pudo eliminar el comentario.', duration: 2500 });
      return;
    }
    onCountChange?.(-1);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-base font-serif">
            Comentarios {comments.length > 0 && <span className="text-muted-foreground font-normal">· {comments.length}</span>}
          </DrawerTitle>
        </DrawerHeader>

        <div ref={listRef} className="flex-1 overflow-y-auto px-4 space-y-3 min-h-[120px]">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : comments.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">Sé el primero en comentar 🙏</p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex gap-2.5 items-start">
                <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-gold/30 to-rose/30 flex items-center justify-center text-base">
                  {c.author_avatar || '🙏'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold truncate">{c.author_name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-xs text-foreground/90 break-words whitespace-pre-wrap">{c.body}</p>
                </div>
                {c.user_id === userId && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="w-7 h-7 shrink-0 rounded-full hover:bg-destructive/10 flex items-center justify-center"
                    aria-label="Eliminar comentario"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-4 pt-3 flex items-end gap-2 border-t border-border/50">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Escribe un comentario…"
            rows={1}
            maxLength={500}
            className="flex-1 resize-none max-h-24 px-3 py-2 rounded-xl bg-card/80 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-primary-foreground disabled:opacity-40 transition-opacity"
            style={{ background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%))' }}
            aria-label="Enviar comentario"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default CommentsPanel;
