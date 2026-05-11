
DROP POLICY IF EXISTS "Authenticated users can update audios" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload audios" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload audios" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can insert audios" ON storage.objects;

CREATE POLICY "Users can upload audios to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'audios'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own audio files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'audios' AND owner = auth.uid())
WITH CHECK (bucket_id = 'audios' AND owner = auth.uid());
