CREATE TYPE public.contato_tipo AS ENUM ('setor', 'agencia');
CREATE TYPE public.contato_prioridade AS ENUM ('Urgente', 'Alta', 'Normal');

CREATE TABLE public.contatos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  responsavel TEXT,
  setor TEXT,
  cidade TEXT,
  telefone TEXT,
  whatsapp TEXT,
  horario TEXT,
  prioridade public.contato_prioridade NOT NULL DEFAULT 'Normal',
  tipo public.contato_tipo NOT NULL DEFAULT 'setor',
  observacoes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ativos veem contatos" ON public.contatos
  FOR SELECT TO authenticated USING (public.is_active(auth.uid()));

CREATE POLICY "Equipe insere contatos" ON public.contatos
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'operacional'::app_role) OR
    public.has_role(auth.uid(), 'vendedor'::app_role)
  );

CREATE POLICY "Equipe atualiza contatos" ON public.contatos
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'operacional'::app_role) OR
    public.has_role(auth.uid(), 'vendedor'::app_role)
  );

CREATE POLICY "Admin apaga contatos" ON public.contatos
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_contatos_updated
BEFORE UPDATE ON public.contatos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();