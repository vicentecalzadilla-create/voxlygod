
-- Drop existing permissive insert/update policies on audios bucket and recreate with extension allowlist
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname IN (
        'Users can upload audios to own folder',
        'Users can upload audios',
        'Authenticated can upload audios',
        'Users can update their audios',
        'Users can update audios'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users upload audio files only to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audios'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND lower(name) ~ '\.(mp3|webm|ogg|wav|m4a|aac)$'
);

CREATE POLICY "Users update audio files only in own folder"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'audios'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'audios'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND lower(name) ~ '\.(mp3|webm|ogg|wav|m4a|aac)$'
);

CREATE POLICY "Users delete own audio files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'audios'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
