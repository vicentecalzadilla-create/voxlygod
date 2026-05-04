
-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('audios', 'audios', true);

-- Create audios table
CREATE TABLE public.audios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  creator_name TEXT NOT NULL,
  creator_avatar TEXT DEFAULT '🎵',
  duration INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  verse TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  visual_effect TEXT DEFAULT 'light-rays',
  audio_url TEXT NOT NULL,
  allow_immersive_effects BOOLEAN DEFAULT true,
  allow_voice_change BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audios ENABLE ROW LEVEL SECURITY;

-- Public read policy (anyone can listen)
CREATE POLICY "Anyone can view audios" ON public.audios FOR SELECT USING (true);

-- Authenticated users can insert
CREATE POLICY "Authenticated users can create audios" ON public.audios FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Storage policies: anyone can read, authenticated can upload
CREATE POLICY "Anyone can read audio files" ON storage.objects FOR SELECT USING (bucket_id = 'audios');
CREATE POLICY "Authenticated users can upload audio files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'audios');
