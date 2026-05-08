CREATE TYPE public.msg_direcao AS ENUM ('entrada','saida');

CREATE TABLE public.mensagens_whatsapp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  telefone TEXT NOT NULL,
  direcao public.msg_direcao NOT NULL,
  texto TEXT NOT NULL DEFAULT '',
  external_id TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mensagens_telefone ON public.mensagens_whatsapp(telefone);
CREATE INDEX idx_mensagens_lead ON public.mensagens_whatsapp(lead_id);
CREATE INDEX idx_mensagens_created ON public.mensagens_whatsapp(created_at DESC);
CREATE UNIQUE INDEX idx_mensagens_external ON public.mensagens_whatsapp(external_id) WHERE external_id IS NOT NULL;

ALTER TABLE public.mensagens_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ativos veem mensagens" ON public.mensagens_whatsapp
  FOR SELECT TO authenticated USING (is_active(auth.uid()));

CREATE POLICY "Equipe insere mensagens" ON public.mensagens_whatsapp
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'vendedor') OR has_role(auth.uid(),'operacional'));

CREATE POLICY "Admin apaga mensagens" ON public.mensagens_whatsapp
  FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens_whatsapp;