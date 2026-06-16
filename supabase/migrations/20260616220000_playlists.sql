-- Playlists del usuario y sus audios. Privadas de cada usuario en v1.

CREATE TABLE public.playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  cover_emoji TEXT DEFAULT '✝️',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.playlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  audio_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (playlist_id, audio_id)
);

CREATE INDEX idx_playlists_user ON public.playlists (user_id, created_at DESC);
CREATE INDEX idx_playlist_items_playlist ON public.playlist_items (playlist_id, created_at);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlists TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.playlist_items TO authenticated;
GRANT ALL ON public.playlists TO service_role;
GRANT ALL ON public.playlist_items TO service_role;

-- Playlists: cada usuario gestiona solo las suyas
CREATE POLICY "Users can view own playlists" ON public.playlists
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create playlists" ON public.playlists
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own playlists" ON public.playlists
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own playlists" ON public.playlists
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Items: gestionables si el usuario es dueño de la playlist contenedora
CREATE POLICY "Users can view items of own playlists" ON public.playlist_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Users can add items to own playlists" ON public.playlist_items
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Users can remove items from own playlists" ON public.playlist_items
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid())
  );
