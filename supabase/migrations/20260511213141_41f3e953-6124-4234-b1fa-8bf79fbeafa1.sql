DROP POLICY IF EXISTS "Authenticated users can read audios objects" ON storage.objects;
CREATE POLICY "Authenticated users can read audios objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'audios');