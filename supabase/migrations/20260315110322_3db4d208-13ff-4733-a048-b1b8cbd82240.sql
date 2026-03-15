
-- Create share_tokens table
CREATE TABLE public.share_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  document_id text NOT NULL,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.share_tokens ENABLE ROW LEVEL SECURITY;

-- Owner can manage their own share tokens
CREATE POLICY "Owner manage share_tokens" ON public.share_tokens
  FOR ALL USING (user_id = auth.uid());

-- Public can read share tokens by token value (for shared links)
CREATE POLICY "Public read share_tokens by token" ON public.share_tokens
  FOR SELECT TO anon, authenticated
  USING (true);

-- Create import_logs table
CREATE TABLE public.import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  import_type text NOT NULL,
  file_name text,
  total_rows integer,
  successful_rows integer,
  failed_rows integer,
  error_details jsonb,
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manage import_logs" ON public.import_logs
  FOR ALL USING (user_id = auth.uid());
