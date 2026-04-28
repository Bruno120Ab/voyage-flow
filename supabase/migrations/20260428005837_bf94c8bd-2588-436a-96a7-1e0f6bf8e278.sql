CREATE TYPE public.entrega_tipo AS ENUM ('enviada', 'recebida');
CREATE TYPE public.entrega_status AS ENUM ('pendente', 'em_transito', 'chegando', 'recebida', 'entregue', 'cancelada');

CREATE TABLE public.entregas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL,
  cliente TEXT NOT NULL,
  telefone TEXT,
  origem TEXT,
  destino TEXT,
  tipo public.entrega_tipo NOT NULL DEFAULT 'enviada',
  status public.entrega_status NOT NULL DEFAULT 'pendente',
  valor NUMERIC NOT NULL DEFAULT 0,
  comissao NUMERIC NOT NULL DEFAULT 0,
  responsavel TEXT,
  previsao TEXT,
  observacoes TEXT,
  data_operacao DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ativos veem entregas" ON public.entregas FOR SELECT TO authenticated USING (is_active(auth.uid()));
CREATE POLICY "Equipe insere entregas" ON public.entregas FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operacional'::app_role) OR has_role(auth.uid(),'vendedor'::app_role) OR has_role(auth.uid(),'financeiro'::app_role));
CREATE POLICY "Equipe atualiza entregas" ON public.entregas FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operacional'::app_role) OR has_role(auth.uid(),'vendedor'::app_role) OR has_role(auth.uid(),'financeiro'::app_role));
CREATE POLICY "Admin/financeiro apaga entregas" ON public.entregas FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'financeiro'::app_role));

CREATE OR REPLACE FUNCTION public.calc_entrega_comissao()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.tipo = 'enviada' THEN
    NEW.comissao = ROUND(COALESCE(NEW.valor,0) * 0.10, 2);
  ELSE
    NEW.comissao = 5;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_entregas_comissao BEFORE INSERT OR UPDATE OF valor, tipo ON public.entregas
FOR EACH ROW EXECUTE FUNCTION public.calc_entrega_comissao();

CREATE TRIGGER trg_entregas_updated BEFORE UPDATE ON public.entregas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_entregas_data ON public.entregas(data_operacao DESC);
CREATE INDEX idx_entregas_tipo ON public.entregas(tipo);