
-- Replace restrictive SELECT with public read on audios
DROP POLICY IF EXISTS "Users can view their own audios" ON public.audios;

CREATE POLICY "Anyone can view audios"
ON public.audios FOR SELECT
USING (true);

-- Storage policies for the 'audios' bucket
DROP POLICY IF EXISTS "Public can read audios bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload to audios bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files in audios bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files in audios bucket" ON storage.objects;

CREATE POLICY "Public can read audios bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'audios');

CREATE POLICY "Authenticated can upload to audios bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audios');

CREATE POLICY "Users can update own files in audios bucket"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'audios' AND owner = auth.uid())
WITH CHECK (bucket_id = 'audios' AND owner = auth.uid());

CREATE POLICY "Users can delete own files in audios bucket"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'audios' AND owner = auth.uid());
