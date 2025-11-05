-- Create storage bucket for SOS recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('sos-recordings', 'sos-recordings', false);

-- Allow users to upload their own recordings
CREATE POLICY "Users can upload their own recordings"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'sos-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own recordings
CREATE POLICY "Users can view their own recordings"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'sos-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own recordings
CREATE POLICY "Users can delete their own recordings"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'sos-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);