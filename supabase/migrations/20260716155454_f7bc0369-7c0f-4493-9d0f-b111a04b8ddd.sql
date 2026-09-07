ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS avatar_id smallint NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, nickname, avatar_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'nickname',
    COALESCE((NEW.raw_user_meta_data->>'avatar_id')::smallint, 1)
  );
  INSERT INTO public.user_progress (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$function$;