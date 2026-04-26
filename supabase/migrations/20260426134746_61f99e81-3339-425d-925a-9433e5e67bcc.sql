
DO $$ BEGIN
  CREATE TYPE public.sentido_rota AS ENUM ('descida', 'subida', 'nenhum');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.embarques_dia
  ADD COLUMN IF NOT EXISTS sentido public.sentido_rota NOT NULL DEFAULT 'nenhum';

CREATE INDEX IF NOT EXISTS idx_embarques_dia_sentido ON public.embarques_dia(sentido);
