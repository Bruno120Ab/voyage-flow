ALTER TABLE public.embarque_passageiros
  ADD COLUMN IF NOT EXISTS vendido boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS comprovante_enviado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bilhete_impresso boolean NOT NULL DEFAULT false;