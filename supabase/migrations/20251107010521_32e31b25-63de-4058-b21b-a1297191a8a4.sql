-- Create table for safety check-ins
CREATE TABLE public.safety_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  check_in_interval INTEGER NOT NULL DEFAULT 600,
  last_update_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  marked_safe_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.safety_checkins ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own check-ins"
ON public.safety_checkins
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own check-ins"
ON public.safety_checkins
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own check-ins"
ON public.safety_checkins
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);