-- Dati per la ricerca (Capitolo 3 della tesi): missione scelta all'inizio,
-- data e ora di ogni tappa completata e tempo trascorso nell'app.

-- 1. Missione scelta dopo la registrazione
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS starting_mission text;

-- 2. Una riga per ogni tappa completata, con data e ora
CREATE TABLE IF NOT EXISTS public.poi_visits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  poi_id INTEGER NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, poi_id)
);
GRANT SELECT, INSERT ON public.poi_visits TO authenticated;
GRANT ALL ON public.poi_visits TO service_role;
ALTER TABLE public.poi_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own visits" ON public.poi_visits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own visits" ON public.poi_visits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Tappe già completate prima di questa versione: l'ora esatta non è nota,
-- si usa l'ultimo aggiornamento del progresso.
INSERT INTO public.poi_visits (user_id, poi_id, completed_at)
SELECT up.user_id, v::integer, up.updated_at
FROM public.user_progress up, unnest(up.visited_poi_ids) AS v
WHERE v ~ '^[0-9]+$'
ON CONFLICT DO NOTHING;

-- 3. Sessioni d'uso: una riga ogni volta che l'app viene aperta (o torna in primo piano);
--    last_seen_at viene aggiornato ogni minuto finché l'app resta aperta.
CREATE TABLE IF NOT EXISTS public.app_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_sessions_user_idx ON public.app_sessions (user_id);
GRANT SELECT, INSERT, UPDATE ON public.app_sessions TO authenticated;
GRANT ALL ON public.app_sessions TO service_role;
ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own sessions" ON public.app_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sessions" ON public.app_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sessions" ON public.app_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Viste di riepilogo per il ricercatore (non leggibili dagli utenti dell'app)
CREATE OR REPLACE VIEW public.riepilogo_utenti
WITH (security_invoker = true) AS
SELECT
  p.email,
  p.nickname,
  p.created_at AS registrato_il,
  p.starting_mission AS missione_iniziale,
  COALESCE(up.xp, 0) AS punti,
  COALESCE(cardinality(up.visited_poi_ids), 0) AS tappe_completate,
  COALESCE(s.sessioni, 0) AS sessioni,
  COALESCE(s.minuti_totali, 0) AS minuti_nell_app,
  s.ultimo_accesso
FROM public.profiles p
LEFT JOIN public.user_progress up ON up.user_id = p.id
LEFT JOIN (
  SELECT
    user_id,
    count(*) AS sessioni,
    round(sum(extract(epoch FROM (last_seen_at - started_at))) / 60.0, 1) AS minuti_totali,
    max(last_seen_at) AS ultimo_accesso
  FROM public.app_sessions
  GROUP BY user_id
) s ON s.user_id = p.id;

CREATE OR REPLACE VIEW public.tappe_visitate
WITH (security_invoker = true) AS
SELECT
  p.email,
  p.nickname,
  v.poi_id,
  CASE v.poi_id
    WHEN 1 THEN 'Specola'
    WHEN 2 THEN 'Giardini della Rotonda'
    WHEN 3 THEN 'Parco Treves'
    WHEN 4 THEN 'Porta Portello'
    WHEN 5 THEN 'Parco Milcovich'
  END AS tappa,
  v.completed_at AS completata_il
FROM public.poi_visits v
JOIN public.profiles p ON p.id = v.user_id;

REVOKE ALL ON public.riepilogo_utenti FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.tappe_visitate FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.riepilogo_utenti TO service_role;
GRANT SELECT ON public.tappe_visitate TO service_role;
