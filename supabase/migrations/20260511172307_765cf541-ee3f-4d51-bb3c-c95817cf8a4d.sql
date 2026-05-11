
-- Make user_id NOT NULL so RLS policies work reliably
ALTER TABLE public.audios ALTER COLUMN user_id SET NOT NULL;

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view audios" ON public.audios;

-- Drop the existing INSERT policy to recreate it cleanly
DROP POLICY IF EXISTS "Authenticated users can create audios" ON public.audios;

-- SELECT: authenticated users can only read their own audios
CREATE POLICY "Users can view their own audios"
ON public.audios
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT: authenticated users can only create audios assigned to themselves
CREATE POLICY "Users can create their own audios"
ON public.audios
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: authenticated users can only update their own audios
CREATE POLICY "Users can update their own audios"
ON public.audios
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- DELETE: authenticated users can only delete their own audios
CREATE POLICY "Users can delete their own audios"
ON public.audios
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
