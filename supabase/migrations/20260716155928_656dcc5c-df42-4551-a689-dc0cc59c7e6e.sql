CREATE UNIQUE INDEX IF NOT EXISTS profiles_nickname_unique_idx
  ON public.profiles (lower(nickname))
  WHERE nickname IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_nickname_available(_nickname text, _exclude_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(nickname) = lower(trim(_nickname))
      AND (_exclude_user_id IS NULL OR id <> _exclude_user_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_nickname_available(text, uuid) TO anon, authenticated;